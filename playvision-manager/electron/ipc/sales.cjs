const { ipcMain } = require('electron')
const { db } = require('../database.cjs')

ipcMain.handle('sales:create', (_, sale) => {
  const normalizedTotal = Number(sale.total) || 0
  const itemsJson = JSON.stringify(sale.items || [])
  const createdAt = sale.created_at || new Date().toISOString()

  const result = db.prepare(`
    INSERT INTO sales (client_id, client_name, items, total, payment_method, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    sale.clientId ?? null,
    sale.clientName ?? null,
    itemsJson,
    normalizedTotal,
    sale.paymentMethod ?? null,
    createdAt
  )

  return {
    id: result.lastInsertRowid,
    client_id: sale.clientId ?? null,
    client_name: sale.clientName ?? null,
    items: sale.items || [],
    total: normalizedTotal,
    payment_method: sale.paymentMethod ?? null,
    created_at: createdAt
  }
})

ipcMain.handle('sales:get', () => {
  const rows = db.prepare(`
    SELECT id, client_id, client_name, items, total, payment_method, created_at
    FROM sales
    ORDER BY created_at DESC
  `).all()

  return rows.map(r => ({
    ...r,
    items: (() => {
      try { return JSON.parse(r.items) } catch (e) { return [] }
    })()
  }))
})

ipcMain.handle('sales:summary', () => {
  const totalSales = db.prepare('SELECT COUNT(*) as count, SUM(total) as total_amount FROM sales').get()
  const byClient = db.prepare(`
    SELECT client_id, client_name, COUNT(*) as count, SUM(total) as total_amount
    FROM sales
    GROUP BY client_id, client_name
    ORDER BY total_amount DESC
  `).all()

  return { totalSales: totalSales || { count: 0, total_amount: 0 }, byClient }
})
