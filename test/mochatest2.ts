import { Application } from 'spectron';
const assert = require('assert')
import { BrowserWindow } from 'electron';


describe('application launch', function () {
  this.timeout(10000000)
  let app: Application;
  beforeEach(() => {
    app = new Application({
      path: '/usr/bin/code',
      args: ['./testfile/testfile.js', '--skip-getting-started'],
    })
    return app.start()
  })

  afterEach(() => {
    if (app && app.isRunning()) {
      return app.stop()
    }
    return null;
  })

  it('finds and prints text in current vscode file', async () => {
    // app.electron.clipboard.writeText('aaa')
    // let text = await app.electron.clipboard.readText()

    for (let i = 0; i < 500000000000; i++) {
      continue
    }
    console.log(await app.webContents)
    await app.browserWindow.destroy()
    console.log(require.resolve('electron'))
    for (let i = 0; i < 10000000000; i++) {
      continue
    }
  })
})