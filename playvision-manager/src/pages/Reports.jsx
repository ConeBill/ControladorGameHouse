import { useEffect, useMemo, useState } from 'react'

const REPORT_TYPES = [
  { value: 'machines', label: 'Máquinas' },
  { value: 'clients', label: 'Clientes' },
  { value: 'sales', label: 'Vendas' },
  { value: 'detailed', label: 'Histórico detalhado' }
]

export default function Reports() {
  const [sessions, setSessions] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  // Controls
  const [reportType, setReportType] = useState('machines')
  const [nameFilter, setNameFilter] = useState('')
  const [startDateFilter, setStartDateFilter] = useState('')
  import { useEffect, useMemo, useState } from 'react'

  const REPORT_TYPES = [
    { value: 'machines', label: 'Máquinas' },
    { value: 'clients', label: 'Clientes' },
    { value: 'sales', label: 'Vendas' },
    { value: 'detailed', label: 'Histórico detalhado' }
  ]

  export default function Reports() {
    const [sessions, setSessions] = useState([])
    const [sales, setSales] = useState([])
    const [loading, setLoading] = useState(true)

    // Controls
    const [reportType, setReportType] = useState('machines')
    const [nameFilter, setNameFilter] = useState('')
    const [startDateFilter, setStartDateFilter] = useState('')
    const [endDateFilter, setEndDateFilter] = useState('')
    const [groupResults, setGroupResults] = useState(true)
    const [perPage, setPerPage] = useState(25)
    const [page, setPage] = useState(1)
    const [minimizeAll, setMinimizeAll] = useState(false)
    const [expandedMap, setExpandedMap] = useState({})

    useEffect(() => {
      async function loadAll() {
        try {
          const s = await window.api.getPlaySessions()
          const sl = await window.api.getSales()
          setSessions(Array.isArray(s) ? s : [])
          setSales(Array.isArray(sl) ? sl : [])
        } catch (err) {
          console.error('Erro ao carregar dados:', err)
          setSessions([])
          setSales([])
        } finally {
          setLoading(false)
        }
      }

      loadAll()
    }, [])

    function parseDateOnly(value) {
      return value ? new Date(`${value}T00:00:00`) : null
    }

    function inRange(dateStr) {
      const d = new Date(dateStr)
      const start = parseDateOnly(startDateFilter)
      const end = endDateFilter ? new Date(`${endDateFilter}T23:59:59.999`) : null
      if (start && d < start) return false
      if (end && d > end) return false
      return true
    }

    const filteredSessions = useMemo(() => {
      return sessions.filter(s => {
        if (startDateFilter || endDateFilter) {
          if (!inRange(s.started_at)) return false
        }

        const normalized = nameFilter.trim().toLowerCase()
        if (!normalized) return true

        if (reportType === 'machines') {
          return (s.machine_description || '').toLowerCase().includes(normalized)
        }

        return (s.client_name || '').toLowerCase().includes(normalized)
      })
    }, [sessions, startDateFilter, endDateFilter, nameFilter, reportType])

    const filteredSales = useMemo(() => {
      return sales.filter(sale => {
        if (startDateFilter || endDateFilter) {
          if (!inRange(sale.created_at)) return false
        }

        const normalized = nameFilter.trim().toLowerCase()
        if (!normalized) return true

        if ((sale.client_name || '').toLowerCase().includes(normalized)) return true
        return (sale.items || []).some(i => (i.name || '').toLowerCase().includes(normalized))
      })
    }, [sales, startDateFilter, endDateFilter, nameFilter])

    const machinesSummary = useMemo(() => {
      const grouped = new Map()
      filteredSessions.forEach(s => {
        const key = s.machine_id ?? 'unknown'
        const e = grouped.get(key) ?? { machineId: key, machineName: s.machine_description || 'Máquina desconhecida', sessions: [], totalPlayedMinutes: 0, totalPaidMinutes: 0, totalPaidAmount: 0 }
        e.sessions.push(s)
        e.totalPlayedMinutes += Number(s.played_minutes || 0)
        e.totalPaidMinutes += Number(s.paid_minutes || 0)
        e.totalPaidAmount += Number(s.paid_amount || 0)
        grouped.set(key, e)
      })
      return Array.from(grouped.values()).sort((a, b) => b.totalPlayedMinutes - a.totalPlayedMinutes)
    }, [filteredSessions])

    const clientsSummary = useMemo(() => {
      const grouped = new Map()
      filteredSessions.forEach(s => {
        const key = s.client_id ?? 'unknown'
        const e = grouped.get(key) ?? { clientId: key, clientName: s.client_name || 'Cliente desconhecido', sessions: [], totalPlayedMinutes: 0, totalPaidMinutes: 0, totalPaidAmount: 0 }
        e.sessions.push(s)
        e.totalPlayedMinutes += Number(s.played_minutes || 0)
        e.totalPaidMinutes += Number(s.paid_minutes || 0)
        e.totalPaidAmount += Number(s.paid_amount || 0)
        grouped.set(key, e)
      })
      return Array.from(grouped.values()).sort((a, b) => b.totalPlayedMinutes - a.totalPlayedMinutes)
    }, [filteredSessions])

    const salesByClient = useMemo(() => {
      const grouped = new Map()
      filteredSales.forEach(sale => {
        const key = sale.client_id ?? 'unknown'
        const e = grouped.get(key) ?? { clientId: key, clientName: sale.client_name || 'Cliente desconhecido', totalSales: 0, totalAmount: 0 }
        e.totalSales += 1
        e.totalAmount += Number(sale.total || 0)
        grouped.set(key, e)
      })
      return Array.from(grouped.values()).sort((a, b) => b.totalAmount - a.totalAmount)
    }, [filteredSales])

    function formatMinutes(totalMinutes) {
      const safeMinutes = Math.max(Number(totalMinutes || 0), 0)
      const hours = Math.floor(safeMinutes / 60)
      const minutes = safeMinutes % 60
      return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`
    }

    function formatCurrency(amount) {
      return Number(amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    }

    const totalPages = Math.max(1, Math.ceil(filteredSessions.length / perPage))
    const pagedSessions = filteredSessions.slice((page - 1) * perPage, page * perPage)

    function toggleExpand(key) {
      setExpandedMap(prev => ({ ...prev, [key]: !prev[key] }))
    }

    function toggleMinimizeAll() {
      setMinimizeAll(v => !v)
      if (!minimizeAll) setExpandedMap({})
    }

    function exportSalesCsv() {
      const header = ['Data', 'Cliente', 'Itens', 'Total', 'Pagamento']
      const rows = filteredSales.map(sale => {
        const items = (sale.items || []).map(item => `${item.name} x${item.quantity}`).join(' | ')
        return [new Date(sale.created_at).toLocaleString('pt-BR'), sale.client_name || 'Cliente desconhecido', items, Number(sale.total || 0).toFixed(2), sale.payment_method || '']
      })
      const csv = [header, ...rows].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `vendas_${new Date().toISOString().slice(0, 10)}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    }

    return (
      <section className="neon-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.35rem' }}>Relatórios</h2>
          <p style={{ margin: 0, color: '#a0a0c8' }}>Selecione um relatório, aplique filtros por período e nome, e execute uma consulta por vez.</p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={reportType} onChange={e => { setReportType(e.target.value); setPage(1) }} style={{ minHeight: 46, borderRadius: 14, padding: '8px 12px' }}>
            {REPORT_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>

          <input type="text" placeholder="Filtrar por nome (cliente ou máquina)" value={nameFilter} onChange={e => setNameFilter(e.target.value)} style={{ minWidth: 240, borderRadius: 14, padding: '8px 12px' }} />

          <input type="date" value={startDateFilter} onChange={e => setStartDateFilter(e.target.value)} style={{ borderRadius: 14, padding: '8px 12px' }} />
          <input type="date" value={endDateFilter} onChange={e => setEndDateFilter(e.target.value)} style={{ borderRadius: 14, padding: '8px 12px' }} />

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={groupResults} onChange={e => setGroupResults(e.target.checked)} /> Agrupar resultados
          </label>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={minimizeAll} onChange={toggleMinimizeAll} /> Minimizar todos
          </label>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }} style={{ minHeight: 40, borderRadius: 14 }}>
              {[10,25,50,100].map(n => <option key={n} value={n}>{n} / página</option>)}
            </select>
          </div>
        </div>

        {reportType === 'machines' && (
          <article style={{ borderRadius: 18, border: '1px solid rgba(98,227,202,0.3)', padding: 16, background: 'rgba(9,12,25,0.88)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Relatório por máquina</h3>
              <span style={{ color: '#a0a0c8' }}>{machinesSummary.length} máquinas</span>
            </div>

            {loading ? <p style={{ color: '#a0a0c8' }}>Carregando...</p> : machinesSummary.length === 0 ? <p style={{ color: '#a0a0c8' }}>Nenhum registro.</p> : (
              <div>
                {machinesSummary.map(m => (
                  <div key={m.machineId} style={{ marginBottom: 12, borderRadius: 12, padding: 12, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{m.machineName}</strong>
                        <div style={{ color: '#a0a0c8', fontSize: '0.9rem' }}>{m.sessions.length} sessão(ões)</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div>{formatMinutes(m.totalPlayedMinutes)}</div>
                          <div style={{ fontSize: '0.9rem', color: '#a0a0c8' }}>{formatCurrency(m.totalPaidAmount)}</div>
                        </div>
                        <button className="neon-button" onClick={() => toggleExpand(m.machineId)}>{expandedMap[m.machineId] ? 'Ocultar' : 'Detalhar'}</button>
                      </div>
                    </div>

                    {expandedMap[m.machineId] && (
                      <div style={{ marginTop: 8, overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ color: '#88f3dd', textAlign: 'left' }}>
                              <th style={{ padding: '6px 8px' }}>Início</th>
                              <th style={{ padding: '6px 8px' }}>Cliente</th>
                              <th style={{ padding: '6px 8px' }}>Tempo</th>
                              <th style={{ padding: '6px 8px' }}>Pago</th>
                              <th style={{ padding: '6px 8px' }}>Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {m.sessions.map(s => (
                              <tr key={s.id} style={{ color: '#f4f4ff' }}>
                                <td style={{ padding: '6px 8px' }}>{new Date(s.started_at).toLocaleString('pt-BR')}</td>
                                <td style={{ padding: '6px 8px' }}>{s.client_name}</td>
                                <td style={{ padding: '6px 8px' }}>{formatMinutes(s.played_minutes)}</td>
                                <td style={{ padding: '6px 8px' }}>{formatMinutes(s.paid_minutes)}</td>
                                <td style={{ padding: '6px 8px' }}>{formatCurrency(s.paid_amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </article>
        )}

        {reportType === 'clients' && (
          <article style={{ borderRadius: 18, border: '1px solid rgba(98,227,202,0.3)', padding: 16, background: 'rgba(9,12,25,0.88)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Relatório por cliente</h3>
              <span style={{ color: '#a0a0c8' }}>{clientsSummary.length} clientes</span>
            </div>

            {loading ? <p style={{ color: '#a0a0c8' }}>Carregando...</p> : clientsSummary.length === 0 ? <p style={{ color: '#a0a0c8' }}>Nenhum registro.</p> : (
              <div>
                {clientsSummary.map(c => (
                  <div key={c.clientId} style={{ marginBottom: 12, borderRadius: 12, padding: 12, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{c.clientName}</strong>
                        <div style={{ color: '#a0a0c8', fontSize: '0.9rem' }}>{c.sessions.length} sessão(ões)</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div>{formatMinutes(c.totalPlayedMinutes)}</div>
                          <div style={{ fontSize: '0.9rem', color: '#a0a0c8' }}>{formatCurrency(c.totalPaidAmount)}</div>
                        </div>
                        <button className="neon-button" onClick={() => toggleExpand(c.clientId)}>{expandedMap[c.clientId] ? 'Ocultar' : 'Detalhar'}</button>
                      </div>
                    </div>

                    {expandedMap[c.clientId] && (
                      <div style={{ marginTop: 8 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ color: '#88f3dd', textAlign: 'left' }}>
                              <th style={{ padding: '6px 8px' }}>Início</th>
                              <th style={{ padding: '6px 8px' }}>Máquina</th>
                              <th style={{ padding: '6px 8px' }}>Tempo</th>
                              <th style={{ padding: '6px 8px' }}>Pago</th>
                              <th style={{ padding: '6px 8px' }}>Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {c.sessions.map(s => (
                              <tr key={s.id} style={{ color: '#f4f4ff' }}>
                                <td style={{ padding: '6px 8px' }}>{new Date(s.started_at).toLocaleString('pt-BR')}</td>
                                <td style={{ padding: '6px 8px' }}>{s.machine_description}</td>
                                <td style={{ padding: '6px 8px' }}>{formatMinutes(s.played_minutes)}</td>
                                <td style={{ padding: '6px 8px' }}>{formatMinutes(s.paid_minutes)}</td>
                                <td style={{ padding: '6px 8px' }}>{formatCurrency(s.paid_amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </article>
        )}

        {reportType === 'sales' && (
          <article style={{ borderRadius: 18, border: '1px solid rgba(255,180,120,0.2)', padding: 16, background: 'rgba(9,12,25,0.88)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Relatório de vendas</h3>
              <span style={{ color: '#a0a0c8' }}>{filteredSales.length} registros</span>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <input type="text" placeholder="Pesquisar cliente ou item" value={nameFilter} onChange={e => setNameFilter(e.target.value)} style={{ minWidth: 240, borderRadius: 14, padding: '8px 12px' }} />
              <input type="date" value={startDateFilter} onChange={e => setStartDateFilter(e.target.value)} style={{ borderRadius: 14, padding: '8px 12px' }} />
              <input type="date" value={endDateFilter} onChange={e => setEndDateFilter(e.target.value)} style={{ borderRadius: 14, padding: '8px 12px' }} />
              <button className="neon-button" onClick={exportSalesCsv}>Exportar CSV</button>
            </div>

            {loading ? <p style={{ color: '#a0a0c8' }}>Carregando...</p> : filteredSales.length === 0 ? <p style={{ color: '#a0a0c8' }}>Nenhuma venda encontrada.</p> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: '#ffb486', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>Data</th>
                      <th style={{ padding: '6px 8px' }}>Cliente</th>
                      <th style={{ padding: '6px 8px' }}>Itens</th>
                      <th style={{ padding: '6px 8px' }}>Total</th>
                      <th style={{ padding: '6px 8px' }}>Pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map(sale => (
                      <tr key={sale.id} style={{ color: '#f4f4ff' }}>
                        <td style={{ padding: '6px 8px' }}>{new Date(sale.created_at).toLocaleString('pt-BR')}</td>
                        <td style={{ padding: '6px 8px' }}>{sale.client_name || 'Cliente desconhecido'}</td>
                        <td style={{ padding: '6px 8px' }}>{(sale.items || []).map(i => `${i.name} x${i.quantity}`).join(', ')}</td>
                        <td style={{ padding: '6px 8px' }}>{formatCurrency(sale.total)}</td>
                        <td style={{ padding: '6px 8px' }}>{sale.payment_method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        )}

        {reportType === 'detailed' && (
          <article style={{ borderRadius: 18, border: '1px solid rgba(98,227,202,0.3)', padding: 16, background: 'rgba(9,12,25,0.88)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Histórico detalhado</h3>
              <span style={{ color: '#a0a0c8' }}>{filteredSessions.length} registros</span>
            </div>

            {loading ? <p style={{ color: '#a0a0c8' }}>Carregando...</p> : filteredSessions.length === 0 ? <p style={{ color: '#a0a0c8' }}>Nenhum registro.</p> : (
              <div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: '#88f3dd', textAlign: 'left' }}>
                        <th style={{ padding: '6px 8px' }}>Início</th>
                        {!minimizeAll && <th style={{ padding: '6px 8px' }}>Cliente</th>}
                        <th style={{ padding: '6px 8px' }}>Máquina</th>
                        <th style={{ padding: '6px 8px' }}>Tempo</th>
                        {!minimizeAll && <th style={{ padding: '6px 8px' }}>Horas pagas</th>}
                        {!minimizeAll && <th style={{ padding: '6px 8px' }}>Valor</th>}
                        <th style={{ padding: '6px 8px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedSessions.map(s => (
                        <tr key={s.id} style={{ color: '#f4f4ff' }}>
                          <td style={{ padding: '6px 8px' }}>{new Date(s.started_at).toLocaleString('pt-BR')}</td>
                          {!minimizeAll && <td style={{ padding: '6px 8px' }}>{s.client_name}</td>}
                          <td style={{ padding: '6px 8px' }}>{s.machine_description}</td>
                          <td style={{ padding: '6px 8px' }}>{formatMinutes(s.played_minutes)}</td>
                          {!minimizeAll && <td style={{ padding: '6px 8px' }}>{formatMinutes(s.paid_minutes)}</td>}
                          {!minimizeAll && <td style={{ padding: '6px 8px' }}>{formatCurrency(s.paid_amount)}</td>}
                          <td style={{ padding: '6px 8px' }}>{s.status === 'encerrada' ? 'Encerrada' : 'Em andamento'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="neon-button" onClick={() => { setPage(p => Math.max(1, p - 1)) }} disabled={page <= 1}>Anterior</button>
                    <button className="neon-button" onClick={() => { setPage(p => Math.min(totalPages, p + 1)) }} disabled={page >= totalPages}>Próxima</button>
                  </div>
                  <div style={{ color: '#a0a0c8' }}>Página {page} / {totalPages}</div>
                </div>
              </div>
            )}
          </article>
        )}
      </section>
    )
  }
}