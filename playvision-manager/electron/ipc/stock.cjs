const { ipcMain } = require('electron')
const { db } = require('../database.cjs')

ipcMain.handle('stock:get', () => {
  return db.prepare(`
    SELECT
      s.id,
      s.name,
      s.price,
      s.quantity,
      s.category_id,
      c.name AS category_name
    FROM stock_items s
    LEFT JOIN categories c ON c.id = s.category_id
    ORDER BY s.name COLLATE NOCASE
  `).all()
})

ipcMain.handle('stock:create', (_, item) => {
  const normalizedPrice = Number(item.price) || 0
  const normalizedQuantity = Number(item.quantity) || 0
  const categoryId = item.categoryId || null

  const result = db.prepare(`
    INSERT INTO stock_items
    (name, price, quantity, category_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    item.name ?? '',
    normalizedPrice,
    normalizedQuantity,
    categoryId,
    new Date().toISOString()
  )

  return {
    id: result.lastInsertRowid,
    name: item.name ?? '',
    price: normalizedPrice,
    quantity: normalizedQuantity,
    category_id: categoryId
  }
})

ipcMain.handle('stock:update', (_, item) => {
  const normalizedPrice = Number(item.price) || 0
  const normalizedQuantity = Number(item.quantity) || 0
  const categoryId = item.categoryId || null

  db.prepare(`
    UPDATE stock_items SET
      name = ?,
      price = ?,
      quantity = ?,
      category_id = ?
    WHERE id = ?
  `).run(
    item.name ?? '',
    normalizedPrice,
    normalizedQuantity,
    categoryId,
    item.id
  )

  return {
    id: item.id,
    name: item.name ?? '',
    price: normalizedPrice,
    quantity: normalizedQuantity,
    category_id: categoryId
  }
})

ipcMain.handle('stock:delete', (_, id) => {
  db.prepare('DELETE FROM stock_items WHERE id = ?').run(id)
  return id
})
