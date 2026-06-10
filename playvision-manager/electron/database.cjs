const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const dbPath = path.join(app.getPath('userData'), 'playvision.db')
console.log('[DB PATH]', dbPath)

let db = new Database(dbPath)

function ensureColumn(connection, tableName, columnName, definition) {
  const info = connection.prepare(`PRAGMA table_info(${tableName})`).all()
  const exists = info.some(column => column.name === columnName)

  if (!exists) {
    connection.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`).run()
  }
}

function initializeTables(connection) {
  connection.prepare(`
    CREATE TABLE IF NOT EXISTS machines (
      id INTEGER PRIMARY KEY,
      description TEXT,
      available INTEGER,
      price30 REAL,
      price60 REAL,
      status TEXT,
      seconds INTEGER
    )
  `).run()

  connection.prepare(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      birthdate TEXT,
      phone TEXT,
      email TEXT,
      playTime INTEGER
    )
  `).run()

  connection.prepare(`
    CREATE TABLE IF NOT EXISTS play_sessions (
      id INTEGER PRIMARY KEY,
      client_id INTEGER,
      machine_id INTEGER,
      started_at TEXT,
      ended_at TEXT,
      played_minutes INTEGER,
      paid_minutes INTEGER,
      paid_amount REAL,
      status TEXT
    )
  `).run()

  connection.prepare(`
    CREATE TABLE IF NOT EXISTS machine_playtime_logs (
      id INTEGER PRIMARY KEY,
      machine_id INTEGER,
      client_id INTEGER,
      session_id INTEGER,
      played_minutes INTEGER,
      logged_at TEXT
    )
  `).run()

  connection.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `).run()

  connection.prepare(`
    CREATE TABLE IF NOT EXISTS stock_items (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 0,
      category_id INTEGER,
      created_at TEXT
    )
  `).run()

  connection.prepare(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT
    )
  `).run()

  connection.prepare(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY,
      client_id INTEGER,
      client_name TEXT,
      items TEXT,
      total REAL,
      payment_method TEXT,
      created_at TEXT
    )
  `).run()

  ensureColumn(connection, 'machines', 'session_id', 'INTEGER')
  ensureColumn(connection, 'machines', 'session_played_minutes', 'INTEGER DEFAULT 0')
  ensureColumn(connection, 'machines', 'session_paid_minutes', 'INTEGER DEFAULT 0')
  ensureColumn(connection, 'machines', 'session_paid_amount', 'REAL DEFAULT 0')
  ensureColumn(connection, 'clients', 'last_playtime_sync', 'TEXT')
  ensureColumn(connection, 'stock_items', 'category_id', 'INTEGER')
}

initializeTables(db)

function getDbPath() {
  return dbPath
}

function reloadDatabase() {
  db.close()
  db = new Database(dbPath)
  initializeTables(db)
  module.exports.db = db
}

function getDatabaseInfo() {
  const stats = fs.statSync(dbPath)

  return {
    sizeBytes: stats.size,
    sizeMB: Number((stats.size / (1024 * 1024)).toFixed(2)),
    path: dbPath
  }
}

function backupDatabase(targetPath) {
  fs.copyFileSync(dbPath, targetPath)
  return targetPath
}

function restoreDatabase(sourcePath) {
  fs.copyFileSync(sourcePath, dbPath)
  reloadDatabase()
  return sourcePath
}

function clearDatabase() {
  db.prepare('DELETE FROM machines').run()
  db.prepare('DELETE FROM clients').run()
  db.prepare('DELETE FROM stock_items').run()
  db.prepare('DELETE FROM categories').run()
  reloadDatabase()

  return {
    machines: db.prepare('SELECT COUNT(*) as count FROM machines').get().count,
    clients: db.prepare('SELECT COUNT(*) as count FROM clients').get().count,
    stockItems: db.prepare('SELECT COUNT(*) as count FROM stock_items').get().count,
    categories: db.prepare('SELECT COUNT(*) as count FROM categories').get().count
  }
}

module.exports = {
  db,
  getDbPath,
  reloadDatabase,
  getDatabaseInfo,
  backupDatabase,
  restoreDatabase,
  clearDatabase
}
