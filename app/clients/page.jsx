'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', credits: 10, webhookUrl: '' })
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [search, setSearch] = useState('')
  const [provisioning, setProvisioning] = useState(null)

  async function load() {
    try {
      const res = await fetch('/api/clients')
      if (res.ok) setClients(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function resetForm() {
    setForm({ firstName: '', lastName: '', phone: '', credits: 10, webhookUrl: '' })
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(client) {
    setForm({
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      credits: client.credits,
      webhookUrl: client.webhookUrl || '',
    })
    setEditingId(client.id)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.firstName || !form.lastName) return
    setSaving(true)
    setAlert(null)
    try {
      if (editingId) {
        const res = await fetch('/api/clients', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...form }),
        })
        if (res.ok) {
          setAlert({ type: 'success', msg: 'Client mis a jour.' })
          resetForm()
          load()
        }
      } else {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (res.ok) {
          const client = await res.json()
          const provMsg = client.provisionError
            ? ` (Provisioning Make.com echoue: ${client.provisionError})`
            : client.makeWebhookUrl
              ? ' — Webhook Make.com cree automatiquement'
              : ''
          setAlert({ type: client.provisionError ? 'error' : 'success', msg: `Client cree ! Login: ${client.loginId} — Mot de passe: ${client.password}${provMsg}` })
          resetForm()
          load()
        }
      }
    } catch {
      setAlert({ type: 'error', msg: 'Erreur reseau.' })
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(client) {
    await fetch('/api/clients', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: client.id, active: !client.active }),
    })
    load()
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer ce client ?')) return
    await fetch('/api/clients', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    })
    load()
  }

  async function reprovision(clientId) {
    setProvisioning(clientId)
    try {
      const res = await fetch('/api/clients/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const data = await res.json()
      if (res.ok) {
        setAlert({ type: 'success', msg: 'Scenario Make.com provisionne avec succes !' })
        load()
      } else {
        setAlert({ type: 'error', msg: data.error || 'Erreur de provisioning' })
      }
    } catch {
      setAlert({ type: 'error', msg: 'Erreur reseau.' })
    } finally {
      setProvisioning(null)
    }
  }

  function copyToClipboard(text, id) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const portalBaseUrl = typeof window !== 'undefined' ? window.location.origin + '/portal/' : '/portal/'

  const filtered = clients.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (c.firstName + ' ' + c.lastName).toLowerCase().includes(q) ||
      c.loginId.toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Nav />
      <main style={{ flex: 1, marginLeft: '220px', padding: '32px', maxWidth: '1100px' }}>
        <div className="fade-in">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Clients</h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                {clients.length} client{clients.length !== 1 ? 's' : ''} enregistre{clients.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => { resetForm(); setShowForm(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nouveau client
            </button>
          </div>

          {/* Alert */}
          {alert && (
            <div style={{
              background: alert.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)',
              border: `1px solid ${alert.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              borderRadius: '8px', padding: '12px 14px', marginBottom: '16px',
              color: alert.type === 'success' ? 'var(--success)' : 'var(--danger)',
              fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>{alert.msg}</span>
              <button onClick={() => setAlert(null)} style={{ background: 'none', color: 'inherit', fontSize: '16px', padding: '0 4px' }}>&times;</button>
            </div>
          )}

          {/* Form */}
          {showForm && (
            <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
                {editingId ? 'Modifier le client' : 'Nouveau client'}
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="field">
                    <label className="label">Prenom *</label>
                    <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
                  </div>
                  <div className="field">
                    <label className="label">Nom *</label>
                    <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="field">
                    <label className="label">Telephone</label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+33 6 12 34 56 78" />
                  </div>
                  <div className="field">
                    <label className="label">Credits (articles)</label>
                    <input type="number" min="0" value={form.credits} onChange={e => setForm(f => ({ ...f, credits: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div className="field" style={{ marginBottom: '16px' }}>
                  <label className="label">URL Webhook Make.com (dedie au client)</label>
                  {editingId && clients.find(c => c.id === editingId)?.makeWebhookUrl ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <span className="badge badge-success" style={{ fontSize: '10px', marginRight: '8px' }}>Auto</span>
                      {clients.find(c => c.id === editingId).makeWebhookUrl}
                    </div>
                  ) : (
                    <input value={form.webhookUrl} onChange={e => setForm(f => ({ ...f, webhookUrl: e.target.value }))} placeholder="https://hook.eu2.make.com/..." />
                  )}
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {editingId ? 'Se remplit automatiquement via le provisioning Make.com' : 'Sera cree automatiquement si Make.com est configure'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Enregistrement...' : editingId ? 'Mettre a jour' : 'Creer le client'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>Annuler</button>
                </div>
              </form>
            </div>
          )}

          {/* Search */}
          <div style={{ marginBottom: '16px' }}>
            <input
              placeholder="Rechercher un client..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '280px' }}
            />
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                {search ? 'Aucun client trouve.' : 'Aucun client. Cliquez sur "Nouveau client" pour commencer.'}
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Telephone</th>
                    <th>Credits</th>
                    <th>Login ID</th>
                    <th>Mot de passe</th>
                    <th>URL portail</th>
                    <th>Make.com</th>
                    <th>Statut</th>
                    <th style={{ width: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(client => (
                    <tr key={client.id}>
                      <td>
                        <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                          {client.firstName} {client.lastName}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(client.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{client.phone || '—'}</td>
                      <td>
                        <span style={{
                          fontSize: '13px', fontWeight: '600',
                          color: (client.credits - client.creditsUsed) > 0 ? 'var(--success)' : 'var(--danger)',
                        }}>
                          {client.credits - client.creditsUsed}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}> / {client.credits}</span>
                      </td>
                      <td>
                        <button
                          onClick={() => copyToClipboard(client.loginId, 'login-' + client.id)}
                          className="btn btn-sm btn-secondary"
                          style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', padding: '3px 8px' }}
                        >
                          {copiedId === 'login-' + client.id ? 'Copie !' : client.loginId}
                        </button>
                      </td>
                      <td>
                        <button
                          onClick={() => copyToClipboard(client.password, 'pw-' + client.id)}
                          className="btn btn-sm btn-secondary"
                          style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', padding: '3px 8px' }}
                        >
                          {copiedId === 'pw-' + client.id ? 'Copie !' : '••••••••'}
                        </button>
                      </td>
                      <td>
                        <button
                          onClick={() => copyToClipboard(portalBaseUrl + client.loginId, 'url-' + client.id)}
                          className="btn btn-sm btn-secondary"
                          style={{ fontSize: '12px', padding: '3px 8px' }}
                        >
                          {copiedId === 'url-' + client.id ? 'Copie !' : 'Copier l\'URL'}
                        </button>
                      </td>
                      <td>
                        {client.makeWebhookUrl ? (
                          <button
                            onClick={() => copyToClipboard(client.makeWebhookUrl, 'wh-' + client.id)}
                            className="badge badge-success"
                            style={{ fontSize: '11px', cursor: 'pointer', border: 'none' }}
                            title={client.makeWebhookUrl}
                          >
                            {copiedId === 'wh-' + client.id ? 'Copie !' : 'Actif'}
                          </button>
                        ) : client.webhookUrl ? (
                          <button
                            onClick={() => copyToClipboard(client.webhookUrl, 'wh-' + client.id)}
                            className="badge badge-blue"
                            style={{ fontSize: '11px', cursor: 'pointer', border: 'none' }}
                            title={client.webhookUrl}
                          >
                            {copiedId === 'wh-' + client.id ? 'Copie !' : 'Manuel'}
                          </button>
                        ) : (
                          <button
                            onClick={() => reprovision(client.id)}
                            disabled={provisioning === client.id}
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: '11px', padding: '2px 8px', opacity: provisioning === client.id ? 0.5 : 1 }}
                          >
                            {provisioning === client.id ? '...' : 'Provisionner'}
                          </button>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => toggleActive(client)}
                          className={`badge ${client.active ? 'badge-success' : 'badge-muted'}`}
                          style={{ cursor: 'pointer', border: 'none', background: client.active ? 'var(--success-soft)' : 'var(--bg-surface)' }}
                        >
                          {client.active ? 'Actif' : 'Inactif'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => startEdit(client)}
                            className="btn btn-sm btn-secondary"
                            title="Modifier"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(client.id)}
                            className="btn btn-sm btn-danger"
                            title="Supprimer"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14H7L5 6"/>
                              <path d="M10 11v6"/><path d="M14 11v6"/>
                              <path d="M9 6V4h6v2"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
