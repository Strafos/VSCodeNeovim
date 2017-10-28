// let Application = require('spectron').Application
import { Application } from 'spectron';
const assert = require('assert')
import { clipboard } from 'electron'
// const { dialog } = require('electron').remote
// import { dialog } from 'electron'


describe('application launch', function () {
  this.timeout(10000)
  let app: Application;
  beforeEach(() => {
    app = new Application({
      path: '/usr/bin/code',
      args: ['--skip-getting-started'],
    })
    return app.start()
  })

  afterEach(() => {
    if (app && app.isRunning()) {
      return app.stop()
    }
    return null;
  })

  it('shows an initial window', async () => {
    // app.electron.clipboard.writeText('pasta')
    //   .electron.clipboard.readText().then(function (clipboardText) {
    //     console.log('The clipboard text is ' + clipboardText)
    //   })

    app.electron.BrowserWindow
    app.client.waitUntilWindowLoaded().then(function () {
      // app.browserWindow.close();
      // for (let i = 0; i < 1000000000; i++) {
      //   continue;
      // }
      // console.log('title is' + app.browserWindow.getTitle());
      console.log((app.browserWindow.getTitle()));

    })

    // console.log(app.browserWindow.close)

    // .showOpenDialog({ properties: ['openFile', 'openDirectory', 'multiSelections'] }));
    // return app.client.getWindowCount().then(function (count) {
    //   assert.equal(count, 2)
    // })
    return assert.equal(1, 1)
  })
})

