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
  context: '', extra_info: '',
  b2b_target: '', b2b_offer: '', b2b_value: '',
  b2c_target: '', b2c_experience: '', b2c_ambiance: '',
  personas: '', services: '',
  geo_location: '', geo_zone: '', geo_environment: '',
  style_approach: '', style_relation: '', style_objective: '',
  style_vocabulary: '', style_promises: '', style_structure: '',
  style_storytelling: '', style_engagement: '', style_verb_tense: '',
  reviews: '',
}

const EMPTY_LINE = {
  url: '', city: '', keyword_main: '', keywords_sec: '',
  intent: '', h1: '', extra: '',
  product_name: '', product_price: '', product_ref: '',
  cat_product: '', cat_ref: '', cat_specs: '',
}

const INFO_TABS = [
  { id: 'info', label: 'Information' },
  { id: 'import', label: 'Import JSON' },
]

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.draft
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '11px', fontWeight: '500', padding: '3px 8px',
      borderRadius: '20px', background: s.bg, color: s.color, whiteSpace: 'nowrap',
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

// =====================
// PHASE 1: Campaign list
// =====================
function CampaignList({ campaigns, onSelect, onCreateNew, loading }) {
  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Chargement...</div>

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '4px' }}>Campagnes</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Creez une campagne, definissez la base de redaction, puis ajoutez vos lignes.
          </p>
        </div>
        <button onClick={onCreateNew} className="btn btn-primary btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nouvelle campagne
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Aucune campagne. Creez votre premiere.</p>
          <button onClick={onCreateNew} className="btn btn-primary">Creer une campagne</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {campaigns.map(camp => {
            const branchInfo = BRANCHES.find(b => b.id === camp.branch) || BRANCHES[0]
            const lineCount = (camp.lines || []).length
            const doneCount = (camp.lines || []).filter(l => l.status === 'done').length
            const errorCount = (camp.lines || []).filter(l => l.status === 'error').length
            const queuedCount = (camp.lines || []).filter(l => l.status === 'queued').length
            const infoFilled = Object.values(camp.info || {}).filter(Boolean).length

            return (
              <div
                key={camp.id}
                className="card"
                onClick={() => onSelect(camp)}
                style={{ cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' }}
                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                onMouseOut={e => e.currentTarget.style.borderColor = ''}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '22px' }}>{branchInfo.icon}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {camp.name || 'Sans nom'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {branchInfo.label} · {camp.sector || '—'} · {lineCount} ligne{lineCount !== 1 ? 's' : ''}
                        {infoFilled > 0 && <span style={{ color: 'var(--accent)' }}> · {infoFilled} champs info</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {doneCount > 0 && <span className="badge badge-green">{doneCount} OK</span>}
                    {queuedCount > 0 && <span className="badge badge-amber">{queuedCount} en file</span>}
                    {errorCount > 0 && <span className="badge badge-danger">{errorCount} err</span>}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ==================================
// PHASE 2: Campaign detail (info + lines)
// ==================================
function CampaignDetail({ campaign: initialCampaign, onBack, onUpdate, showAlert }) {
  const [campaign, setCampaign] = useState(initialCampaign)
  const [phase, setPhase] = useState('info') // 'info' or 'lines'
  const [infoTab, setInfoTab] = useState('info')
  const [info, setInfo] = useState({ ...EMPTY_INFO, ...(initialCampaign.info || {}) })
  const [meta, setMeta] = useState({
    name: initialCampaign.name || '',
    branch: initialCampaign.branch || 'vitrine',
    sector: initialCampaign.sector || '',
    tone: initialCampaign.tone || 'expert',
    word_count: initialCampaign.word_count || '1200',
    lang: initialCampaign.lang || 'fr',
    description: initialCampaign.description || '',
  })
  const [importText, setImportText] = useState('')
  const [saving, setSaving] = useState(false)
  const [lines, setLines] = useState(initialCampaign.lines || [])
  const [selected, setSelected] = useState(new Set())
  const [editLine, setEditLine] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_LINE)
  const [launching, setLaunching] = useState(false)
  const [autoMode, setAutoMode] = useState(false)
  const [autoInterval, setAutoInterval] = useState(15)
  const autoRef = useRef(null)
  const editPanelRef = useRef(null)

  const handleI = (k) => (e) => setInfo(f => ({ ...f, [k]: e.target.value }))
  const handleM = (k) => (e) => setMeta(f => ({ ...f, [k]: e.target.value }))

  // Save campaign info
  async function saveInfo() {
    setSaving(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: campaign.id, ...meta, info }),
      })
      const updated = await res.json()
      setCampaign(updated)
      onUpdate(updated)
      showAlert('Base de redaction sauvegardee')
    } catch {
      showAlert('Erreur sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Import JSON
  function handleImport() {
    if (!importText.trim()) return
    try {
      const parsed = JSON.parse(importText)
      if (typeof parsed !== 'object' || parsed === null) throw new Error()

      // Map meta fields
      const metaKeys = ['name', 'branch', 'sector', 'tone', 'word_count', 'lang', 'description']
      const altKeys = { company: 'name' }
      const newMeta = { ...meta }
      for (const [k, v] of Object.entries(parsed)) {
        const mapped = altKeys[k] || k
        if (metaKeys.includes(mapped) && v) newMeta[mapped] = v
      }
      setMeta(newMeta)

      // Map info fields
      const infoSrc = parsed.info || parsed
      const newInfo = { ...info }
      for (const k of Object.keys(EMPTY_INFO)) {
        if (infoSrc[k]) newInfo[k] = infoSrc[k]
      }
      setInfo(newInfo)

      // Import lines if present
      if (Array.isArray(parsed.lines)) {
        showAlert(`Import reussi — ${Object.values(newInfo).filter(Boolean).length} champs info + ${parsed.lines.length} lignes detectees`)
      } else {
        showAlert(`Import reussi — ${Object.values(newInfo).filter(Boolean).length} champs info detectes`)
      }
    } catch {
      showAlert('JSON invalide', 'error')
    }
  }

  // --- Lines management ---
  async function addNewLine() {
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(EMPTY_LINE),
      })
      const line = await res.json()
      setLines(prev => [...prev, line])
      startEditLine(line)
    } catch {
      showAlert('Erreur ajout ligne', 'error')
    }
  }

  function startEditLine(line) {
    setEditLine(line.id)
    setEditForm({
      url: line.url || '', city: line.city || '', keyword_main: line.keyword_main || '',
      keywords_sec: line.keywords_sec || '', intent: line.intent || '', h1: line.h1 || '',
      extra: line.extra || '',
      product_name: line.product_name || '', product_price: line.product_price || '', product_ref: line.product_ref || '',
      cat_product: line.cat_product || '', cat_ref: line.cat_ref || '', cat_specs: line.cat_specs || '',
    })
    // Scroll to edit panel after render
    setTimeout(() => {
      editPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  async function saveLine(lineId) {
    try {
      await fetch(`/api/campaigns/${campaign.id}/lines`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineId, ...editForm }),
      })
      setLines(prev => prev.map(l => l.id === lineId ? { ...l, ...editForm } : l))
      setEditLine(null)
    } catch {
      showAlert('Erreur sauvegarde', 'error')
    }
  }

  async function deleteSelectedLines() {
    if (!confirm(`Supprimer ${selected.size} ligne(s) ?`)) return
    const ids = [...selected]
    try {
      await fetch(`/api/campaigns/${campaign.id}/lines`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineIds: ids }),
      })
      setLines(prev => prev.filter(l => !ids.includes(l.id)))
      setSelected(new Set())
    } catch {
      showAlert('Erreur suppression', 'error')
    }
  }

  async function queueSelectedLines() {
    const ids = [...selected]
    for (const id of ids) {
      await fetch(`/api/campaigns/${campaign.id}/lines`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineId: id, status: 'queued' }),
      })
    }
    setLines(prev => prev.map(l => ids.includes(l.id) && (l.status === 'draft' || l.status === 'error') ? { ...l, status: 'queued' } : l))
    setSelected(new Set())
    showAlert(`${ids.length} ligne(s) mises en file`)
  }

  async function launchLine(lineId) {
    setLaunching(true)
    try {
      const res = await fetch('/api/campaigns/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, lineIds: [lineId] }),
      })
      const data = await res.json()
      if (data.results) {
        setLines(prev => prev.map(l => {
          const r = data.results.find(x => x.id === l.id)
          return r ? { ...l, status: r.status, error: r.error } : l
        }))
        const r = data.results[0]
        if (r?.status === 'done') showAlert('Ligne lancee avec succes')
        else showAlert(`Erreur: ${r?.error}`, 'error')
      }
    } catch {
      showAlert('Erreur lancement', 'error')
    } finally {
      setLaunching(false)
    }
  }

  async function launchQueued() {
    const queuedIds = lines.filter(l => l.status === 'queued').map(l => l.id)
    if (!queuedIds.length) { showAlert('Aucune ligne en file', 'error'); return }
    setLaunching(true)
    try {
      const res = await fetch('/api/campaigns/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, lineIds: queuedIds }),
      })
      const data = await res.json()
      if (data.results) {
        setLines(prev => prev.map(l => {
          const r = data.results.find(x => x.id === l.id)
          return r ? { ...l, status: r.status, error: r.error } : l
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

  // Auto mode
  function toggleAutoMode() {
    if (autoMode) {
      clearInterval(autoRef.current)
      autoRef.current = null
      setAutoMode(false)
      showAlert('Mode automatique desactive')
    } else {
      setAutoMode(true)
      showAlert(`Mode auto: 1 lancement / ${autoInterval} min`)
      autoLaunchNext()
      autoRef.current = setInterval(autoLaunchNext, autoInterval * 60 * 1000)
    }
  }

  async function autoLaunchNext() {
    try {
      const res = await fetch('/api/campaigns/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'next' }),
      })
      const data = await res.json()
      if (data.result) {
        // Reload lines
        const linesRes = await fetch(`/api/campaigns/${campaign.id}/lines`)
        const freshLines = await linesRes.json()
        setLines(freshLines)
        if (data.result.status === 'done') showAlert(`Auto: "${data.result.keyword_main}" lance`)
        else if (data.result.status === 'error') showAlert(`Auto: erreur "${data.result.keyword_main}"`, 'error')
      } else if (data.message === 'no_queued') {
        showAlert('Auto: plus de lignes en file')
        clearInterval(autoRef.current)
        setAutoMode(false)
      }
    } catch {
      showAlert('Auto: erreur reseau', 'error')
    }
  }

  useEffect(() => {
    return () => { if (autoRef.current) clearInterval(autoRef.current) }
  }, [])

  function toggleSelect(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleSelectAll() {
    selected.size === lines.length ? setSelected(new Set()) : setSelected(new Set(lines.map(l => l.id)))
  }

  const stats = {
    total: lines.length,
    draft: lines.filter(l => l.status === 'draft').length,
    queued: lines.filter(l => l.status === 'queued').length,
    done: lines.filter(l => l.status === 'done').length,
    error: lines.filter(l => l.status === 'error').length,
  }

  const branchInfo = BRANCHES.find(b => b.id === meta.branch) || BRANCHES[0]

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={onBack} className="btn btn-secondary btn-sm" style={{ padding: '6px 10px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600' }}>
            {branchInfo.icon} {meta.name || 'Nouvelle campagne'}
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {branchInfo.label} · {meta.sector || '—'} · Cree le {new Date(campaign.createdAt).toLocaleDateString('fr')}
          </p>
        </div>
      </div>

      {/* Phase tabs */}
      <div className="tabs">
        <button className={`tab ${phase === 'info' ? 'tab-active' : ''}`} onClick={() => setPhase('info')}>
          Base de redaction
          {Object.values(info).some(Boolean) && <span className="badge badge-blue" style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 6px' }}>{Object.values(info).filter(Boolean).length}</span>}
        </button>
        <button className={`tab ${phase === 'lines' ? 'tab-active' : ''}`} onClick={() => setPhase('lines')}>
          Lignes de contenu
          {lines.length > 0 && <span className="badge badge-muted" style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 6px' }}>{lines.length}</span>}
        </button>
      </div>

      {/* ============= PHASE: INFO ============= */}
      {phase === 'info' && (
        <div className="fade-in">
          {/* Meta fields */}
          <div className="card" style={{ marginBottom: '12px' }}>
            <div className="section-title">Parametres generaux</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div className="field">
                <label className="label">Nom de l'entreprise <span className="required">*</span></label>
                <input value={meta.name} onChange={handleM('name')} placeholder="ex : Pierre Carrelage" />
              </div>
              <div className="field">
                <label className="label">Branche</label>
                <select value={meta.branch} onChange={handleM('branch')}>
                  {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.icon} {b.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Secteur</label>
                <input value={meta.sector} onChange={handleM('sector')} placeholder="ex : Carrelage" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div className="field">
                <label className="label">Ton</label>
                <select value={meta.tone} onChange={handleM('tone')}>
                  {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Mots</label>
                <select value={meta.word_count} onChange={handleM('word_count')}>
                  <option value="800">800</option><option value="1200">1200</option>
                  <option value="1500">1500</option><option value="2000">2000</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Langue</label>
                <select value={meta.lang} onChange={handleM('lang')}>
                  <option value="fr">Francais</option><option value="en">Anglais</option><option value="es">Espagnol</option>
                </select>
              </div>
            </div>
          </div>

          {/* Info sub-tabs */}
          <div className="tabs" style={{ marginBottom: '16px' }}>
            {INFO_TABS.map(t => (
              <button key={t.id} className={`tab ${infoTab === t.id ? 'tab-active' : ''}`} onClick={() => setInfoTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {infoTab === 'info' && (
            <div className="fade-in">
              {/* Entreprise */}
              <div className="card" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="field">
                    <label className="label">Contexte entreprise</label>
                    <textarea value={info.context} onChange={handleI('context')} placeholder="Presentation, anciennete, positionnement..." style={{ minHeight: '100px' }} />
                  </div>
                  <div className="field">
                    <label className="label">Infos supplementaires</label>
                    <textarea value={info.extra_info} onChange={handleI('extra_info')} placeholder="Labels, certifications..." style={{ minHeight: '100px' }} />
                  </div>
                </div>
              </div>

              {/* B2B */}
              <div className="card" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div className="field">
                    <label className="label">Cibles B2B</label>
                    <textarea value={info.b2b_target} onChange={handleI('b2b_target')} style={{ minHeight: '60px' }} />
                  </div>
                  <div className="field">
                    <label className="label">Offre B2B</label>
                    <textarea value={info.b2b_offer} onChange={handleI('b2b_offer')} style={{ minHeight: '60px' }} />
                  </div>
                  <div className="field">
                    <label className="label">Valeur ajoutee B2B</label>
                    <textarea value={info.b2b_value} onChange={handleI('b2b_value')} style={{ minHeight: '60px' }} />
                  </div>
                </div>
              </div>

              {/* B2C */}
              <div className="card" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div className="field">
                    <label className="label">Public B2C</label>
                    <textarea value={info.b2c_target} onChange={handleI('b2c_target')} style={{ minHeight: '60px' }} />
                  </div>
                  <div className="field">
                    <label className="label">Experience client</label>
                    <textarea value={info.b2c_experience} onChange={handleI('b2c_experience')} style={{ minHeight: '60px' }} />
                  </div>
                  <div className="field">
                    <label className="label">Ambiance</label>
                    <textarea value={info.b2c_ambiance} onChange={handleI('b2c_ambiance')} style={{ minHeight: '60px' }} />
                  </div>
                </div>
              </div>

              {/* Personas */}
              <div className="card" style={{ marginBottom: '12px' }}>
                <div className="field">
                  <label className="label">Personas</label>
                  <textarea value={info.personas} onChange={handleI('personas')} placeholder="Persona 1: Claire, 48 ans..." style={{ minHeight: '100px' }} />
                </div>
              </div>

              {/* Services */}
              <div className="card" style={{ marginBottom: '12px' }}>
                <div className="field">
                  <label className="label">Services</label>
                  <textarea value={info.services} onChange={handleI('services')} style={{ minHeight: '80px' }} />
                </div>
              </div>

              {/* Geographie */}
              <div className="card" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div className="field">
                    <label className="label">Implantation</label>
                    <textarea value={info.geo_location} onChange={handleI('geo_location')} style={{ minHeight: '60px' }} />
                  </div>
                  <div className="field">
                    <label className="label">Zone chalandise</label>
                    <textarea value={info.geo_zone} onChange={handleI('geo_zone')} style={{ minHeight: '60px' }} />
                  </div>
                  <div className="field">
                    <label className="label">Environnement</label>
                    <textarea value={info.geo_environment} onChange={handleI('geo_environment')} style={{ minHeight: '60px' }} />
                  </div>
                </div>
              </div>

              {/* Style */}
              <div className="card" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="field">
                    <label className="label">Style redactionnel</label>
                    <textarea value={info.style_approach} onChange={handleI('style_approach')} style={{ minHeight: '60px' }} />
                  </div>
                  <div className="field">
                    <label className="label">Vocabulaire</label>
                    <textarea value={info.style_vocabulary} onChange={handleI('style_vocabulary')} style={{ minHeight: '60px' }} />
                  </div>
                </div>
              </div>

              {/* Avis */}
              <div className="card" style={{ marginBottom: '12px' }}>
                <div className="field">
                  <label className="label">Avis clients</label>
                  <textarea value={info.reviews} onChange={handleI('reviews')} style={{ minHeight: '50px' }} />
                </div>
              </div>
            </div>
          )}

          {infoTab === 'import' && (
            <div className="card fade-in" style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Collez un brief JSON pour remplir automatiquement les champs.
              </p>
              <textarea
                className="import-area"
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder='{"company":"...", "info": {"context":"...", "b2b_target":"..."}}'
                style={{ minHeight: '250px' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button onClick={handleImport} className="btn btn-primary btn-sm" disabled={!importText.trim()}>
                  Parser et remplir
                </button>
                <button onClick={() => setImportText('')} className="btn btn-secondary btn-sm">Vider</button>
              </div>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={saveInfo}
            disabled={saving || !meta.name}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {saving ? (
              <><svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Sauvegarde...</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> Valider la base de redaction</>
            )}
          </button>
        </div>
      )}

      {/* ============= PHASE: LINES ============= */}
      {phase === 'lines' && (
        <div className="fade-in">
          {/* Stats */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>{stats.total} total</span>
            <span>{stats.draft} brouillon(s)</span>
            <span style={{ color: 'var(--warning)' }}>{stats.queued} en file</span>
            <span style={{ color: 'var(--success)' }}>{stats.done} termine(s)</span>
            <span style={{ color: 'var(--danger)' }}>{stats.error} erreur(s)</span>
          </div>

          {/* Action bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <button onClick={addNewLine} className="btn btn-primary btn-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Ajouter une ligne
            </button>
            {selected.size > 0 && (
              <>
                <button onClick={queueSelectedLines} className="btn btn-secondary btn-sm">Mettre en file ({selected.size})</button>
                <button onClick={deleteSelectedLines} className="btn btn-danger btn-sm">Supprimer ({selected.size})</button>
              </>
            )}
            <div style={{ flex: 1 }} />
            <button onClick={launchQueued} disabled={launching || stats.queued === 0} className="btn btn-primary btn-sm">
              {launching ? (
                <><svg className="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Lancement...</>
              ) : (
                <>Lancer la file ({stats.queued})</>
              )}
            </button>
            <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
            <select value={autoInterval} onChange={e => setAutoInterval(Number(e.target.value))} disabled={autoMode} style={{ width: '120px', fontSize: '12px', padding: '5px 8px' }}>
              <option value={5}>Toutes les 5 min</option>
              <option value={10}>Toutes les 10 min</option>
              <option value={15}>Toutes les 15 min</option>
              <option value={30}>Toutes les 30 min</option>
            </select>
            <button onClick={toggleAutoMode} className={`btn btn-sm ${autoMode ? 'btn-danger' : 'btn-success'}`}>
              {autoMode ? (
                <><svg className="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Arreter</>
              ) : 'Mode auto'}
            </button>
          </div>

          {/* Lines table */}
          {lines.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '14px' }}>Aucune ligne. Ajoutez votre premier contenu.</p>
              <button onClick={addNewLine} className="btn btn-primary">Ajouter une ligne</button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '36px' }}>
                      <input type="checkbox" className="checkbox" checked={selected.size === lines.length && lines.length > 0} onChange={toggleSelectAll} />
                    </th>
                    <th>Statut</th>
                    <th>URL</th>
                    <th>Mot-cle</th>
                    <th>Ville</th>
                    <th>H1</th>
                    <th style={{ width: '90px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map(line => (
                    <tr
                      key={line.id}
                      style={{
                        background: editLine === line.id ? 'var(--bg-card)' : undefined,
                        borderLeft: editLine === line.id ? '2px solid var(--accent)' : '2px solid transparent',
                      }}
                    >
                      <td>
                        <input type="checkbox" className="checkbox" checked={selected.has(line.id)} onChange={() => toggleSelect(line.id)} />
                      </td>
                      <td><StatusBadge status={line.status || 'draft'} /></td>
                      <td style={{ fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.url || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      <td style={{ fontWeight: '500', color: line.keyword_main ? 'var(--text-primary)' : 'var(--text-muted)' }}>{line.keyword_main || '—'}</td>
                      <td>{line.city || '—'}</td>
                      <td style={{ fontSize: '12px' }}>{line.h1 || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => startEditLine(line)}
                            className={`btn btn-sm ${editLine === line.id ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '4px 8px' }}
                            title="Modifier"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => launchLine(line.id)}
                            disabled={launching || !line.url || !line.keyword_main}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '4px 8px' }}
                            title="Lancer"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                            </svg>
                          </button>
                          {line.articleId && (
                            <a
                              href={`/articles/${line.articleId}`}
                              className="btn btn-success btn-sm"
                              style={{ padding: '4px 8px', textDecoration: 'none' }}
                              title="Voir l'article"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                              </svg>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Edit panel for selected line */}
          {editLine && (
            <div ref={editPanelRef} className="card fade-in" style={{ marginTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div className="section-title" style={{ marginBottom: 0 }}>
                  Edition de la ligne
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => saveLine(editLine)} className="btn btn-primary btn-sm">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    Sauvegarder
                  </button>
                  <button onClick={() => setEditLine(null)} className="btn btn-secondary btn-sm">Fermer</button>
                </div>
              </div>

              {/* Main fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div className="field">
                  <label className="label">URL cible <span className="required">*</span></label>
                  <input value={editForm.url} onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))} placeholder="ex : pierrecarrelage.com/pose-carrelage" />
                </div>
                <div className="field">
                  <label className="label">Mot-cle principal <span className="required">*</span></label>
                  <input value={editForm.keyword_main} onChange={e => setEditForm(f => ({ ...f, keyword_main: e.target.value }))} placeholder="ex : pose de carrelage" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div className="field">
                  <label className="label">Ville</label>
                  <input value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} placeholder="ex : Pau, Morlaas" />
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
                  <input value={editForm.h1} onChange={e => setEditForm(f => ({ ...f, h1: e.target.value }))} placeholder="ex : Pose de carrelage a Pau" />
                </div>
                <div className="field">
                  <label className="label">Instructions supplementaires</label>
                  <input value={editForm.extra} onChange={e => setEditForm(f => ({ ...f, extra: e.target.value }))} placeholder="Instructions specifiques..." />
                </div>
              </div>

              {meta.branch === 'ecommerce' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div className="field"><label className="label">Nom produit</label><input value={editForm.product_name} onChange={e => setEditForm(f => ({ ...f, product_name: e.target.value }))} /></div>
                  <div className="field"><label className="label">Prix</label><input value={editForm.product_price} onChange={e => setEditForm(f => ({ ...f, product_price: e.target.value }))} /></div>
                  <div className="field"><label className="label">Reference</label><input value={editForm.product_ref} onChange={e => setEditForm(f => ({ ...f, product_ref: e.target.value }))} /></div>
                </div>
              )}

              {meta.branch === 'catalogue' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div className="field"><label className="label">Produit catalogue</label><input value={editForm.cat_product} onChange={e => setEditForm(f => ({ ...f, cat_product: e.target.value }))} /></div>
                  <div className="field"><label className="label">Ref catalogue</label><input value={editForm.cat_ref} onChange={e => setEditForm(f => ({ ...f, cat_ref: e.target.value }))} /></div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ==================================
// MAIN PAGE
// ==================================
export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [alert, setAlert] = useState(null)

  function showAlert(msg, type = 'success') {
    setAlert({ msg, type })
    setTimeout(() => setAlert(null), 5000)
  }

  async function loadCampaigns() {
    try {
      const res = await fetch('/api/campaigns')
      const data = await res.json()
      setCampaigns(Array.isArray(data) ? data : [])
    } catch { setCampaigns([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadCampaigns() }, [])

  async function createNewCampaign() {
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '', branch: 'vitrine' }),
      })
      const camp = await res.json()
      setCampaigns(prev => [...prev, camp])
      setSelectedCampaign(camp)
    } catch {
      showAlert('Erreur creation', 'error')
    }
  }

  async function deleteCampaign(id) {
    if (!confirm('Supprimer cette campagne et toutes ses lignes ?')) return
    try {
      await fetch('/api/campaigns', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
      setCampaigns(prev => prev.filter(c => c.id !== id))
      setSelectedCampaign(null)
    } catch {
      showAlert('Erreur suppression', 'error')
    }
  }

  function handleCampaignUpdate(updated) {
    setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c))
    setSelectedCampaign(updated)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Nav />
      <main style={{ flex: 1, marginLeft: '220px', padding: '32px', maxWidth: '1000px' }}>
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

        {selectedCampaign ? (
          <CampaignDetail
            campaign={selectedCampaign}
            onBack={() => { setSelectedCampaign(null); loadCampaigns() }}
            onUpdate={handleCampaignUpdate}
            showAlert={showAlert}
          />
        ) : (
          <CampaignList
            campaigns={campaigns}
            loading={loading}
            onSelect={setSelectedCampaign}
            onCreateNew={createNewCampaign}
          />
        )}
      </main>
    </div>
  )
}
