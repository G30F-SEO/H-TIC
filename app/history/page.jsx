'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'

const BRANCH_COLORS = { vitrine: 'blue', ecommerce: 'green', catalogue: 'amber' }
const BRANCH_ICONS = { vitrine: '🏪', ecommerce: '🛒', catalogue: '📚' }

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function HistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [clearing, setClearing] = useState(false)
  const [filter, setFilter] = useState('all')

  async function loadHistory() {
    setLoading(true)
    try {
      const res = await fetch('/api/history')
      const data = await res.json()
      setHistory(Array.isArray(data) ? data : [])
    } catch { setHistory([]) }
    finally { setLoading(false) }
  }

  async function clearAll() {
    if (!confirm('Vider tout l\'historique ?')) return
    setClearing(true)
    await fetch('/api/history', { method: 'DELETE' })
    setHistory([])
    setClearing(false)
  }

  useEffect(() => { loadHistory() }, [])

  const filtered = filter === 'all' ? history : history.filter(h => h.branch === filter || h.status === filter)

  const stats = {
    total: history.length,
    sent: history.filter(h => h.status === 'sent').length,
    error: history.filter(h => h.status === 'error').length,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Nav />
      <main style={{ flex: 1, marginLeft: '220px', padding: '32px', maxWidth: '860px' }}>
        <div className="fade-in">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '4px' }}>Historique</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Tous les lancements Make enregistres.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={loadHistory} className="btn btn-secondary btn-sm">Actualiser</button>
              {history.length > 0 && (
                <button onClick={clearAll} disabled={clearing} className="btn btn-danger btn-sm">
                  {clearing ? 'Suppression...' : 'Vider l\'historique'}
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: 'Total lancements', value: stats.total, color: 'var(--text-primary)' },
              { label: 'Reussis', value: stats.sent, color: 'var(--success)' },
              { label: 'Erreurs', value: stats.error, color: 'var(--danger)' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '16px',
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: '28px', fontWeight: '600', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'Tout' },
              { id: 'vitrine', label: '🏪 Vitrine' },
              { id: 'ecommerce', label: '🛒 E-commerce' },
              { id: 'catalogue', label: '📚 Catalogue' },
              { id: 'sent', label: 'Reussis' },
              { id: 'error', label: 'Erreurs' },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: '5px 12px', borderRadius: '20px', fontSize: '12px',
                background: filter === f.id ? 'var(--accent)' : 'var(--bg-card)',
                border: filter === f.id ? 'none' : '1px solid var(--border)',
                color: filter === f.id ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              Aucun lancement trouve.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filtered.map(entry => {
                const isOpen = expanded === entry.id
                const branchColor = BRANCH_COLORS[entry.branch] || 'blue'
                return (
                  <div key={entry.id} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: '10px', overflow: 'hidden',
                  }}>
                    <button
                      onClick={() => setExpanded(isOpen ? null : entry.id)}
                      style={{
                        width: '100%', padding: '14px 16px', display: 'flex',
                        alignItems: 'center', gap: '12px', background: 'none',
                        color: 'var(--text-primary)', textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>{BRANCH_ICONS[entry.branch] || '📄'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontWeight: '500', fontSize: '14px' }}>{entry.company}</span>
                          <span className={`badge badge-${branchColor}`}>{entry.branch}</span>
                          <span className={`badge badge-${entry.status === 'sent' ? 'success' : 'danger'}`}>
                            {entry.status === 'sent' ? 'Envoye' : 'Erreur'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {entry.keyword_main && <span>{entry.keyword_main} · </span>}
                          {formatDate(entry.createdAt)}
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
                        style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                    {isOpen && (
                      <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px' }}>
                        {entry.error && (
                          <div style={{ background: 'var(--danger-soft)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '8px 12px', color: 'var(--danger)', fontSize: '12px', marginBottom: '12px' }}>
                            {entry.error}
                          </div>
                        )}
                        <pre style={{
                          fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)',
                          background: 'var(--bg)', borderRadius: '6px', padding: '12px',
                          overflowX: 'auto', maxHeight: '200px', overflowY: 'auto', lineHeight: '1.5',
                        }}>
                          {JSON.stringify(entry.payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
