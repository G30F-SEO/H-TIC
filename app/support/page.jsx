'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'

const STATUS_MAP = {
  open: { label: 'Ouvert', color: 'var(--warning)', bg: 'var(--warning-soft)' },
  answered: { label: 'Repondu', color: 'var(--success)', bg: 'var(--success-soft)' },
  closed: { label: 'Ferme', color: 'var(--text-muted)', bg: 'var(--border)' },
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadTickets()
  }, [])

  async function loadTickets() {
    setLoading(true)
    try {
      const res = await fetch('/api/tickets')
      const data = await res.json()
      setTickets(Array.isArray(data) ? data : [])
    } catch { setTickets([]) }
    finally { setLoading(false) }
  }

  async function sendReply(ticketId) {
    if (!reply.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/tickets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ticketId, message: reply.trim() }),
      })
      if (res.ok) {
        const updated = await res.json()
        setTickets(prev => prev.map(t => t.id === ticketId ? updated : t))
        setReply('')
      }
    } catch {}
    finally { setSending(false) }
  }

  async function changeStatus(ticketId, status) {
    const res = await fetch('/api/tickets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ticketId, status }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTickets(prev => prev.map(t => t.id === ticketId ? updated : t))
    }
  }

  async function deleteTicket(ticketId) {
    if (!confirm('Supprimer ce ticket ?')) return
    const res = await fetch('/api/tickets', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [ticketId] }),
    })
    if (res.ok) {
      setTickets(prev => prev.filter(t => t.id !== ticketId))
      if (expanded === ticketId) setExpanded(null)
    }
  }

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter)

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    answered: tickets.filter(t => t.status === 'answered').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Nav />
      <main style={{ flex: 1, marginLeft: '220px', padding: '32px', maxWidth: '920px' }}>
        <div className="fade-in">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '4px' }}>Tickets Support</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Gerez les demandes de vos clients.
              </p>
            </div>
            <button onClick={loadTickets} className="btn btn-secondary btn-sm">Actualiser</button>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: 'Total', value: stats.total, color: 'var(--text-primary)' },
              { label: 'Ouverts', value: stats.open, color: 'var(--warning)' },
              { label: 'Repondus', value: stats.answered, color: 'var(--success)' },
              { label: 'Fermes', value: stats.closed, color: 'var(--text-muted)' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '14px',
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
            {[
              { id: 'all', label: 'Tout' },
              { id: 'open', label: 'Ouverts' },
              { id: 'answered', label: 'Repondus' },
              { id: 'closed', label: 'Fermes' },
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

          {/* Tickets list */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              Aucun ticket.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filtered.map(ticket => {
                const isOpen = expanded === ticket.id
                const status = STATUS_MAP[ticket.status] || STATUS_MAP.open
                return (
                  <div key={ticket.id} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: '10px', overflow: 'hidden',
                  }}>
                    {/* Header */}
                    <button
                      onClick={() => { setExpanded(isOpen ? null : ticket.id); setReply('') }}
                      style={{
                        width: '100%', padding: '14px 16px', display: 'flex',
                        alignItems: 'center', gap: '12px', background: 'none',
                        color: 'var(--text-primary)', textAlign: 'left',
                      }}
                    >
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: status.color, flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontWeight: '500', fontSize: '14px' }}>{ticket.subject}</span>
                          <span style={{
                            fontSize: '11px', fontWeight: '500', padding: '2px 8px',
                            borderRadius: '20px', background: status.bg, color: status.color,
                          }}>
                            {status.label}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          <span style={{ fontWeight: '500' }}>{ticket.clientName}</span>
                          {' '}&middot;{' '}{ticket.messages?.length || 0} message{(ticket.messages?.length || 0) !== 1 ? 's' : ''}
                          {' '}&middot;{' '}{formatDate(ticket.updatedAt || ticket.createdAt)}
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
                        style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>

                    {/* Detail */}
                    {isOpen && (
                      <div style={{ borderTop: '1px solid var(--border)', padding: '16px' }}>
                        {/* Messages */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                          {(ticket.messages || []).map((msg, i) => (
                            <div key={i} style={{
                              padding: '12px 14px', borderRadius: '8px',
                              background: msg.from === 'client' ? 'var(--bg)' : 'var(--accent-soft)',
                              borderLeft: `3px solid ${msg.from === 'client' ? 'var(--warning)' : 'var(--accent)'}`,
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{
                                  fontSize: '11px', fontWeight: '600',
                                  color: msg.from === 'client' ? 'var(--warning)' : 'var(--accent)',
                                  textTransform: 'uppercase', letterSpacing: '0.05em',
                                }}>
                                  {msg.from === 'client' ? ticket.clientName : 'H-TIC (Admin)'}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(msg.at)}</span>
                              </div>
                              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                {msg.text}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Reply form */}
                        {ticket.status !== 'closed' && (
                          <div style={{ marginBottom: '12px' }}>
                            <textarea
                              value={reply}
                              onChange={e => setReply(e.target.value)}
                              placeholder="Ecrivez votre reponse..."
                              style={{ minHeight: '80px', marginBottom: '8px' }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => sendReply(ticket.id)}
                                disabled={sending || !reply.trim()}
                                className="btn btn-primary btn-sm"
                              >
                                {sending ? 'Envoi...' : 'Repondre'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                          {ticket.status !== 'closed' && (
                            <button onClick={() => changeStatus(ticket.id, 'closed')} className="btn btn-secondary btn-sm">
                              Fermer le ticket
                            </button>
                          )}
                          {ticket.status === 'closed' && (
                            <button onClick={() => changeStatus(ticket.id, 'open')} className="btn btn-secondary btn-sm">
                              Reouvrir
                            </button>
                          )}
                          <button onClick={() => deleteTicket(ticket.id)} className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }}>
                            Supprimer
                          </button>
                        </div>
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
