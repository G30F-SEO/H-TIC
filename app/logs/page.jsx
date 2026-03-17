'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'

const LEVEL_STYLES = {
  info: { color: 'var(--blue)', bg: 'var(--blue-soft)', label: 'INFO' },
  warn: { color: 'var(--warning)', bg: 'var(--warning-soft)', label: 'WARN' },
  error: { color: 'var(--danger)', bg: 'var(--danger-soft)', label: 'ERREUR' },
  success: { color: 'var(--success)', bg: 'var(--success-soft)', label: 'OK' },
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default function LogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)

  async function loadLogs() {
    setLoading(true)
    try {
      const res = await fetch('/api/logs')
      const data = await res.json()
      setLogs(Array.isArray(data) ? data : [])
    } catch { setLogs([]) }
    finally { setLoading(false) }
  }

  async function clearAll() {
    if (!confirm('Vider tous les logs ?')) return
    await fetch('/api/logs', { method: 'DELETE' })
    setLogs([])
  }

  useEffect(() => { loadLogs() }, [])

  const filtered = filter === 'all' ? logs : logs.filter(l => l.level === filter)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Nav />
      <main style={{ flex: 1, marginLeft: '220px', padding: '32px', maxWidth: '900px' }}>
        <div className="fade-in">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '4px' }}>Logs</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Journal des evenements et erreurs de l'application.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={loadLogs} className="btn btn-secondary btn-sm">Actualiser</button>
              {logs.length > 0 && (
                <button onClick={clearAll} className="btn btn-danger btn-sm">Vider les logs</button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
            {[
              { id: 'all', label: 'Tout' },
              { id: 'success', label: 'Succes' },
              { id: 'info', label: 'Info' },
              { id: 'warn', label: 'Warning' },
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

          {/* Stats */}
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            {logs.length} log(s) total — {logs.filter(l => l.level === 'error').length} erreur(s)
          </div>

          {/* Log entries */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              Aucun log.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filtered.map(log => {
                const style = LEVEL_STYLES[log.level] || LEVEL_STYLES.info
                const hasMeta = log.meta && Object.keys(log.meta).length > 0
                const isOpen = expanded === log.id

                return (
                  <div key={log.id} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: '8px', overflow: 'hidden',
                  }}>
                    <div
                      onClick={() => hasMeta && setExpanded(isOpen ? null : log.id)}
                      style={{
                        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px',
                        cursor: hasMeta ? 'pointer' : 'default',
                      }}
                    >
                      <span style={{
                        fontSize: '10px', fontWeight: '600', padding: '2px 6px',
                        borderRadius: '4px', background: style.bg, color: style.color,
                        fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
                        minWidth: '52px', textAlign: 'center',
                      }}>
                        {style.label}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {formatDate(log.timestamp)}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', flex: 1 }}>
                        {log.message}
                      </span>
                      {hasMeta && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
                          style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      )}
                    </div>
                    {isOpen && hasMeta && (
                      <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px' }}>
                        <pre style={{
                          fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)',
                          background: 'var(--bg)', borderRadius: '6px', padding: '10px',
                          overflowX: 'auto', lineHeight: '1.5',
                        }}>
                          {JSON.stringify(log.meta, null, 2)}
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
