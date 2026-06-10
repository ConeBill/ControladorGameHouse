import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchClients } from '../app/slices/clientSlice'
import '../styles/food.css'

const PAYMENT_METHODS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'credito', label: 'Crédito' },
  { value: 'debito', label: 'Débito' }
]

export default function FoodPage() {
  const dispatch = useDispatch()
  const clients = useSelector(state => state.clients.list)
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientSearch, setClientSearch] = useState('')
  const [stockItems, setStockItems] = useState([])
  const [itemSearch, setItemSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [itemQuantity, setItemQuantity] = useState('1')
  const [cart, setCart] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('dinheiro')
  const [isSaving, setIsSaving] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authCode, setAuthCode] = useState('')

  useEffect(() => {
    dispatch(fetchClients())
    loadStockItems()
  }, [dispatch])

  async function loadStockItems() {
    const stock = await window.api.getStockItems()
    setStockItems(stock ?? [])
  }

  const filteredClients = useMemo(() => {
    const normalized = clientSearch.trim().toLowerCase()
    if (!normalized) return clients
    return clients.filter(client => client.name.toLowerCase().includes(normalized))
  }, [clients, clientSearch])

  const filteredStockItems = useMemo(() => {
    const normalized = itemSearch.trim().toLowerCase()
    const matches = !normalized
      ? stockItems
      : stockItems.filter(item => item.name.toLowerCase().includes(normalized))

    if (matches.length === 0) return []

    const randomIndex = Math.floor(Math.random() * matches.length)
    return [matches[randomIndex]]
  }, [stockItems, itemSearch])

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }, [cart])

  const selectedItemAvailable = useMemo(() => {
    if (!selectedItem) return 0
    const inCart = cart.find(item => item.id === selectedItem.id)
    return selectedItem.quantity - (inCart?.quantity || 0)
  }, [cart, selectedItem])

  function selectClient(client) {
    setSelectedClient(client)
    setClientSearch(client.name)
  }

  function selectItem(item) {
    setSelectedItem(item)
    setItemQuantity('1')
  }

  function updateCartItem(id, quantity) {
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity } : item))
  }

  function removeCartItem(id) {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  function handleAddToCart() {
    if (!selectedItem) return

    const quantity = Number(itemQuantity) || 0
    if (quantity <= 0) return
    if (quantity > selectedItemAvailable) return

    setCart(prev => {
      const existing = prev.find(item => item.id === selectedItem.id)

      if (existing) {
        return prev.map(item => item.id === selectedItem.id ? { ...item, quantity: item.quantity + quantity } : item)
      }

      return [...prev, {
        id: selectedItem.id,
        name: selectedItem.name,
        price: selectedItem.price,
        quantity
      }]
    })
    setSelectedItem(null)
    setItemQuantity('1')
  }

  async function handleFinalizeSale() {
    if (!selectedClient || cart.length === 0) return
    setShowAuthModal(true)
    setAuthCode('')
  }

  async function handleConfirmSaleWithAuth() {
    if (!authCode.trim()) {
      window.alert('Por favor, preencha o código de autorização (aut pag).')
      return
    }

    setIsSaving(true)

    try {
      const now = new Date().toISOString()

      const saleRecord = {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        items: cart,
        total: cartTotal,
        paymentMethod,
        authCode: authCode.trim(),
        created_at: now
      }

      await window.api.createSale(saleRecord)

      const updates = cart.map(cartItem => {
        const stockItem = stockItems.find(item => item.id === cartItem.id)
        const remaining = Math.max((stockItem?.quantity ?? 0) - cartItem.quantity, 0)
        return {
          ...stockItem,
          quantity: remaining
        }
      })

      for (const updatedItem of updates) {
        await window.api.updateStockItem(updatedItem)
      }

      setCart([])
      setSelectedItem(null)
      setItemQuantity('1')
      setShowAuthModal(false)
      setAuthCode('')
      await loadStockItems()
      window.alert(`Venda finalizada para ${selectedClient.name}. Pagamento: ${PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label || paymentMethod}. Total: R$ ${cartTotal.toFixed(2)}. Aut pag: ${authCode}`)
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancelAuth() {
    setShowAuthModal(false)
    setAuthCode('')
  }

  return (
    <div className="food-page">
      <div className="food-page__header">
        <h2>Comidas & Bebidas</h2>
        <p>Venda produtos do estoque para um cliente, registre o pagamento e atualize automaticamente as quantidades.</p>
      </div>

      <section className="food-panel">
        <div className="food-card">
          <div className="food-card__section">
            <h3>Cliente</h3>
            <input
              type="text"
              className="food-input"
              placeholder="Buscar cliente"
              value={clientSearch}
              onChange={(event) => {
                setClientSearch(event.target.value)
                setSelectedClient(null)
              }}
            />
            <div className="food-suggestions">
              {clientSearch && filteredClients.slice(0, 8).map(client => (
                <button
                  key={client.id}
                  type="button"
                  className="food-suggestion"
                  onClick={() => selectClient(client)}
                >
                  <strong>{client.name}</strong>
                  <span>#{client.id} • {client.phone || 'Sem telefone'}</span>
                </button>
              ))}
            </div>
            <div className="food-selected">
              Cliente: <strong>{selectedClient ? selectedClient.name : 'Nenhum cliente selecionado'}</strong>
            </div>
          </div>

          <div className="food-card__section">
            <h3>Buscar produto</h3>
            <input
              type="text"
              className="food-input"
              placeholder="Nome do item"
              value={itemSearch}
              onChange={(event) => setItemSearch(event.target.value)}
            />
            <div className="food-stock-list">
              {filteredStockItems.slice(0, 8).map(item => (
                <button
                  key={item.id}
                  type="button"
                  className="food-stock-item"
                  onClick={() => selectItem(item)}
                  disabled={item.quantity <= 0}
                >
                  <div>
                    <strong>{item.name}</strong>
                    <span>R$ {Number(item.price).toFixed(2)}</span>
                  </div>
                  <span>{item.quantity > 0 ? `${item.quantity} em estoque` : 'Sem estoque'}</span>
                </button>
              ))}
              {filteredStockItems.length === 0 && (
                <p className="food-empty">Nenhum item encontrado.</p>
              )}
            </div>
            {selectedItem && (
              <div className="food-add-row">
                <div>
                  <span className="food-add-label">Item selecionado:</span>
                  <strong>{selectedItem.name}</strong>
                </div>
                <div className="food-add-inputs">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="food-small-input"
                    value={itemQuantity}
                    onChange={(event) => {
                      const nextQty = event.target.value
                      setItemQuantity(nextQty)
                    }}
                  />
                  <button
                    type="button"
                    className="food-button food-button--primary"
                    onClick={handleAddToCart}
                    disabled={selectedItemAvailable <= 0 || Number(itemQuantity) <= 0 || Number(itemQuantity) > selectedItemAvailable}
                  >
                    Adicionar
                  </button>
                </div>
                <p className="food-available">
                  Disponível: {selectedItemAvailable} unidade(s)
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="food-cart-card">
          <div className="food-cart-header">
            <h3>Cesta de compra</h3>
            <span>{cart.length} item(s)</span>
          </div>

          <div className="food-cart-table-wrapper">
            <table className="food-cart-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Qnt.</th>
                  <th>Preço</th>
                  <th>Total</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan="5">Nenhum item adicionado.</td>
                  </tr>
                ) : cart.map(item => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="food-cart-qty"
                        value={item.quantity}
                        onChange={(event) => {
                          const nextQty = Math.max(1, Number(event.target.value) || 1)
                          const stockQty = stockItems.find(stock => stock.id === item.id)?.quantity ?? 0
                          const maxQty = stockQty + item.quantity
                          updateCartItem(item.id, Math.min(nextQty, maxQty))
                        }}
                      />
                    </td>
                    <td>R$ {Number(item.price).toFixed(2)}</td>
                    <td>R$ {(item.price * item.quantity).toFixed(2)}</td>
                    <td>
                      <button
                        type="button"
                        className="food-button food-button--danger"
                        onClick={() => removeCartItem(item.id)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="food-payment-box">
            <div className="food-payment-methods">
              {PAYMENT_METHODS.map(method => (
                <label key={method.value} className="food-payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.value}
                    checked={paymentMethod === method.value}
                    onChange={() => setPaymentMethod(method.value)}
                  />
                  {method.label}
                </label>
              ))}
            </div>

            <div className="food-summary">
              <span>Total</span>
              <strong>R$ {cartTotal.toFixed(2)}</strong>
            </div>

            <button
              type="button"
              className="food-button food-button--primary food-button--block"
              onClick={handleFinalizeSale}
              disabled={!selectedClient || cart.length === 0 || isSaving}
            >
              {isSaving ? 'Finalizando...' : 'Finalizar venda'}
            </button>
          </div>
        </div>
      </section>

      {showAuthModal && (
        <div className="food-auth-modal-overlay">
          <div className="food-auth-modal">
            <div className="food-auth-modal__header">
              <h3>Código de Autorização</h3>
              <p>Digite o código de autorização de pagamento (aut pag)</p>
            </div>

            <div className="food-auth-modal__body">
              <input
                type="text"
                className="food-auth-input"
                placeholder="Aut pag"
                value={authCode}
                onChange={(event) => setAuthCode(event.target.value)}
                autoFocus
              />
              <p className="food-auth-modal__info">
                Cliente: <strong>{selectedClient?.name}</strong><br />
                Total: <strong>R$ {cartTotal.toFixed(2)}</strong>
              </p>
            </div>

            <div className="food-auth-modal__actions">
              <button
                type="button"
                className="food-button food-button--secondary"
                onClick={handleCancelAuth}
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="food-button food-button--primary"
                onClick={handleConfirmSaleWithAuth}
                disabled={!authCode.trim() || isSaving}
              >
                {isSaving ? 'Processando...' : 'Confirmar venda'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
