import { useEffect, useMemo, useState } from 'react'
import '../styles/stock.css'

const initialForm = {
  name: '',
  price: '',
  quantity: '',
  categoryId: ''
}

export default function StockPage() {
  const [items, setItems] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadItems()
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      const loadedCategories = await window.api.getCategories()
      setCategories(loadedCategories || [])
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    }
  }

  async function loadItems() {
    const stock = await window.api.getStockItems()
    setItems(stock || [])
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function openNewItemForm() {
    setEditingId(null)
    setForm(initialForm)
    setIsFormOpen(true)
  }

  async function handleSave() {
    const name = form.name.trim()
    const price = Number(form.price) || 0
    const quantity = Number(form.quantity) || 0

    if (!name) {
      return
    }

    setIsSaving(true)

    try {
      const payload = {
        name,
        price,
        quantity,
        categoryId: form.categoryId || null
      }

      if (editingId) {
        await window.api.updateStockItem({ id: editingId, ...payload })
      } else {
        await window.api.createStockItem(payload)
      }

      await loadItems()
      setForm(initialForm)
      setEditingId(null)
      if (editingId) {
        setIsFormOpen(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  function handleEdit(item) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      price: String(item.price ?? 0),
      quantity: String(item.quantity ?? 0),
      categoryId: item.category_id || ''
    })
    setIsFormOpen(true)
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(`Deseja remover ${item.name} do estoque?`)

    if (!confirmed) return

    await window.api.deleteStockItem(item.id)
    await loadItems()
  }

  function handleCancel() {
    setEditingId(null)
    setForm(initialForm)
    setIsFormOpen(false)
  }

  const filteredItems = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase()
    if (!normalized) return items

    return items.filter(item => {
      const name = (item.name || '').toLowerCase()
      const category = (item.category_name || '').toLowerCase()
      return name.includes(normalized) || category.includes(normalized)
    })
  }, [items, searchQuery])

  return (
    <div className="stock-page">
      <div className="stock-page__header">
        <div>
          <h2>Estoque</h2>
          <p>Cadastre itens como Coca Cola, salgadinho e outros consumíveis. Use a tabela para editar ou excluir produtos.</p>
        </div>

        <button
          type="button"
          className={`stock-add-toggle ${isFormOpen ? 'open' : ''}`}
          onClick={() => (isFormOpen ? setIsFormOpen(false) : openNewItemForm())}
        >
          <span>{isFormOpen ? 'Fechar' : '+'}</span>
        </button>
      </div>

      {isFormOpen && (
        <section className={`stock-card ${editingId ? 'editing' : ''}`}>
          <div className="stock-card__header">
            <div>
              <h3>{editingId ? 'Editar item' : 'Adicionar novo item'}</h3>
              <p>
                {editingId
                  ? 'Atualize os dados do item e salve as alterações.'
                  : 'Preencha os campos para incluir um produto novo no estoque.'}
              </p>
            </div>
            {editingId && <span className="stock-card__mode-pill">Modo edição</span>}
          </div>
          <div className="stock-card__form">
            <div className="stock-card__field">
              <label>Nome do produto</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => handleChange('name', event.target.value)}
                placeholder="Ex: Coca Cola"
              />
            </div>

            <div className="stock-card__field">
              <label>Preço</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => handleChange('price', event.target.value)}
                placeholder="0,00"
              />
            </div>

            <div className="stock-card__field">
              <label>Quantidade</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.quantity}
                onChange={(event) => handleChange('quantity', event.target.value)}
                placeholder="0"
              />
            </div>

            <div className="stock-card__field">
              <label>Categoria</label>
              <select
                value={form.categoryId}
                onChange={(event) => handleChange('categoryId', event.target.value)}
              >
                <option value="">Sem categoria</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="stock-card__actions">
              <button
                type="button"
                className="stock-button stock-button--primary"
                onClick={handleSave}
                disabled={isSaving || !form.name.trim()}
              >
                {editingId ? 'Salvar alterações' : 'Adicionar item'}
              </button>

              <button
                type="button"
                className="stock-button stock-button--secondary"
                onClick={handleCancel}
              >
                {editingId ? 'Cancelar edição' : 'Fechar'}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="stock-table-card">
        <div className="stock-table-card__header">
          <div>
            <h3>Itens cadastrados</h3>
            <span>{filteredItems.length} de {items.length} item(s)</span>
          </div>
          <input
            type="text"
            className="stock-search-input"
            placeholder="Buscar por nome ou categoria"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="stock-table-wrapper">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Quantidade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="5">Nenhum item cadastrado ainda.</td>
                </tr>
              ) : filteredItems.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.category_name || '-'}</td>
                  <td>R$ {Number(item.price).toFixed(2)}</td>
                  <td>{item.quantity}</td>
                  <td className="stock-table__actions">
                    <button
                      type="button"
                      className="stock-button stock-button--small"
                      onClick={() => handleEdit(item)}
                    >
                      Alterar
                    </button>
                    <button
                      type="button"
                      className="stock-button stock-button--danger"
                      onClick={() => handleDelete(item)}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
