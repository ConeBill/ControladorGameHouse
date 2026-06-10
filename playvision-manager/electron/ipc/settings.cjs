const { ipcMain, dialog } = require('electron')
const fs = require('fs')
const database = require('../database.cjs')

ipcMain.handle('database:getInfo', () => {
  return database.getDatabaseInfo()
})

ipcMain.handle('database:backup', async () => {
  const result = await dialog.showSaveDialog({
    title: 'Salvar backup do banco',
    defaultPath: 'playvision.db',
    filters: [
      { name: 'Arquivo SQLite', extensions: ['db'] }
    ]
  })

  if (result.canceled) {
    return { canceled: true }
  }

  database.backupDatabase(result.filePath)

  return {
    canceled: false,
    path: result.filePath
  }
})

ipcMain.handle('database:restore', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Restaurar backup do banco',
    properties: ['openFile'],
    filters: [
      { name: 'Arquivo SQLite', extensions: ['db'] }
    ]
  })

  if (result.canceled) {
    return { canceled: true }
  }

  const backupPath = result.filePaths[0]
  database.restoreDatabase(backupPath)

  return {
    canceled: false,
    path: backupPath
  }
})

ipcMain.handle('categories:get', () => {
  return database.db.prepare(`
    SELECT id, name, created_at
    FROM categories
    ORDER BY name COLLATE NOCASE
  `).all()
})

ipcMain.handle('categories:create', (_, category) => {
  const now = new Date().toISOString()
  const result = database.db.prepare(`
    INSERT INTO categories (name, created_at)
    VALUES (?, ?)
  `).run(category.name ?? '', now)

  return {
    id: result.lastInsertRowid,
    name: category.name ?? '',
    created_at: now
  }
})

ipcMain.handle('database:clear', () => {
  database.clearDatabase()
  return { success: true }
})
