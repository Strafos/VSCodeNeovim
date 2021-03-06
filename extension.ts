'use strict';

/**
 * Extension.ts is a lightweight wrapper around ModeHandler. It converts key
 * events to their string names and passes them on to ModeHandler via
 * handleKeyEvent().
 */

import * as vscode from 'vscode';
import { existsSync } from 'fs';
import * as _ from 'lodash';
import { attach } from 'neovim';
import { NeovimClient } from 'neovim/lib/api/client';
import { TaskQueue } from 'aurelia-task-queue';
import { Position } from './src/common/motion/position';
import { Globals } from './src/globals';
import { AngleBracketNotation } from './src/notation';
import { Configuration } from './src/configuration/configuration';

import { spawn } from 'child_process';
import { NvUtil } from './srcNV/nvUtil';
import { RpcRequest } from './srcNV/rpcHandlers';
import { TextEditor } from './src/textEditor';
import { Screen, IgnoredKeys } from './srcNV/screen';
import { VimSettings } from './srcNV/vimSettings';

interface VSCodeKeybinding {
  key: string;
  command: string;
  when: string;
  vimKey: string;
}

const packagejson: {
  contributes: {
    keybindings: VSCodeKeybinding[];
  };
} = require('../package.json'); // out/../package.json

export namespace Vim {
  export let nv: NeovimClient;
  export let channelId: number;
  export let mode: { mode: string; blocking: boolean } = { mode: 'n', blocking: false };
  export let screen: Screen;
  export let prevState: { bufferTick: number } = {
    bufferTick: -1,
  };
  export let taskQueue = new TaskQueue();
}

