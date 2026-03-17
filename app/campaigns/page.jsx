'use client'
import { useState, useEffect, useRef } from 'react'
import Nav from '@/components/Nav'

const BRANCHES = [
  { id: 'vitrine', label: 'Vitrine', icon: '🏪', color: 'blue' },
  { id: 'ecommerce', label: 'E-commerce', icon: '🛒', color: 'green' },
  { id: 'catalogue', label: 'Catalogue', icon: '📚', color: 'amber' },
]

const TONES = [
  { value: 'expert', label: 'Expert' },
  { value: 'accessible', label: 'Accessible' },
  { value: 'premium', label: 'Premium' },
  { value: 'direct', label: 'Direct' },
]

const STATUS_MAP = {
  draft: { label: 'Brouillon', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)' },
  queued: { label: 'En file', color: 'var(--warning)', bg: 'var(--warning-soft)' },
  processing: { label: 'En cours', color: 'var(--blue)', bg: 'var(--blue-soft)' },
  done: { label: 'Termine', color: 'var(--success)', bg: 'var(--success-soft)' },
  error: { label: 'Erreur', color: 'var(--danger)', bg: 'var(--danger-soft)' },
}

const EMPTY_INFO = {
  context: '', b2b_target: '', b2b_offer: '', b2b_value: '',
  b2c_target: '', b2c_experience: '', b2c_ambiance: '',
  personas: '', services: '',
  geo_location: '', geo_zone: '', geo_environment: '',
  style_approach: '', style_relation: '', style_objective: '',
  style_vocabulary: '', style_promises: '', style_structure: '',
  style_storytelling: '', style_engagement: '', style_verb_tense: '',
  reviews: '', extra_info: '',
}

const EMPTY_SEO = {
  category_title: '', h2_plan: '', status: '', links: '',
  catalogue_id: '', categories: '', location: '',
  keywords_data: '', serp_analysis: '', brief_seo: '',
  article_intro: '', article_part1: '', article_part2: '',
  article_part3: '', article_part4: '', article_part5: '',
  faq_html: '', image_prompts: '',
}

const EMPTY_ROW = {
  branch: 'vitrine', company: '', url: '', city: '', sector: '',
  keyword_main: '', keywords_sec: '', intent: '', h1: '',
  word_count: '1200', tone: 'expert', lang: 'fr', extra: '',
  product_name: '', product_price: '', product_ref: '',
  cat_product: '', cat_ref: '', cat_specs: '',
}

