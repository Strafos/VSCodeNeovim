// A simple test to verify a visible window is opened with a title
import { Application } from 'spectron';
// var assert = require('assert')
import * as assert from 'assert';

let app = new Application({
  path: '/usr/bin/code',
  args: ['--skip-getting-started']
})

// async function runtest() {
//   await app.start();
//   // app.browserWindow.().then((isVisible) => console.log(isVisible))
//   const isVisible = await app.browserWindow();

//   // console.log(app.browserWindow.isVisible()
//   // console.log(app.client.getTitle())
// }
// runtest();

app.start().then(function () {
  // Check if the window is visible
  return app.browserWindow.isVisible()
}).then(function (isVisible) {
  // Verify the window is visible
  console.log(isVisible)
  assert.equal(isVisible, true)
}).then(function () {
  // Get the winow's title
  return app.browserWindow.getTitle()
}).then(function (title) {
  // Verify the window's title
  assert.equal(title, 'My App')
}).then(function () {
  // Stop the application
  return app.stop()
}).catch(function (error) {
  // Log any failures
  console.error('Test failed', error.message)
})