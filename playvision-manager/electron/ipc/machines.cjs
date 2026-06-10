const { ipcMain } = require('electron')
const { db } = require('../database.cjs')

const reservedMachineIds = new Set()

function getNextMachineId() {
  const rows = db.prepare('SELECT id FROM machines').all()
  const used = rows.map(r => r.id)

  let id = 1
  while (used.includes(id) || reservedMachineIds.has(id)) {
    id++
  }
  return id
}

/* ===== MACHINES ===== */

ipcMain.handle('machines:get', () => {
  return db.prepare('SELECT * FROM machines').all()
})

ipcMain.handle('machines:create', (_, machine) => {
  const normalizedStatus = machine.status ?? 'livre'
  const normalizedAvailable = normalizedStatus === 'em_uso' ? 0 : 1

  db.prepare(`
    INSERT INTO machines
    (id, description, available, price30, price60, status, seconds, session_id, session_played_minutes, session_paid_minutes, session_paid_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    machine.id,
    machine.description,
    normalizedAvailable,
    machine.price30,
    machine.price60,
    normalizedStatus,
    machine.seconds ?? 0,
    machine.sessionId ?? null,
    machine.sessionPlayedMinutes ?? 0,
    machine.sessionPaidMinutes ?? 0,
    machine.sessionPaidAmount ?? 0
  )

  reservedMachineIds.delete(machine.id)
  return machine
})

ipcMain.handle('machines:update', (_, machine) => {
  const normalizedStatus = machine.status ?? 'livre'
  const normalizedAvailable = normalizedStatus === 'em_uso' ? 0 : 1

  db.prepare(`
    UPDATE machines SET
      description = ?,
      available = ?,
      price30 = ?,
      price60 = ?,
      status = ?,
      seconds = ?,
      session_id = ?,
      session_played_minutes = ?,
      session_paid_minutes = ?,
      session_paid_amount = ?
    WHERE id = ?
  `).run(
    machine.description,
    normalizedAvailable,
    machine.price30,
    machine.price60,
    normalizedStatus,
    machine.seconds,
    machine.sessionId ?? null,
    machine.sessionPlayedMinutes ?? 0,
    machine.sessionPaidMinutes ?? 0,
    machine.sessionPaidAmount ?? 0,
    machine.id
  )

  return machine
})

ipcMain.handle('machines:delete', (_, id) => {
  db.prepare('DELETE FROM machines WHERE id = ?').run(id)
  reservedMachineIds.delete(id)
  return id
})

ipcMain.handle('play-sessions:create', (_, session) => {
  const result = db.prepare(`
    INSERT INTO play_sessions
    (client_id, machine_id, started_at, ended_at, played_minutes, paid_minutes, paid_amount, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    session.client_id,
    session.machine_id,
    session.started_at,
    session.ended_at ?? null,
    session.played_minutes ?? 0,
    session.paid_minutes ?? 0,
    session.paid_amount ?? 0,
    session.status ?? 'em_andamento'
  )

  return {
    id: result.lastInsertRowid,
    ...session,
    played_minutes: session.played_minutes ?? 0,
    paid_minutes: session.paid_minutes ?? 0,
    paid_amount: session.paid_amount ?? 0,
    status: session.status ?? 'em_andamento'
  }
})

ipcMain.handle('play-sessions:update', (_, session) => {
  db.prepare(`
    UPDATE play_sessions SET
      played_minutes = ?,
      paid_minutes = ?,
      paid_amount = ?,
      ended_at = ?,
      status = ?
    WHERE id = ?
  `).run(
    session.played_minutes ?? 0,
    session.paid_minutes ?? 0,
    session.paid_amount ?? 0,
    session.ended_at ?? null,
    session.status ?? 'em_andamento',
    session.id
  )

  return session
})

ipcMain.handle('play-sessions:get', () => {
  return db.prepare(`
    SELECT
      ps.id,
      ps.client_id,
      ps.machine_id,
      c.name AS client_name,
      m.description AS machine_description,
      ps.started_at,
      ps.ended_at,
      ps.played_minutes,
      ps.paid_minutes,
      ps.paid_amount,
      ps.status
    FROM play_sessions ps
    LEFT JOIN clients c ON c.id = ps.client_id
    LEFT JOIN machines m ON m.id = ps.machine_id
    ORDER BY ps.started_at DESC
  `).all()
})

ipcMain.handle('machine-playtime:log', (_, { machineId, clientId, sessionId, playedMinutes }) => {
  db.prepare(`
    INSERT INTO machine_playtime_logs
    (machine_id, client_id, session_id, played_minutes, logged_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    machineId,
    clientId ?? null,
    sessionId ?? null,
    Math.floor(Number(playedMinutes ?? 0)),
    new Date().toISOString()
  )

  return { machineId, clientId, sessionId, playedMinutes }
})

ipcMain.handle('machine-playtime:get', (_, clientId) => {
  return db.prepare(`
    SELECT
      SUM(played_minutes) as total_minutes,
      COUNT(*) as total_sessions
    FROM machine_playtime_logs
    WHERE client_id = ?
  `).get(clientId) ?? { total_minutes: 0, total_sessions: 0 }
})

/* ===== ID TEMP ===== */

ipcMain.handle('machines:reserveId', () => {
  const id = getNextMachineId()
  reservedMachineIds.add(id)
  return id
})

ipcMain.handle('machines:releaseId', (_, id) => {
  reservedMachineIds.delete(id)
})