export async function activate(context: vscode.ExtensionContext) {
  vscode.commands.executeCommand('setContext', 'vim.active', Globals.active);
  const proc = spawn(
    'nvim',
    [
      // '-u',
      // 'NONE',
      '-N',
      '--embed',
      vscode.window.activeTextEditor ? vscode.window.activeTextEditor!.document.fileName : '',
    ],
    {
      cwd: __dirname,
    }
  );
  proc.on('error', function(err) {
    console.log(err);
    vscode.window.showErrorMessage('Unable to setup neovim instance! Check your path.');
  });
  let nvim: NeovimClient;
  if (existsSync('/tmp/nvim')) {
    nvim = attach({ socket: '/tmp/nvim' });
  } else {
    nvim = attach({ proc: proc });
  }
  Vim.nv = nvim;

  Vim.channelId = (await nvim.requestApi())[0] as number;

  const SIZE = 50;
  nvim.uiAttach(SIZE, SIZE, { ext_cmdline: true });
  Vim.screen = new Screen(SIZE);

  await nvim.command('autocmd!');
  const autocmdMap: { [autocmd: string]: string } = {
    BufWriteCmd: 'writeBuf',
    QuitPre: 'closeBuf',
    BufEnter: 'openBuf',
  };
  for (const autocmd of Object.keys(autocmdMap)) {
    await nvim.command(
      `autocmd ${autocmd} * :call rpcrequest(${Vim.channelId}, "${autocmdMap[
        autocmd
      ]}", expand("<abuf>"), fnamemodify(expand('<afile>'), ':p'))`
    );
  }

  // Overriding commands to handle them on the vscode side.
  // await nvim.command(`nnoremap gd :call rpcrequest(${Vim.channelId},"goToDefinition")<CR>`);

  await NvUtil.setSettings(['noswapfile', 'hidden']);
  nvim.on('notification', (y: any, x: any) => {
    if (vscode.window.activeTextEditor && y === 'redraw') {
      Vim.screen.redraw(x);
    }
  });

  nvim.on('request', async (method: string, args: Array<any>, resp: any) => {
    if (RpcRequest[method] !== undefined) {
      const f = RpcRequest[method];
      f(args, resp);
    } else {
      console.log(`${method} is not defined!`);
    }
  });

  async function handleActiveTextEditorChange() {
    if (vscode.window.activeTextEditor === undefined) {
      return;
    }
    const active_editor_file = vscode.window.activeTextEditor!.document.fileName;
    await nvim.command(`edit ${active_editor_file}`);
    await NvUtil.copyTextFromNeovim();
    await NvUtil.setCursorPos(vscode.window.activeTextEditor!.selection.active);
    await NvUtil.setSettings(await VimSettings.enterFileSettings());
  }

  async function handleTextDocumentChange(e: vscode.TextDocumentChangeEvent) {
    if (e.contentChanges.length === 0) {
      return;
    }
    for (const change of e.contentChanges) {
      const changeBegin = Position.FromVSCodePosition(change.range.start);
      const changeEnd = Position.FromVSCodePosition(change.range.end);
      const curPos = Position.FromVSCodePosition(vscode.window.activeTextEditor!.selection.active);
      const docEnd = new Position(0, 0).getDocumentEnd();
      // This ugly if statement is to differentiate the "real" vscode changes that
      // should be included in dot repeat(like autocomplete, auto-close parens,
      // all regular typing, etc.) from the vscode changes that should not be
      // included (the entire buffer syncing, autoformatting, etc.)
      if (
        Vim.mode.mode === 'i' &&
        ((changeBegin.line === curPos.line &&
          changeBegin.line === changeEnd.line &&
          !(
            changeBegin.line === 0 &&
            changeBegin.character === 0 &&
            change.text[change.text.length - 1] === '\n'
          )) ||
          (change.text === '' && changeEnd.character === 0 && change.rangeLength === 1))
      ) {
        await NvUtil.updateMode();
        if (!Vim.mode.blocking) {
          const nvPos = await NvUtil.getCursorPos();
          if (nvPos.line !== curPos.line) {
            await NvUtil.setCursorPos(curPos);
          } else {
            // Is necessary for parentheses autocompletion but causes issues
            // when non-atomic with fast text. Move this into lua
            // await NvUtil.ctrlGMove(nvPos.character, changeEnd.character);
          }
        }
        await nvim.input('<BS>'.repeat(change.rangeLength));
        await nvim.input(change.text);
      } else {
        // todo: Optimize this to only replace relevant lines. Probably not worth
        // doing until diffs come in from the neovim side though, since that's the
        // real blocking factor.
        // todo(chilli):  Tests if change is a change that replaces the entire text (ie: the copy
        // from neovim buffer to vscode buffer). It's a hack. Won't work if your
        // change (refactor) for example, doesn't modify the length of the file
        const isRealChange = change.text.length !== change.rangeLength;
        if (isRealChange) {
          // todo(chilli): Doesn't work if there was just an undo command (undojoin
          // fails and prevents the following command from executing)
          let atomicCommands = [
            NvUtil.atomCommand("let g:foo = getpos('.')"),
            NvUtil.atomCommand('undojoin'),
            NvUtil.atomBufSetLines(TextEditor.getText().split('\n')),
            ['nvim_get_var', ['foo']],
            NvUtil.atomCommand("call setpos('.', [g:foo[0], g:foo[1], g:foo[2], g:foo[3]])"),
          ];

          const result = await nvim.callAtomic(atomicCommands);
          // console.log(result[0][3][1]);
        }
        break;
      }
    }
    // I'm assuming here that there's nothing that will happen on the vscode
    // side that would alter cursor position if you're not in insert mode.
    // Technically not true, but it seems like a pain to handle, and seems
    // like something that won't be used much. Will re-evaluate at a later
    // date.
  }

  vscode.workspace.onDidCloseTextDocument(async event => {
    const deleted_file = event.fileName;
    let buf_id = await nvim.call('bufnr', [`^${deleted_file}$`]);
    if (buf_id === -1) {
      return;
    }
    await nvim.command(`noautocmd ${buf_id}bw!`);
  });

  vscode.window.onDidChangeActiveTextEditor(handleActiveTextEditorChange, this);

  vscode.window.onDidChangeTextEditorSelection(async e => {
    if (e.kind === vscode.TextEditorSelectionChangeKind.Mouse) {
      if (e.selections[0]) {
        await NvUtil.setSelection(e.selections[0]);
      }
    }
  });

  vscode.workspace.onDidChangeTextDocument(handleTextDocumentChange);

  // tslint:disable-next-line:no-unused-variable
  async function handleSimple(key: string) {
    await nvim.input(key);
  }

  async function handleKeyEventNV(key: string) {
    const prevMode = Vim.mode.mode;
    const prevBlocking = Vim.mode.blocking;
    async function input(k: string) {
      await nvim.input(k === '<' ? '<lt>' : k);
      await NvUtil.updateMode();
      // Optimization that makes movement very smooth. However, occasionally
      // makes it more difficult to debug so it's turned off for now.
      // const curTick = await Vim.nv.buffer.changedtick;
      // if (curTick === Vim.prevState.bufferTick) {
      //   await NvUtil.changeSelectionFromMode(Vim.mode.mode);
      //   return;
      // }
      // Vim.prevState.bufferTick = curTick;
      await NvUtil.copyTextFromNeovim();
      await NvUtil.changeSelectionFromMode(Vim.mode.mode);
    }
    if (prevMode !== 'i') {
      await input(key);
    } else {
      if (key === '<BS>') {
        await vscode.commands.executeCommand('deleteLeft');
      } else if (key.length > 1) {
        await input(key);
      } else {
        await vscode.commands.executeCommand('default:type', { text: key });
      }
    }

    await vscode.commands.executeCommand('setContext', 'vim.mode', Vim.mode.mode);
  }

  overrideCommand(context, 'type', async args => {
    // if (Vim.taskQueue.flushing) {
    //   return;
    // }
    Vim.taskQueue.queueMicroTask(() => {
      handleKeyEventNV(args.text);
    });
  });

  await vscode.commands.executeCommand('setContext', 'vim.active', Globals.active);

  const keysToBind = packagejson.contributes.keybindings;
  const ignoreKeys: IgnoredKeys = vscode.workspace
    .getConfiguration('vim')
    .get('ignoreKeys') as IgnoredKeys;

  for (let key of keysToBind) {
    if (ignoreKeys.all.indexOf(key.vimKey) !== -1) {
      continue;
    }
    vscode.commands.executeCommand('setContext', `vim.use_${key.vimKey}`, true);
    registerCommand(context, key.command, () => {
      Vim.taskQueue.queueMicroTask(() => {
        handleKeyEventNV(`${key.vimKey}`);
      });
    });
  }

  if (vscode.window.activeTextEditor) {
    await handleActiveTextEditorChange();
  }
}

function overrideCommand(
  context: vscode.ExtensionContext,
  command: string,
  callback: (...args: any[]) => any
) {
  let disposable = vscode.commands.registerCommand(command, async args => {
    if (!Globals.active) {
      await vscode.commands.executeCommand('default:' + command, args);
      return;
    }

    if (!vscode.window.activeTextEditor) {
      return;
    }

    if (
      vscode.window.activeTextEditor.document &&
      vscode.window.activeTextEditor.document.uri.toString() === 'debug:input'
    ) {
      await vscode.commands.executeCommand('default:' + command, args);
      return;
    }

    callback(args);
  });
  context.subscriptions.push(disposable);
}

function registerCommand(
  context: vscode.ExtensionContext,
  command: string,
  callback: (...args: any[]) => any
) {
  let disposable = vscode.commands.registerCommand(command, async args => {
    if (!vscode.window.activeTextEditor) {
      return;
    }

    callback(args);
  });
  context.subscriptions.push(disposable);
}

process.on('unhandledRejection', function(reason: any, p: any) {
  console.log('Unhandled Rejection at: Promise ', p, ' reason: ', reason);
});
