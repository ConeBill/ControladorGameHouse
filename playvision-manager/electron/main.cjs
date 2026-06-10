require('./ipc/machines.cjs')
require('./ipc/clients.cjs')
require('./ipc/settings.cjs')
require('./ipc/stock.cjs')
require('./ipc/sales.cjs')

const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs')
    }
  })

  win.loadURL('http://localhost:5173')
}

app.whenReady().then(createWindow)