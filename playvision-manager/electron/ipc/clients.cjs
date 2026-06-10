const { ipcMain } = require('electron')
const { db } = require('../database.cjs')

const reservedClientIds = new Set()

function getNextClientId() {
  const rows = db.prepare('SELECT id FROM clients').all()
  const used = rows.map(r => r.id)

  let id = 1
  while (used.includes(id) || reservedClientIds.has(id)) {
    id++
  }
  return id
}

/* ===== CLIENTS ===== */

ipcMain.handle('clients:get', () => {
  return db.prepare('SELECT * FROM clients').all()
})

ipcMain.handle('clients:create', (_, client) => {
  db.prepare(`
    INSERT INTO clients (id, name, birthdate, phone, email, playTime)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    client.id,
    client.name,
    client.birthdate,
    client.phone,
    client.email,
    Number(client.playTime || 0)
  )

  reservedClientIds.delete(client.id)
  return client
})

ipcMain.handle('clients:update', (_, client) => {
  db.prepare(`
    UPDATE clients SET
      name = ?,
      birthdate = ?,
      phone = ?,
      email = ?,
      playTime = ?
    WHERE id = ?
  `).run(
    client.name,
    client.birthdate,
    client.phone,
    client.email,
    Number(client.playTime || 0),
    client.id
  )

  return client
})

/* ===== ID TEMP ===== */

ipcMain.handle('clients:reserveId', () => {
  const id = getNextClientId()
  reservedClientIds.add(id)
  return id
})

ipcMain.handle('clients:releaseId', (_, id) => {
  reservedClientIds.delete(id)
})