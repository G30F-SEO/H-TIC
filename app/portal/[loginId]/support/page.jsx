'use client'
import { useState, useEffect } from 'react'
import ClientNav from '@/components/ClientNav'

const STATUS_MAP = {
  open: { label: 'Ouvert', color: 'var(--warning)', bg: 'var(--warning-soft)' },
  answered: { label: 'Repondu', color: 'var(--success)', bg: 'var(--success-soft)' },
  closed: { label: 'Ferme', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)' },
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function PortalSupportPage() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    fetch('/api/portal/tickets')
      .then(r => r.ok ? r.json() : [])
      .then(data => setTickets(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/portal/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      })
      if (res.ok) {
        const ticket = await res.json()
        setTickets(prev => [ticket, ...prev])
        setSubject('')
        setMessage('')
        setShowForm(false)
        setAlert({ type: 'success', msg: 'Ticket envoye avec succes.' })
        setTimeout(() => setAlert(null), 4000)
      } else {
        setAlert({ type: 'error', msg: 'Erreur lors de l\'envoi.' })
        setTimeout(() => setAlert(null), 4000)
      }
    } catch {
      setAlert({ type: 'error', msg: 'Erreur reseau.' })
      setTimeout(() => setAlert(null), 4000)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <ClientNav />
      <main style={{ flex: 1, marginLeft: '220px', padding: '32px', maxWidth: '920px' }}>
        <div className="fade-in">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '4px' }}>Support</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Contactez l'equipe H-TIC pour toute question ou demande.
              </p>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nouveau ticket
            </button>
          </div>

          {/* Alert */}
          {alert && (
            <div className="fade-in" style={{
              padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px',
              background: alert.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)',
              border: `1px solid ${alert.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              color: alert.type === 'success' ? 'var(--success)' : 'var(--danger)',
            }}>
              {alert.msg}
            </div>
          )}

          {/* New ticket form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="card fade-in" style={{ marginBottom: '20px' }}>
              <div className="section-title">Nouveau ticket</div>
              <div className="field" style={{ marginBottom: '12px' }}>
                <label className="label">Sujet <span className="required">*</span></label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="ex : Probleme de generation, question sur les credits..."
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: '16px' }}>
                <label className="label">Message <span className="required">*</span></label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Decrivez votre demande..."
                  style={{ minHeight: '120px' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" disabled={sending || !subject.trim() || !message.trim()} className="btn btn-primary">
                  {sending ? (
                    <><svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Envoi...</>
                  ) : 'Envoyer'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Annuler</button>
              </div>
            </form>
          )}

          {/* Tickets list */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Chargement...</div>
          ) : tickets.length === 0 && !showForm ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '14px' }}>Aucun ticket pour le moment.</p>
              <button onClick={() => setShowForm(true)} className="btn btn-primary">Creer un ticket</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tickets.map(ticket => {
                const isOpen = expanded === ticket.id
                const status = STATUS_MAP[ticket.status] || STATUS_MAP.open
                return (
                  <div key={ticket.id} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: '10px', overflow: 'hidden',
                  }}>
                    <button
                      onClick={() => setExpanded(isOpen ? null : ticket.id)}
                      style={{
                        width: '100%', padding: '14px 16px', display: 'flex',
                        alignItems: 'center', gap: '12px', background: 'none',
                        color: 'var(--text-primary)', textAlign: 'left',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={status.color} strokeWidth="2" style={{ flexShrink: 0 }}>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
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
                          {ticket.messages?.length || 0} message{(ticket.messages?.length || 0) !== 1 ? 's' : ''} · {formatDate(ticket.createdAt)}
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
                        style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                    {isOpen && (
                      <div style={{ borderTop: '1px solid var(--border)', padding: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {(ticket.messages || []).map((msg, i) => (
                            <div key={i} style={{
                              padding: '12px 14px', borderRadius: '8px',
                              background: msg.from === 'client' ? 'var(--accent-soft)' : 'var(--bg)',
                              borderLeft: `3px solid ${msg.from === 'client' ? 'var(--accent)' : 'var(--success)'}`,
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '600', color: msg.from === 'client' ? 'var(--accent)' : 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  {msg.from === 'client' ? 'Vous' : 'H-TIC'}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(msg.at)}</span>
                              </div>
                              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                {msg.text}
                              </p>
                            </div>
                          ))}
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