const EDIT_TABS = [
  { id: 'base', label: 'Base' },
  { id: 'info', label: 'Information' },
  { id: 'seo', label: 'SEO & Contenu' },
  { id: 'import', label: 'Import' },
]

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.draft
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '11px', fontWeight: '500', padding: '3px 8px',
      borderRadius: '20px', background: s.bg, color: s.color,
      whiteSpace: 'nowrap',
    }}>
      {status === 'processing' && (
        <svg className="spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      )}
      {s.label}
    </span>
  )
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [launching, setLaunching] = useState(false)
  const [autoMode, setAutoMode] = useState(false)
  const [autoInterval, setAutoInterval] = useState(15)
  const [alert, setAlert] = useState(null)
  const [editRow, setEditRow] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_ROW)
  const [editInfo, setEditInfo] = useState({ ...EMPTY_INFO })
  const [editSeo, setEditSeo] = useState({ ...EMPTY_SEO })
  const [editTab, setEditTab] = useState('base')
  const [importText, setImportText] = useState('')
  const autoRef = useRef(null)

  function showAlert(msg, type = 'success') {
    setAlert({ msg, type })
    setTimeout(() => setAlert(null), 5000)
  }

  // Load campaigns
  async function loadCampaigns() {
    try {
      const res = await fetch('/api/campaigns')
      const data = await res.json()
      setCampaigns(Array.isArray(data) ? data : [])
    } catch { setCampaigns([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadCampaigns() }, [])

  // Add new row
  async function addRow() {
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(EMPTY_ROW),
      })
      const data = await res.json()
      setCampaigns(prev => [...prev, data])
      setEditRow(data.id)
      setEditForm(EMPTY_ROW)
    } catch {
      showAlert('Erreur lors de l\'ajout', 'error')
    }
  }

  // Save row
  async function saveRow(id) {
    try {
      const data = { id, ...editForm, info: editInfo, seo: editSeo }
      await fetch('/api/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...editForm, info: editInfo, seo: editSeo } : c))
      setEditRow(null)
    } catch {
      showAlert('Erreur sauvegarde', 'error')
    }
  }

  // Delete selected
  async function deleteSelected() {
    if (!confirm(`Supprimer ${selected.size} ligne(s) ?`)) return
    const ids = [...selected]
    try {
      await fetch('/api/campaigns', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      setCampaigns(prev => prev.filter(c => !ids.includes(c.id)))
      setSelected(new Set())
    } catch {
      showAlert('Erreur suppression', 'error')
    }
  }

  // Launch single row
  async function launchRow(id) {
    setLaunching(true)
    try {
      const res = await fetch('/api/campaigns/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
      const data = await res.json()
      if (data.results) {
        setCampaigns(prev => prev.map(c => {
          const result = data.results.find(r => r.id === c.id)
          return result ? { ...c, status: result.status, error: result.error, launchedAt: result.launchedAt, completedAt: result.completedAt } : c
        }))
        const r = data.results[0]
        if (r.status === 'done') showAlert(`"${campaigns.find(c => c.id === id)?.company}" lance avec succes`)
        else showAlert(`Erreur: ${r.error}`, 'error')
      }
    } catch {
      showAlert('Erreur lancement', 'error')
    } finally {
      setLaunching(false)
    }
  }

  // Launch all queued
  async function launchQueued() {
    const queuedIds = campaigns.filter(c => c.status === 'queued').map(c => c.id)
    if (queuedIds.length === 0) {
      showAlert('Aucune campagne en file d\'attente', 'error')
      return
    }
    setLaunching(true)
    try {
      const res = await fetch('/api/campaigns/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: queuedIds }),
      })
      const data = await res.json()
      if (data.results) {
        setCampaigns(prev => prev.map(c => {
          const result = data.results.find(r => r.id === c.id)
          return result ? { ...c, ...result } : c
        }))
        const ok = data.results.filter(r => r.status === 'done').length
        const err = data.results.filter(r => r.status === 'error').length
        showAlert(`${ok} reussi(s), ${err} erreur(s)`, err > 0 ? 'error' : 'success')
      }
    } catch {
      showAlert('Erreur lancement', 'error')
    } finally {
      setLaunching(false)
    }
  }

  // Queue selected
  async function queueSelected() {
    const ids = [...selected]
    try {
      for (const id of ids) {
        await fetch('/api/campaigns', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: 'queued' }),
        })
      }
      setCampaigns(prev => prev.map(c => ids.includes(c.id) && (c.status === 'draft' || c.status === 'error') ? { ...c, status: 'queued' } : c))
      setSelected(new Set())
      showAlert(`${ids.length} campagne(s) mises en file d'attente`)
    } catch {
      showAlert('Erreur', 'error')
    }
  }

  // Auto-launch mode
  function toggleAutoMode() {
    if (autoMode) {
      clearInterval(autoRef.current)
      autoRef.current = null
      setAutoMode(false)
      showAlert('Mode automatique desactive')
    } else {
      setAutoMode(true)
      showAlert(`Mode automatique active : 1 lancement toutes les ${autoInterval} min`)
      autoLaunchNext()
      autoRef.current = setInterval(autoLaunchNext, autoInterval * 60 * 1000)
    }
  }

  async function autoLaunchNext() {
    // Reload fresh data then launch next queued
    try {
      const res = await fetch('/api/campaigns/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'next' }),
      })
      const data = await res.json()
      if (data.result) {
        setCampaigns(prev => prev.map(c =>
          c.id === data.result.id ? { ...c, ...data.result } : c
        ))
        if (data.result.status === 'done') {
          showAlert(`Auto: "${data.result.company}" lance avec succes`)
        } else if (data.result.status === 'error') {
          showAlert(`Auto: erreur pour "${data.result.company}"`, 'error')
        }
      } else if (data.message === 'no_queued') {
        showAlert('Auto: plus de campagnes en file, arret du mode auto')
        clearInterval(autoRef.current)
        setAutoMode(false)
      }
    } catch {
      showAlert('Auto: erreur reseau', 'error')
    }
    // Reload
    loadCampaigns()
  }

  // Cleanup
  useEffect(() => {
    return () => { if (autoRef.current) clearInterval(autoRef.current) }
  }, [])

  // Toggle select
  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === campaigns.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(campaigns.map(c => c.id)))
    }
  }

  // Start editing a row
  function startEdit(campaign) {
    setEditRow(campaign.id)
    setEditTab('base')
    setImportText('')
    setEditForm({
      branch: campaign.branch || 'vitrine',
      company: campaign.company || '',
      url: campaign.url || '',
      city: campaign.city || '',
      sector: campaign.sector || '',
      keyword_main: campaign.keyword_main || '',
      keywords_sec: campaign.keywords_sec || '',
      intent: campaign.intent || '',
      h1: campaign.h1 || '',
      word_count: campaign.word_count || '1200',
      tone: campaign.tone || 'expert',
      lang: campaign.lang || 'fr',
      extra: campaign.extra || '',
      product_name: campaign.product_name || '',
      product_price: campaign.product_price || '',
      product_ref: campaign.product_ref || '',
      cat_product: campaign.cat_product || '',
      cat_ref: campaign.cat_ref || '',
      cat_specs: campaign.cat_specs || '',
    })
    // Load info sub-object
    const ci = campaign.info || {}
    const loadedInfo = { ...EMPTY_INFO }
    for (const k of Object.keys(EMPTY_INFO)) {
      if (ci[k]) loadedInfo[k] = ci[k]
    }
    setEditInfo(loadedInfo)
    // Load seo sub-object
    const cs = campaign.seo || {}
    const loadedSeo = { ...EMPTY_SEO }
    for (const k of Object.keys(EMPTY_SEO)) {
      if (cs[k]) loadedSeo[k] = cs[k]
    }
    setEditSeo(loadedSeo)
  }

  // Import handler for campaign edit
  function handleCampaignImport() {
    if (!importText.trim()) return
    let parsed
    try {
      parsed = JSON.parse(importText)
      if (typeof parsed === 'object' && parsed !== null) {
        const baseKeys = Object.keys(EMPTY_ROW)
        const newForm = { ...editForm }
        for (const k of baseKeys) {
          if (parsed[k]) newForm[k] = parsed[k]
        }
        setEditForm(newForm)
        const infoSrc = parsed.info || parsed
        const newInfo = { ...editInfo }
        for (const k of Object.keys(EMPTY_INFO)) {
          if (infoSrc[k]) newInfo[k] = infoSrc[k]
        }
        setEditInfo(newInfo)
        const seoSrc = parsed.seo || parsed
        const newSeo = { ...editSeo }
        for (const k of Object.keys(EMPTY_SEO)) {
          if (seoSrc[k]) newSeo[k] = seoSrc[k]
        }
        setEditSeo(newSeo)
        showAlert('Import JSON reussi')
        return
      }
    } catch { /* not JSON */ }
    showAlert('Format non reconnu. Utilisez un JSON valide.', 'error')
  }

  const stats = {
    total: campaigns.length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    queued: campaigns.filter(c => c.status === 'queued').length,
    done: campaigns.filter(c => c.status === 'done').length,
    error: campaigns.filter(c => c.status === 'error').length,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Nav />
      <main style={{ flex: 1, marginLeft: '220px', padding: '32px' }}>
        <div className="fade-in">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '4px' }}>Campagnes</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Gerez vos generations de contenu en lot. Remplissez les lignes, mettez-les en file et lancez.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={addRow} className="btn btn-primary btn-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Ajouter une ligne
              </button>
            </div>
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

          {/* Stats bar */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>{stats.total} total</span>
            <span style={{ color: 'var(--text-muted)' }}>{stats.draft} brouillon(s)</span>
            <span style={{ color: 'var(--warning)' }}>{stats.queued} en file</span>
            <span style={{ color: 'var(--success)' }}>{stats.done} termine(s)</span>
            <span style={{ color: 'var(--danger)' }}>{stats.error} erreur(s)</span>
          </div>

          {/* Action bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
            flexWrap: 'wrap',
          }}>
            {selected.size > 0 && (
              <>
                <button onClick={queueSelected} className="btn btn-secondary btn-sm">
                  Mettre en file ({selected.size})
                </button>
                <button onClick={deleteSelected} className="btn btn-danger btn-sm">
                  Supprimer ({selected.size})
                </button>
                <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />
              </>
            )}
            <button
              onClick={launchQueued}
              disabled={launching || stats.queued === 0}
              className="btn btn-primary btn-sm"
            >
              {launching ? (
                <>
                  <svg className="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Lancement...
                </>
              ) : (
                <>Lancer la file ({stats.queued})</>
              )}
            </button>

            <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />

            {/* Auto mode */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={autoInterval}
                onChange={e => setAutoInterval(Number(e.target.value))}
                disabled={autoMode}
                style={{ width: '120px', fontSize: '12px', padding: '5px 8px' }}
              >
                <option value={5}>Toutes les 5 min</option>
                <option value={10}>Toutes les 10 min</option>
                <option value={15}>Toutes les 15 min</option>
                <option value={30}>Toutes les 30 min</option>
              </select>
              <button
                onClick={toggleAutoMode}
                className={`btn btn-sm ${autoMode ? 'btn-danger' : 'btn-success'}`}
              >
                {autoMode ? (
                  <>
                    <svg className="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Arreter l'auto
                  </>
                ) : 'Mode auto'}
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Chargement...</div>
          ) : campaigns.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Aucune campagne. Ajoutez votre premiere ligne.</p>
              <button onClick={addRow} className="btn btn-primary">Ajouter une ligne</button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={selected.size === campaigns.length && campaigns.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>Statut</th>
                    <th>Branche</th>
                    <th>Entreprise</th>
                    <th>URL</th>
                    <th>Mot-cle</th>
                    <th>Ville</th>
                    <th>Ton</th>
                    <th>Mots</th>
                    <th style={{ width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => {
                    const isEditing = editRow === c.id
                    const branchInfo = BRANCHES.find(b => b.id === (isEditing ? editForm.branch : c.branch)) || BRANCHES[0]

                    if (isEditing) {
                      return (
                        <tr key={c.id} style={{ background: 'var(--bg-card)' }}>
                          <td>
                            <input type="checkbox" className="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} />
                          </td>
                          <td><StatusBadge status={c.status} /></td>
                          <td>
                            <select value={editForm.branch} onChange={e => setEditForm(f => ({ ...f, branch: e.target.value }))}>
                              {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.icon} {b.label}</option>)}
                            </select>
                          </td>
                          <td><input value={editForm.company} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))} placeholder="Entreprise" /></td>
                          <td><input value={editForm.url} onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))} placeholder="URL cible" /></td>
                          <td><input value={editForm.keyword_main} onChange={e => setEditForm(f => ({ ...f, keyword_main: e.target.value }))} placeholder="Mot-cle principal" /></td>
                          <td><input value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} placeholder="Ville" /></td>
                          <td>
                            <select value={editForm.tone} onChange={e => setEditForm(f => ({ ...f, tone: e.target.value }))}>
                              {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </td>
                          <td>
                            <select value={editForm.word_count} onChange={e => setEditForm(f => ({ ...f, word_count: e.target.value }))}>
                              <option value="800">800</option>
                              <option value="1200">1200</option>
                              <option value="1500">1500</option>
                              <option value="2000">2000</option>
                            </select>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => saveRow(c.id)} className="btn btn-primary btn-sm" style={{ padding: '4px 8px' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                              </button>
                              <button onClick={() => setEditRow(null)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    }

                    return (
                      <tr key={c.id}>
                        <td>
                          <input type="checkbox" className="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} />
                        </td>
                        <td><StatusBadge status={c.status} /></td>
                        <td>
                          <span style={{ fontSize: '14px' }}>{branchInfo.icon}</span>
                          <span style={{ marginLeft: '4px', fontSize: '12px' }}>{branchInfo.label}</span>
                        </td>
                        <td style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{c.company || '—'}</td>
                        <td style={{ fontSize: '12px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.url || '—'}
                        </td>
                        <td>{c.keyword_main || '—'}</td>
                        <td>{c.city || '—'}</td>
                        <td style={{ fontSize: '12px' }}>{c.tone || '—'}</td>
                        <td style={{ fontSize: '12px' }}>{c.word_count || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {(c.status === 'draft' || c.status === 'error') && (
                              <button onClick={() => startEdit(c)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }} title="Modifier">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                            )}
                            {(c.status === 'draft' || c.status === 'queued' || c.status === 'error') && (
                              <button
                                onClick={() => launchRow(c.id)}
                                disabled={launching || !c.company || !c.url || !c.keyword_main}
                                className="btn btn-primary btn-sm"
                                style={{ padding: '4px 8px' }}
                                title="Lancer"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                                </svg>
                              </button>
                            )}
                            {c.status === 'done' && (
                              <span style={{ fontSize: '11px', color: 'var(--success)' }}>OK</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Expanded edit panel with tabs */}
          {editRow && (
            <div className="card fade-in" style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div className="section-title" style={{ marginBottom: 0 }}>Edition enrichie</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => saveRow(editRow)} className="btn btn-primary btn-sm">Sauvegarder</button>
                  <button onClick={() => setEditRow(null)} className="btn btn-secondary btn-sm">Fermer</button>
                </div>
              </div>

              {/* Edit tabs */}
              <div className="tabs" style={{ marginBottom: '16px' }}>
                {EDIT_TABS.map(t => (
                  <button key={t.id} className={`tab ${editTab === t.id ? 'tab-active' : ''}`} onClick={() => setEditTab(t.id)}>
                    {t.label}
                    {t.id === 'info' && Object.values(editInfo).some(Boolean) && <span className="badge badge-blue" style={{ marginLeft: '4px', fontSize: '9px', padding: '1px 5px' }}>*</span>}
                    {t.id === 'seo' && Object.values(editSeo).some(Boolean) && <span className="badge badge-green" style={{ marginLeft: '4px', fontSize: '9px', padding: '1px 5px' }}>*</span>}
                  </button>
                ))}
              </div>

              {/* Tab: Base */}
              {editTab === 'base' && (
                <div className="fade-in">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div className="field">
                      <label className="label">Secteur</label>
                      <input value={editForm.sector} onChange={e => setEditForm(f => ({ ...f, sector: e.target.value }))} placeholder="ex: Carrelage" />
                    </div>
                    <div className="field">
                      <label className="label">Mots-cles secondaires</label>
                      <input value={editForm.keywords_sec} onChange={e => setEditForm(f => ({ ...f, keywords_sec: e.target.value }))} placeholder="separes par des virgules" />
                    </div>
                    <div className="field">
                      <label className="label">Intention SEO</label>
                      <input value={editForm.intent} onChange={e => setEditForm(f => ({ ...f, intent: e.target.value }))} placeholder="But de la page" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div className="field">
                      <label className="label">H1 suggere</label>
                      <input value={editForm.h1} onChange={e => setEditForm(f => ({ ...f, h1: e.target.value }))} placeholder="Titre H1" />
                    </div>
                    <div className="field">
                      <label className="label">Langue</label>
                      <select value={editForm.lang} onChange={e => setEditForm(f => ({ ...f, lang: e.target.value }))}>
                        <option value="fr">Francais</option>
                        <option value="en">Anglais</option>
                        <option value="es">Espagnol</option>
                      </select>
                    </div>
                  </div>
                  <div className="field" style={{ marginBottom: '12px' }}>
                    <label className="label">Description</label>
                    <textarea value={editForm.extra} onChange={e => setEditForm(f => ({ ...f, extra: e.target.value }))} placeholder="Instructions specifiques..." style={{ minHeight: '60px' }} />
                  </div>
                  {editForm.branch === 'ecommerce' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <div className="field"><label className="label">Nom produit</label><input value={editForm.product_name} onChange={e => setEditForm(f => ({ ...f, product_name: e.target.value }))} /></div>
                      <div className="field"><label className="label">Prix</label><input value={editForm.product_price} onChange={e => setEditForm(f => ({ ...f, product_price: e.target.value }))} /></div>
                      <div className="field"><label className="label">Reference</label><input value={editForm.product_ref} onChange={e => setEditForm(f => ({ ...f, product_ref: e.target.value }))} /></div>
                    </div>
                  )}
                  {editForm.branch === 'catalogue' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="field"><label className="label">Produit catalogue</label><input value={editForm.cat_product} onChange={e => setEditForm(f => ({ ...f, cat_product: e.target.value }))} /></div>
                      <div className="field"><label className="label">Ref catalogue</label><input value={editForm.cat_ref} onChange={e => setEditForm(f => ({ ...f, cat_ref: e.target.value }))} /></div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Information */}
              {editTab === 'info' && (
                <div className="fade-in">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div className="field">
                      <label className="label">Contexte entreprise</label>
                      <textarea value={editInfo.context} onChange={e => setEditInfo(f => ({ ...f, context: e.target.value }))} placeholder="Presentation, anciennete, positionnement..." style={{ minHeight: '80px' }} />
                    </div>
                    <div className="field">
                      <label className="label">Infos supplementaires</label>
                      <textarea value={editInfo.extra_info} onChange={e => setEditInfo(f => ({ ...f, extra_info: e.target.value }))} placeholder="Labels, certifications..." style={{ minHeight: '80px' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div className="field">
                      <label className="label">Cibles B2B</label>
                      <textarea value={editInfo.b2b_target} onChange={e => setEditInfo(f => ({ ...f, b2b_target: e.target.value }))} style={{ minHeight: '50px' }} />
                    </div>
                    <div className="field">
                      <label className="label">Offre B2B</label>
                      <textarea value={editInfo.b2b_offer} onChange={e => setEditInfo(f => ({ ...f, b2b_offer: e.target.value }))} style={{ minHeight: '50px' }} />
                    </div>
                    <div className="field">
                      <label className="label">Valeur ajoutee B2B</label>
                      <textarea value={editInfo.b2b_value} onChange={e => setEditInfo(f => ({ ...f, b2b_value: e.target.value }))} style={{ minHeight: '50px' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div className="field">
                      <label className="label">Public B2C</label>
                      <textarea value={editInfo.b2c_target} onChange={e => setEditInfo(f => ({ ...f, b2c_target: e.target.value }))} style={{ minHeight: '50px' }} />
                    </div>
                    <div className="field">
                      <label className="label">Experience client</label>
                      <textarea value={editInfo.b2c_experience} onChange={e => setEditInfo(f => ({ ...f, b2c_experience: e.target.value }))} style={{ minHeight: '50px' }} />
                    </div>
                    <div className="field">
                      <label className="label">Ambiance</label>
                      <textarea value={editInfo.b2c_ambiance} onChange={e => setEditInfo(f => ({ ...f, b2c_ambiance: e.target.value }))} style={{ minHeight: '50px' }} />
                    </div>
                  </div>
                  <div className="field" style={{ marginBottom: '12px' }}>
                    <label className="label">Personas</label>
                    <textarea value={editInfo.personas} onChange={e => setEditInfo(f => ({ ...f, personas: e.target.value }))} placeholder="Persona 1: Claire, 48 ans..." style={{ minHeight: '80px' }} />
                  </div>
                  <div className="field" style={{ marginBottom: '12px' }}>
                    <label className="label">Services</label>
                    <textarea value={editInfo.services} onChange={e => setEditInfo(f => ({ ...f, services: e.target.value }))} style={{ minHeight: '60px' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div className="field"><label className="label">Implantation</label><textarea value={editInfo.geo_location} onChange={e => setEditInfo(f => ({ ...f, geo_location: e.target.value }))} style={{ minHeight: '50px' }} /></div>
                    <div className="field"><label className="label">Zone chalandise</label><textarea value={editInfo.geo_zone} onChange={e => setEditInfo(f => ({ ...f, geo_zone: e.target.value }))} style={{ minHeight: '50px' }} /></div>
                    <div className="field"><label className="label">Environnement</label><textarea value={editInfo.geo_environment} onChange={e => setEditInfo(f => ({ ...f, geo_environment: e.target.value }))} style={{ minHeight: '50px' }} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div className="field"><label className="label">Style redactionnel</label><textarea value={editInfo.style_approach} onChange={e => setEditInfo(f => ({ ...f, style_approach: e.target.value }))} style={{ minHeight: '50px' }} /></div>
                    <div className="field"><label className="label">Vocabulaire</label><textarea value={editInfo.style_vocabulary} onChange={e => setEditInfo(f => ({ ...f, style_vocabulary: e.target.value }))} style={{ minHeight: '50px' }} /></div>
                  </div>
                  <div className="field">
                    <label className="label">Avis clients</label>
                    <textarea value={editInfo.reviews} onChange={e => setEditInfo(f => ({ ...f, reviews: e.target.value }))} style={{ minHeight: '40px' }} />
                  </div>
                </div>
              )}

              {/* Tab: SEO & Contenu */}
              {editTab === 'seo' && (
                <div className="fade-in">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div className="field"><label className="label">Categorie</label><input value={editSeo.category_title} onChange={e => setEditSeo(f => ({ ...f, category_title: e.target.value }))} /></div>
                    <div className="field"><label className="label">Statut</label><input value={editSeo.status} onChange={e => setEditSeo(f => ({ ...f, status: e.target.value }))} /></div>
                    <div className="field"><label className="label">Location</label><input value={editSeo.location} onChange={e => setEditSeo(f => ({ ...f, location: e.target.value }))} /></div>
                  </div>
                  <div className="field" style={{ marginBottom: '12px' }}>
                    <label className="label">Plan H2</label>
                    <textarea value={editSeo.h2_plan} onChange={e => setEditSeo(f => ({ ...f, h2_plan: e.target.value }))} placeholder="H2-1 : ... H2-2 : ..." style={{ minHeight: '80px' }} />
                  </div>
                  <div className="field" style={{ marginBottom: '12px' }}>
                    <label className="label">Keywords (volumes, competition)</label>
                    <textarea value={editSeo.keywords_data} onChange={e => setEditSeo(f => ({ ...f, keywords_data: e.target.value }))} className="import-area" style={{ minHeight: '80px' }} />
                  </div>
                  <div className="field" style={{ marginBottom: '12px' }}>
                    <label className="label">Brief SEO</label>
                    <textarea value={editSeo.brief_seo} onChange={e => setEditSeo(f => ({ ...f, brief_seo: e.target.value }))} className="import-area" style={{ minHeight: '100px' }} />
                  </div>
                  <div className="field" style={{ marginBottom: '12px' }}>
                    <label className="label">Introduction</label>
                    <textarea value={editSeo.article_intro} onChange={e => setEditSeo(f => ({ ...f, article_intro: e.target.value }))} style={{ minHeight: '60px' }} />
                  </div>
                  {[1, 2, 3, 4, 5].map(n => (
                    <div key={n} className="field" style={{ marginBottom: '12px' }}>
                      <label className="label">Partie {n}</label>
                      <textarea value={editSeo[`article_part${n}`]} onChange={e => setEditSeo(f => ({ ...f, [`article_part${n}`]: e.target.value }))} style={{ minHeight: '60px' }} />
                    </div>
                  ))}
                  <div className="field" style={{ marginBottom: '12px' }}>
                    <label className="label">FAQ HTML</label>
                    <textarea value={editSeo.faq_html} onChange={e => setEditSeo(f => ({ ...f, faq_html: e.target.value }))} className="import-area" style={{ minHeight: '80px' }} />
                  </div>
                  <div className="field">
                    <label className="label">Prompts image</label>
                    <textarea value={editSeo.image_prompts} onChange={e => setEditSeo(f => ({ ...f, image_prompts: e.target.value }))} style={{ minHeight: '50px' }} />
                  </div>
                </div>
              )}

              {/* Tab: Import */}
              {editTab === 'import' && (
                <div className="fade-in">
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    Collez un brief au format JSON pour remplir automatiquement tous les champs.
                  </p>
                  <textarea
                    className="import-area"
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder="Collez votre JSON ici..."
                    style={{ minHeight: '200px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button onClick={handleCampaignImport} className="btn btn-primary btn-sm" disabled={!importText.trim()}>
                      Parser et remplir
                    </button>
                    <button onClick={() => setImportText('')} className="btn btn-secondary btn-sm">Vider</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
