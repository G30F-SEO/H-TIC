'use client'
import { useState, useCallback } from 'react'
import Nav from '@/components/Nav'

const BRANCHES = [
  { id: 'vitrine', label: 'Site vitrine', desc: 'Pages services, presentation', icon: '🏪', color: 'blue' },
  { id: 'ecommerce', label: 'E-commerce', desc: 'Fiches produits, categories', icon: '🛒', color: 'green' },
  { id: 'catalogue', label: 'Catalogue', desc: 'Descriptions, PDF, listes', icon: '📚', color: 'amber' },
]

const TONES = [
  { value: 'expert', label: 'Expert & rassurant' },
  { value: 'accessible', label: 'Accessible & chaleureux' },
  { value: 'premium', label: 'Premium & sobre' },
  { value: 'direct', label: 'Direct & percutant' },
]

const WORD_COUNTS = [
  { value: '800', label: '800 mots — minimal' },
  { value: '1200', label: '1200 mots — standard' },
  { value: '1500', label: '1500 mots — enrichi' },
  { value: '2000', label: '2000 mots — complet' },
]

const TABS = [
  { id: 'essentiel', label: 'Essentiel' },
  { id: 'information', label: 'Information' },
  { id: 'seo', label: 'SEO & Contenu' },
  { id: 'import', label: 'Import & Payload' },
]

const PAYLOAD_SECTIONS = [
  { id: 'info_entreprise', label: 'Info entreprise', fields: ['context', 'extra_info'] },
  { id: 'b2b', label: 'B2B', fields: ['b2b_target', 'b2b_offer', 'b2b_value'] },
  { id: 'b2c', label: 'B2C', fields: ['b2c_target', 'b2c_experience', 'b2c_ambiance'] },
  { id: 'personas', label: 'Personas', fields: ['personas'] },
  { id: 'services', label: 'Services', fields: ['services'] },
  { id: 'geographie', label: 'Geographie', fields: ['geo_location', 'geo_zone', 'geo_environment'] },
  { id: 'style', label: 'Style redactionnel', fields: ['style_approach', 'style_relation', 'style_objective', 'style_vocabulary', 'style_promises', 'style_structure', 'style_storytelling', 'style_engagement', 'style_verb_tense'] },
  { id: 'avis', label: 'Avis clients', fields: ['reviews'] },
  { id: 'keywords_serp', label: 'Keywords & SERP', fields: ['keywords_data', 'serp_analysis'] },
  { id: 'brief_seo', label: 'Brief SEO', fields: ['brief_seo'] },
  { id: 'plan_h2', label: 'Plan article (H2)', fields: ['h2_plan', 'category_title'] },
  { id: 'contenu_html', label: 'Contenu HTML', fields: ['article_intro', 'article_part1', 'article_part2', 'article_part3', 'article_part4', 'article_part5'] },
  { id: 'faq', label: 'FAQ', fields: ['faq_html'] },
  { id: 'images', label: 'Prompts image', fields: ['image_prompts'] },
]

const PRESETS = [
  { id: 'complet', label: 'Complet', sections: PAYLOAD_SECTIONS.map(s => s.id) },
  { id: 'seo_only', label: 'SEO only', sections: ['keywords_serp', 'brief_seo', 'plan_h2'] },
  { id: 'contenu_only', label: 'Contenu only', sections: ['contenu_html', 'faq', 'images'] },
  { id: 'custom', label: 'Personnalise', sections: [] },
]

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

function Field({ label, required, hint, children }) {
  return (
    <div className="field">
      <label className="label">
        {label} {required && <span className="required">*</span>}
      </label>
      {children}
      {hint && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{hint}</span>}
    </div>
  )
}

// --- Import parser ---
function parseImport(text) {
  const result = {
    base: {},
    info: { ...EMPTY_INFO },
    seo: { ...EMPTY_SEO },
  }

  // Try JSON first
  try {
    const json = JSON.parse(text)
    if (typeof json === 'object' && json !== null) {
      // Map known top-level keys
      const baseKeys = ['company', 'url', 'city', 'sector', 'description', 'keyword_main', 'keywords_sec', 'intent', 'h1', 'word_count', 'tone', 'lang', 'extra', 'branch', 'product_name', 'product_price', 'product_ref', 'cat_product', 'cat_ref', 'cat_specs']
      for (const k of baseKeys) {
        if (json[k]) result.base[k] = json[k]
      }
      // Map info sub-object or flat info keys
      const infoSrc = json.info || json
      for (const k of Object.keys(EMPTY_INFO)) {
        if (infoSrc[k]) result.info[k] = infoSrc[k]
      }
      // Map seo sub-object or flat seo keys
      const seoSrc = json.seo || json
      for (const k of Object.keys(EMPTY_SEO)) {
        if (seoSrc[k]) result.seo[k] = seoSrc[k]
      }
      return result
    }
  } catch {
    // Not JSON, parse as text
  }

  // Text parsing — match known labels
  const labelMap = [
    // Base fields
    [/^Nom de l'entreprise/i, (v) => { result.base.company = v }],
    [/^URL|^Liens?\b/i, (v) => { result.base.url = v; result.seo.links = v }],
    [/^Ville|^Location/i, (v) => { result.base.city = v; result.seo.location = v }],
    [/^Secteur/i, (v) => { result.base.sector = v }],
    [/^Mot.cl[ée] principal/i, (v) => { result.base.keyword_main = v }],
    [/^Mots.cl[ée]s secondaires/i, (v) => { result.base.keywords_sec = v }],
    [/^H1/i, (v) => { result.base.h1 = v }],
    [/^Intention/i, (v) => { result.base.intent = v }],
    // Info fields
    [/^Contexte\b/i, (v) => { result.info.context = v }],
    [/^(A propos|Pr[ée]sentation)/i, (v) => { result.info.context = v }],
    [/^Cibles? professionnel/i, (v) => { result.info.b2b_target = v }],
    [/^Offre d[ée]di[ée]e? B2B/i, (v) => { result.info.b2b_offer = v }],
    [/^Valeur ajout[ée]e/i, (v) => { result.info.b2b_value = v }],
    [/^Public vis[ée]/i, (v) => { result.info.b2c_target = v }],
    [/^Exp[ée]rience client/i, (v) => { result.info.b2c_experience = v }],
    [/^Ambiance/i, (v) => { result.info.b2c_ambiance = v }],
    [/^Persona/i, (v) => { result.info.personas = v }],
    [/^Services?\b/i, (v) => { result.info.services = v }],
    [/^Implantation/i, (v) => { result.info.geo_location = v }],
    [/^Zone de chalandise/i, (v) => { result.info.geo_zone = v }],
    [/^Environnement/i, (v) => { result.info.geo_environment = v }],
    [/^Approche g[ée]n[ée]rale/i, (v) => { result.info.style_approach = v }],
    [/^Relation avec le lecteur/i, (v) => { result.info.style_relation = v }],
    [/^Objectif\b/i, (v) => { result.info.style_objective = v }],
    [/^Vocabulaire/i, (v) => { result.info.style_vocabulary = v }],
    [/^Promesses/i, (v) => { result.info.style_promises = v }],
    [/^Structure r[ée]dactionnelle/i, (v) => { result.info.style_structure = v }],
    [/^Storytelling/i, (v) => { result.info.style_storytelling = v }],
    [/^Implication du lecteur/i, (v) => { result.info.style_engagement = v }],
    [/^Temps verbal/i, (v) => { result.info.style_verb_tense = v }],
    [/^(Avis clients?|Note moyenne)/i, (v) => { result.info.reviews = v }],
    [/^Information suppl[ée]mentaire/i, (v) => { result.info.extra_info = v }],
    [/^Style r[ée]dactionnel/i, (v) => { result.info.style_approach = v }],
    // SEO fields
    [/^Titre de la cat[ée]gorie/i, (v) => { result.seo.category_title = v }],
    [/^Plan H2|^H2-/i, (v) => { result.seo.h2_plan = v }],
    [/^Statut/i, (v) => { result.seo.status = v }],
    [/^Catalogue ID/i, (v) => { result.seo.catalogue_id = v }],
    [/^Cat[ée]gories/i, (v) => { result.seo.categories = v }],
    [/^Language/i, (v) => { result.base.lang = v.toLowerCase().startsWith('fr') ? 'fr' : v.toLowerCase().startsWith('en') ? 'en' : 'fr' }],
    [/^Brief SEO|^Analyse SEO/i, (v) => { result.seo.brief_seo = v }],
    [/^Introduction\b/i, (v) => { result.seo.article_intro = v }],
    [/^\[?Partie 1/i, (v) => { result.seo.article_part1 = v }],
    [/^\[?Partie 2/i, (v) => { result.seo.article_part2 = v }],
    [/^\[?Partie 3/i, (v) => { result.seo.article_part3 = v }],
    [/^\[?Partie 4/i, (v) => { result.seo.article_part4 = v }],
    [/^\[?Partie 5/i, (v) => { result.seo.article_part5 = v }],
    [/^FAQ\b/i, (v) => { result.seo.faq_html = v }],
    [/^Prompts? image/i, (v) => { result.seo.image_prompts = v }],
  ]

  // Collect keywords and SERP data
  const keywordsLines = []
  const serpLines = []

  const lines = text.split('\n')
  let currentSetter = null
  let currentBuffer = []

  function flush() {
    if (currentSetter && currentBuffer.length > 0) {
      currentSetter(currentBuffer.join('\n').trim())
    }
    currentSetter = null
    currentBuffer = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      currentBuffer.push('')
      continue
    }

    // Check for keyword lines
    if (/^Keyword\s*:/i.test(trimmed)) {
      keywordsLines.push(trimmed)
      continue
    }
    // Check for SERP position lines
    if (/^Position\s*:/i.test(trimmed)) {
      serpLines.push(trimmed)
      continue
    }

    // Check if this line starts a new label
    let matched = false
    for (const [regex, setter] of labelMap) {
      if (regex.test(trimmed)) {
        flush()
        // Check if value is on same line after label
        const colonIdx = trimmed.indexOf(':')
        const afterLabel = colonIdx >= 0 ? trimmed.slice(colonIdx + 1).trim() : ''
        if (afterLabel) {
          currentBuffer.push(afterLabel)
        }
        currentSetter = setter
        matched = true
        break
      }
    }

    if (!matched) {
      currentBuffer.push(trimmed)
    }
  }
  flush()

  // Set accumulated keywords and SERP
  if (keywordsLines.length > 0) {
    result.seo.keywords_data = keywordsLines.join('\n')
  }
  if (serpLines.length > 0) {
    result.seo.serp_analysis = serpLines.join('\n')
  }

  return result
}


export default function Dashboard() {
  const [tab, setTab] = useState('essentiel')
  const [branch, setBranch] = useState('vitrine')
  const [form, setForm] = useState({
    company: '', url: '', city: '', sector: '', description: '',
    keyword_main: '', keywords_sec: '', intent: '', h1: '',
    word_count: '1200', tone: 'expert', lang: 'fr', extra: '',
    product_name: '', product_price: '', product_ref: '',
    cat_product: '', cat_ref: '', cat_specs: '',
  })
  const [info, setInfo] = useState({ ...EMPTY_INFO })
  const [seo, setSeo] = useState({ ...EMPTY_SEO })
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState(null)
  const [showPayload, setShowPayload] = useState(false)
  const [importText, setImportText] = useState('')
  const [importResult, setImportResult] = useState(null)
  const [activePreset, setActivePreset] = useState('complet')
  const [activeSections, setActiveSections] = useState(new Set(PAYLOAD_SECTIONS.map(s => s.id)))

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handle = k => e => set(k, e.target.value)
  const setI = (k, v) => setInfo(f => ({ ...f, [k]: v }))
  const handleI = k => e => setI(k, e.target.value)
  const setS = (k, v) => setSeo(f => ({ ...f, [k]: v }))
  const handleS = k => e => setS(k, e.target.value)

  const secondaryTags = form.keywords_sec.split(',').map(s => s.trim()).filter(Boolean)

  // Toggle a payload section
  function toggleSection(id) {
    setActivePreset('custom')
    setActiveSections(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Apply a preset
  function applyPreset(preset) {
    setActivePreset(preset.id)
    if (preset.id === 'custom') return
    setActiveSections(new Set(preset.sections))
  }

  // Build the final payload with only active sections
  const buildPayload = useCallback(() => {
    const base = {
      branch,
      company: form.company, url: form.url, city: form.city,
      sector: form.sector, description: form.description,
      keyword_main: form.keyword_main, keywords_secondary: form.keywords_sec,
      intent: form.intent, h1: form.h1, word_count: form.word_count,
      tone: form.tone, language: form.lang, extra_instructions: form.extra,
    }
    if (branch === 'ecommerce') Object.assign(base, {
      product_name: form.product_name, product_price: form.product_price, product_ref: form.product_ref,
    })
    if (branch === 'catalogue') Object.assign(base, {
      cat_product: form.cat_product, cat_ref: form.cat_ref, cat_specs: form.cat_specs,
    })

    // Add active sections from info/seo
    for (const section of PAYLOAD_SECTIONS) {
      if (!activeSections.has(section.id)) continue
      for (const field of section.fields) {
        const val = info[field] || seo[field] || ''
        if (val) base[field] = val
      }
    }

    return base
  }, [branch, form, info, seo, activeSections])

  // Import handler
  function handleImport() {
    if (!importText.trim()) return
    const parsed = parseImport(importText)
    setImportResult(parsed)
    // Apply parsed data
    if (parsed.base && Object.keys(parsed.base).length > 0) {
      setForm(f => ({ ...f, ...parsed.base }))
      if (parsed.base.branch) setBranch(parsed.base.branch)
    }
    setInfo(prev => {
      const next = { ...prev }
      for (const [k, v] of Object.entries(parsed.info)) {
        if (v) next[k] = v
      }
      return next
    })
    setSeo(prev => {
      const next = { ...prev }
      for (const [k, v] of Object.entries(parsed.seo)) {
        if (v) next[k] = v
      }
      return next
    })
    setAlert({ type: 'success', msg: `Import reussi — ${Object.values(parsed.base).filter(Boolean).length} champs de base, ${Object.values(parsed.info).filter(Boolean).length} champs info, ${Object.values(parsed.seo).filter(Boolean).length} champs SEO detectes.` })
  }

  async function launch() {
    if (!form.company || !form.url || !form.keyword_main) {
      setAlert({ type: 'error', msg: 'Remplissez les champs obligatoires : entreprise, URL et mot-cle principal.' })
      return
    }
    setLoading(true)
    setAlert(null)
    try {
      const res = await fetch('/api/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      const data = await res.json()
      if (res.ok) {
        setAlert({ type: 'success', msg: `Automatisation lancee avec succes pour "${form.company}" !` })
      } else {
        setAlert({ type: 'error', msg: data.error || 'Erreur lors du lancement.' })
      }
    } catch {
      setAlert({ type: 'error', msg: 'Erreur reseau. Verifiez votre connexion.' })
    } finally {
      setLoading(false)
    }
  }

  const s = {
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
    grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' },
    section: { marginBottom: '12px' },
  }

  // Count filled fields per tab
  const infoCount = Object.values(info).filter(Boolean).length
  const seoCount = Object.values(seo).filter(Boolean).length

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Nav />
      <main style={{ flex: 1, marginLeft: '220px', padding: '32px', maxWidth: '920px' }}>
        <div className="fade-in">
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '4px' }}>Nouveau lancement</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Renseignez les informations client pour declencher l'automatisation Make.
            </p>
          </div>

          {/* Tabs */}
          <div className="tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`tab ${tab === t.id ? 'tab-active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {t.id === 'information' && infoCount > 0 && (
                  <span className="badge badge-blue" style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 6px' }}>{infoCount}</span>
                )}
                {t.id === 'seo' && seoCount > 0 && (
                  <span className="badge badge-green" style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 6px' }}>{seoCount}</span>
                )}
              </button>
            ))}
          </div>

          {/* ====== TAB: ESSENTIEL ====== */}
          {tab === 'essentiel' && (
            <div className="fade-in">
              {/* Branch selector */}
              <div className="card" style={s.section}>
                <div className="section-title">Branche de generation</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                  {BRANCHES.map(b => (
                    <button
                      key={b.id}
                      onClick={() => setBranch(b.id)}
                      style={{
                        padding: '14px', borderRadius: '10px', textAlign: 'left',
                        border: branch === b.id ? `1.5px solid var(--${b.color})` : '1px solid var(--border)',
                        background: branch === b.id ? `var(--${b.color}-soft)` : 'var(--bg)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: '20px', marginBottom: '6px' }}>{b.icon}</div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '2px' }}>{b.label}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{b.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Client info */}
              <div className="card" style={s.section}>
                <div className="section-title">Informations client</div>
                <div style={{ ...s.grid2, marginBottom: '12px' }}>
                  <Field label="Nom de l'entreprise" required>
                    <input value={form.company} onChange={handle('company')} placeholder="ex : Pierre Carrelage" />
                  </Field>
                  <Field label="URL cible" required hint={form.url ? '-> ' + (form.url.startsWith('http') ? form.url : 'https://' + form.url) : ''}>
                    <input value={form.url} onChange={handle('url')} placeholder="ex : pierrecarrelage.com/pose-carrelage" />
                  </Field>
                </div>
                <div style={{ ...s.grid2, marginBottom: '12px' }}>
                  <Field label="Ville / zone geographique">
                    <input value={form.city} onChange={handle('city')} placeholder="ex : Pau, Morlaas, Orthez" />
                  </Field>
                  <Field label="Secteur d'activite">
                    <input value={form.sector} onChange={handle('sector')} placeholder="ex : Carrelage, Plomberie..." />
                  </Field>
                </div>
                <Field label="Description courte">
                  <textarea value={form.description} onChange={handle('description')} placeholder="Anciennete, specialites, valeurs de l'entreprise..." style={{ minHeight: '70px' }} />
                </Field>
              </div>

              {/* SEO params */}
              <div className="card" style={s.section}>
                <div className="section-title">Parametres SEO</div>
                <div style={{ ...s.grid2, marginBottom: '12px' }}>
                  <Field label="Mot-cle principal" required>
                    <input value={form.keyword_main} onChange={handle('keyword_main')} placeholder="ex : pose de carrelage" />
                  </Field>
                  <Field label="Mots-cles secondaires" hint="Separes par des virgules">
                    <input value={form.keywords_sec} onChange={handle('keywords_sec')} placeholder="ex : carreleur, pose carrelage sol" />
                  </Field>
                </div>
                {(form.keyword_main || secondaryTags.length > 0) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                    {form.keyword_main && <span className="badge badge-blue">* {form.keyword_main}</span>}
                    {secondaryTags.map(t => <span key={t} className="badge badge-muted">{t}</span>)}
                  </div>
                )}
                <div style={{ ...s.grid2, marginBottom: '12px' }}>
                  <Field label="Intention SEO / but de la page">
                    <input value={form.intent} onChange={handle('intent')} placeholder="ex : Rassurer et convertir des particuliers..." />
                  </Field>
                  <Field label="H1 suggere">
                    <input value={form.h1} onChange={handle('h1')} placeholder="ex : Pose de carrelage a Pau" />
                  </Field>
                </div>
                <div style={s.grid2}>
                  <Field label="Nombre de mots">
                    <select value={form.word_count} onChange={handle('word_count')}>
                      {WORD_COUNTS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Langue">
                    <select value={form.lang} onChange={handle('lang')}>
                      <option value="fr">Francais</option>
                      <option value="en">Anglais</option>
                      <option value="es">Espagnol</option>
                    </select>
                  </Field>
                </div>
              </div>

              {/* E-commerce specific */}
              {branch === 'ecommerce' && (
                <div className="card fade-in" style={s.section}>
                  <div className="section-title">Specifique e-commerce</div>
                  <div style={s.grid3}>
                    <Field label="Nom du produit / categorie">
                      <input value={form.product_name} onChange={handle('product_name')} placeholder="ex : Carrelage 60x60" />
                    </Field>
                    <Field label="Prix indicatif">
                      <input value={form.product_price} onChange={handle('product_price')} placeholder="ex : 15 EUR / m2" />
                    </Field>
                    <Field label="Reference interne">
                      <input value={form.product_ref} onChange={handle('product_ref')} placeholder="ex : SKU-001" />
                    </Field>
                  </div>
                </div>
              )}

              {/* Catalogue specific */}
              {branch === 'catalogue' && (
                <div className="card fade-in" style={s.section}>
                  <div className="section-title">Specifique catalogue</div>
                  <div style={{ ...s.grid2, marginBottom: '12px' }}>
                    <Field label="Nom du produit">
                      <input value={form.cat_product} onChange={handle('cat_product')} placeholder="ex : Dalle terrasse 20mm" />
                    </Field>
                    <Field label="Numero de catalogue">
                      <input value={form.cat_ref} onChange={handle('cat_ref')} placeholder="ex : CAT-2025-047" />
                    </Field>
                  </div>
                  <Field label="Caracteristiques techniques">
                    <textarea value={form.cat_specs} onChange={handle('cat_specs')} placeholder="Dimensions, matiere, resistance, finition..." style={{ minHeight: '60px' }} />
                  </Field>
                </div>
              )}

              {/* Style */}
              <div className="card" style={s.section}>
                <div className="section-title">Style redactionnel</div>
                <div style={{ ...s.grid2, marginBottom: '12px' }}>
                  <Field label="Ton">
                    <select value={form.tone} onChange={handle('tone')}>
                      {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </Field>
                  <div />
                </div>
                <Field label="Instructions supplementaires">
                  <textarea
                    value={form.extra} onChange={handle('extra')}
                    placeholder="Ex : eviter le mot 'innovant', mentionner l'agrement Anhydritec, inclure une FAQ de 4 questions..."
                    style={{ minHeight: '70px' }}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* ====== TAB: INFORMATION ====== */}
          {tab === 'information' && (
            <div className="fade-in">
              {/* Entreprise */}
              <div className="card" style={s.section}>
                <div className="section-title">Entreprise</div>
                <Field label="Contexte entreprise (A propos)">
                  <textarea value={info.context} onChange={handleI('context')} placeholder="Presentation generale, anciennete, positionnement, valeurs, mission..." style={{ minHeight: '120px' }} />
                </Field>
                <div style={{ marginTop: '12px' }}>
                  <Field label="Informations supplementaires">
                    <textarea value={info.extra_info} onChange={handleI('extra_info')} placeholder="Elements differenciants, labels, certifications verifiables..." style={{ minHeight: '80px' }} />
                  </Field>
                </div>
              </div>

              {/* B2B */}
              <div className="card" style={s.section}>
                <div className="section-title">B2B</div>
                <Field label="Cibles professionnelles">
                  <textarea value={info.b2b_target} onChange={handleI('b2b_target')} placeholder="Maitres d'oeuvre, architectes, promoteurs..." style={{ minHeight: '60px' }} />
                </Field>
                <div style={{ ...s.grid2, marginTop: '12px' }}>
                  <Field label="Offre dediee B2B">
                    <textarea value={info.b2b_offer} onChange={handleI('b2b_offer')} placeholder="Services proposes aux professionnels..." style={{ minHeight: '60px' }} />
                  </Field>
                  <Field label="Valeur ajoutee B2B">
                    <textarea value={info.b2b_value} onChange={handleI('b2b_value')} placeholder="Anciennete, ancrage local, fiabilite..." style={{ minHeight: '60px' }} />
                  </Field>
                </div>
              </div>

              {/* B2C */}
              <div className="card" style={s.section}>
                <div className="section-title">B2C</div>
                <Field label="Public vise">
                  <textarea value={info.b2c_target} onChange={handleI('b2c_target')} placeholder="Proprietaires, jeunes acquereurs, clientele aisee..." style={{ minHeight: '60px' }} />
                </Field>
                <div style={{ ...s.grid2, marginTop: '12px' }}>
                  <Field label="Experience client">
                    <textarea value={info.b2c_experience} onChange={handleI('b2c_experience')} placeholder="Relation directe, devis, accompagnement..." style={{ minHeight: '60px' }} />
                  </Field>
                  <Field label="Ambiance & relation">
                    <textarea value={info.b2c_ambiance} onChange={handleI('b2c_ambiance')} placeholder="Ton accessible, premium discret, proximite..." style={{ minHeight: '60px' }} />
                  </Field>
                </div>
              </div>

              {/* Personas */}
              <div className="card" style={s.section}>
                <div className="section-title">Personas</div>
                <Field label="Personas cibles" hint="Decrivez les profils types : habitudes, attentes, besoins sur le site">
                  <textarea value={info.personas} onChange={handleI('personas')} placeholder="Persona 1 : Claire, 48 ans — Proprietaire... Persona 2 : Laurent, 55 ans..." style={{ minHeight: '150px' }} />
                </Field>
              </div>

              {/* Services */}
              <div className="card" style={s.section}>
                <div className="section-title">Services</div>
                <Field label="Liste des services" hint="Services avec descriptions et benefices">
                  <textarea value={info.services} onChange={handleI('services')} placeholder="Pose de carrelage interieur — ameliore durablement les sols... Salle de bain — permet de creer..." style={{ minHeight: '120px' }} />
                </Field>
              </div>

              {/* Geographie */}
              <div className="card" style={s.section}>
                <div className="section-title">Geographie</div>
                <div style={s.grid3}>
                  <Field label="Implantation">
                    <textarea value={info.geo_location} onChange={handleI('geo_location')} placeholder="Adresse, zone d'activite..." style={{ minHeight: '60px' }} />
                  </Field>
                  <Field label="Zone de chalandise">
                    <textarea value={info.geo_zone} onChange={handleI('geo_zone')} placeholder="Villes couvertes, rayon..." style={{ minHeight: '60px' }} />
                  </Field>
                  <Field label="Environnement">
                    <textarea value={info.geo_environment} onChange={handleI('geo_environment')} placeholder="Bassin residentiel, demande locale..." style={{ minHeight: '60px' }} />
                  </Field>
                </div>
              </div>

              {/* Style redactionnel */}
              <div className="card" style={s.section}>
                <div className="section-title">Style redactionnel detaille</div>
                <div style={s.grid2}>
                  <Field label="Approche generale">
                    <textarea value={info.style_approach} onChange={handleI('style_approach')} placeholder="Ton expert, rassurant, accessible..." style={{ minHeight: '60px' }} />
                  </Field>
                  <Field label="Relation avec le lecteur">
                    <textarea value={info.style_relation} onChange={handleI('style_relation')} placeholder="Proximite maitrisee, confiance..." style={{ minHeight: '60px' }} />
                  </Field>
                </div>
                <div style={{ ...s.grid2, marginTop: '12px' }}>
                  <Field label="Objectif">
                    <textarea value={info.style_objective} onChange={handleI('style_objective')} placeholder="Rassurer, valoriser, convertir..." style={{ minHeight: '60px' }} />
                  </Field>
                  <Field label="Vocabulaire">
                    <textarea value={info.style_vocabulary} onChange={handleI('style_vocabulary')} placeholder="Champ lexical : pose soignee, finition, durabilite..." style={{ minHeight: '60px' }} />
                  </Field>
                </div>
                <div style={{ ...s.grid2, marginTop: '12px' }}>
                  <Field label="Promesses explicites">
                    <textarea value={info.style_promises} onChange={handleI('style_promises')} placeholder="Accompagnement clair, exigence qualite..." style={{ minHeight: '60px' }} />
                  </Field>
                  <Field label="Structure redactionnelle">
                    <textarea value={info.style_structure} onChange={handleI('style_structure')} placeholder="Phrases courtes, titres orientes besoin..." style={{ minHeight: '60px' }} />
                  </Field>
                </div>
                <div style={{ ...s.grid3, marginTop: '12px' }}>
                  <Field label="Storytelling & ancrage">
                    <textarea value={info.style_storytelling} onChange={handleI('style_storytelling')} placeholder="Ancrer dans l'experience terrain..." style={{ minHeight: '60px' }} />
                  </Field>
                  <Field label="Implication du lecteur">
                    <textarea value={info.style_engagement} onChange={handleI('style_engagement')} placeholder="Questions de projection..." style={{ minHeight: '60px' }} />
                  </Field>
                  <Field label="Temps verbal">
                    <textarea value={info.style_verb_tense} onChange={handleI('style_verb_tense')} placeholder="Present de l'indicatif..." style={{ minHeight: '60px' }} />
                  </Field>
                </div>
              </div>

              {/* Avis */}
              <div className="card" style={s.section}>
                <div className="section-title">Avis clients</div>
                <Field label="Note moyenne & tonalite">
                  <textarea value={info.reviews} onChange={handleI('reviews')} placeholder="Note Google, tonalite des avis, volume..." style={{ minHeight: '60px' }} />
                </Field>
              </div>
            </div>
          )}

          {/* ====== TAB: SEO & CONTENU ====== */}
          {tab === 'seo' && (
            <div className="fade-in">
              {/* Metadata */}
              <div className="card" style={s.section}>
                <div className="section-title">Metadonnees</div>
                <div style={s.grid3}>
                  <Field label="Titre de la categorie">
                    <input value={seo.category_title} onChange={handleS('category_title')} placeholder="ex : Pose de carrelage" />
                  </Field>
                  <Field label="Statut">
                    <input value={seo.status} onChange={handleS('status')} placeholder="ex : Termine" />
                  </Field>
                  <Field label="Catalogue ID">
                    <input value={seo.catalogue_id} onChange={handleS('catalogue_id')} placeholder="ex : VITRINE" />
                  </Field>
                </div>
                <div style={{ ...s.grid3, marginTop: '12px' }}>
                  <Field label="Categories">
                    <input value={seo.categories} onChange={handleS('categories')} placeholder="Principal, Sous-categories..." />
                  </Field>
                  <Field label="Liens">
                    <input value={seo.links} onChange={handleS('links')} placeholder="URL cible" />
                  </Field>
                  <Field label="Location SEO">
                    <input value={seo.location} onChange={handleS('location')} placeholder="ex : Pau, Morlaas" />
                  </Field>
                </div>
              </div>

              {/* Plan H2 */}
              <div className="card" style={s.section}>
                <div className="section-title">Plan H2 de l'article</div>
                <Field label="Plan H2 complet" hint="H2-1 : titre... H2-2 : titre... etc.">
                  <textarea value={seo.h2_plan} onChange={handleS('h2_plan')} placeholder="H2-1 : Quels types de carrelage posons-nous ?&#10;H2-2 : Pose en neuf ou en renovation...&#10;H2-3 : Comment se deroule un chantier...&#10;FAQ : ..." style={{ minHeight: '120px' }} />
                </Field>
              </div>

              {/* Keywords */}
              <div className="card" style={s.section}>
                <div className="section-title">Keywords & SERP</div>
                <Field label="Keywords avec volumes et competition" hint="Un keyword par ligne : Keyword : pose de carrelage Competition : 0.29 Search volume : 2800">
                  <textarea value={seo.keywords_data} onChange={handleS('keywords_data')} placeholder="Keyword : pose de carrelage Competition : 0.29 Search volume : 2800&#10;Keyword : carreleur Competition : 0.5 Search volume : 1200" style={{ minHeight: '120px' }} className="import-area" />
                </Field>
                <div style={{ marginTop: '12px' }}>
                  <Field label="Analyse SERP (Top 30)" hint="Resultats Google : Position, Titre, Description, Lien">
                    <textarea value={seo.serp_analysis} onChange={handleS('serp_analysis')} placeholder="Position : 1 ; Title : Comment poser du carrelage... ; Link : https://..." style={{ minHeight: '100px' }} className="import-area" />
                  </Field>
                </div>
              </div>

              {/* Brief SEO */}
              <div className="card" style={s.section}>
                <div className="section-title">Brief SEO</div>
                <Field label="Analyse SEO approfondie" hint="Theme, mots-cles, sujets connexes, FAQ, entites, concepts, optimisations">
                  <textarea value={seo.brief_seo} onChange={handleS('brief_seo')} placeholder="Theme principal, mots-cles secondaires, longue traine, sujets connexes, FAQ, entites nommees, concepts, suggestions d'optimisation..." style={{ minHeight: '200px' }} className="import-area" />
                </Field>
              </div>

              {/* Article content */}
              <div className="card" style={s.section}>
                <div className="section-title">Contenu de l'article</div>
                <Field label="Introduction">
                  <textarea value={seo.article_intro} onChange={handleS('article_intro')} placeholder="<p>Introduction de l'article...</p>" style={{ minHeight: '80px' }} />
                </Field>
                {[1, 2, 3, 4, 5].map(n => (
                  <div key={n} style={{ marginTop: '12px' }}>
                    <Field label={`Partie ${n} (H2 + contenu HTML)`}>
                      <textarea value={seo[`article_part${n}`]} onChange={handleS(`article_part${n}`)} placeholder={`<h2>Titre partie ${n}</h2>&#10;<p>Contenu...</p>`} style={{ minHeight: '100px' }} />
                    </Field>
                  </div>
                ))}
              </div>

              {/* FAQ */}
              <div className="card" style={s.section}>
                <div className="section-title">FAQ</div>
                <Field label="FAQ HTML" hint="Bloc FAQ complet avec balises HTML">
                  <textarea value={seo.faq_html} onChange={handleS('faq_html')} placeholder='<div class="faq-container">&#10;  <h3>Question ?</h3>&#10;  <p>Reponse...</p>&#10;</div>' style={{ minHeight: '150px' }} className="import-area" />
                </Field>
              </div>

              {/* Image prompts */}
              <div className="card" style={s.section}>
                <div className="section-title">Prompts image</div>
                <Field label="Prompts pour generation d'images">
                  <textarea value={seo.image_prompts} onChange={handleS('image_prompts')} placeholder="Prompt 1 : Photo professionnelle d'un carreleur...&#10;Prompt 2 : Vue d'une terrasse en carrelage..." style={{ minHeight: '80px' }} />
                </Field>
              </div>
            </div>
          )}

          {/* ====== TAB: IMPORT & PAYLOAD ====== */}
          {tab === 'import' && (
            <div className="fade-in">
              {/* Import zone */}
              <div className="card" style={s.section}>
                <div className="section-title">Importer un brief complet</div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Collez votre brief au format texte brut (copie depuis tableur) ou JSON structure. Les champs seront detectes automatiquement.
                </p>
                <textarea
                  className="import-area"
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder="Collez ici le contenu de votre brief (texte ou JSON)..."
                  style={{ minHeight: '250px' }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
                  <button onClick={handleImport} className="btn btn-primary btn-sm" disabled={!importText.trim()}>
                    Parser et remplir les champs
                  </button>
                  <button onClick={() => { setImportText(''); setImportResult(null) }} className="btn btn-secondary btn-sm">
                    Vider
                  </button>
                  {importResult && (
                    <span style={{ fontSize: '11px', color: 'var(--success)' }}>
                      {Object.values(importResult.base).filter(Boolean).length + Object.values(importResult.info).filter(Boolean).length + Object.values(importResult.seo).filter(Boolean).length} champs detectes
                    </span>
                  )}
                </div>
              </div>

              {/* Payload config */}
              <div className="card" style={s.section}>
                <div className="section-title">Configuration du payload</div>

                {/* Presets */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {PRESETS.map(p => (
                    <button
                      key={p.id}
                      className={`preset-btn ${activePreset === p.id ? 'preset-btn-active' : ''}`}
                      onClick={() => applyPreset(p)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Section toggles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                  {PAYLOAD_SECTIONS.map(sec => {
                    const hasData = sec.fields.some(f => info[f] || seo[f])
                    return (
                      <label key={sec.id} className="section-toggle">
                        <input
                          type="checkbox"
                          checked={activeSections.has(sec.id)}
                          onChange={() => toggleSection(sec.id)}
                        />
                        <span style={{ color: hasData ? 'var(--text-primary)' : undefined }}>
                          {sec.label}
                        </span>
                        {hasData && <span style={{ fontSize: '10px', color: 'var(--success)' }}>*</span>}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Payload preview */}
              <div className="card" style={s.section}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span className="section-title" style={{ marginBottom: 0 }}>Apercu du payload JSON</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {Object.keys(buildPayload()).length} champs | {JSON.stringify(buildPayload()).length} caracteres
                  </span>
                </div>
                <pre style={{
                  fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)',
                  background: 'var(--bg)', borderRadius: '8px', padding: '12px',
                  overflowX: 'auto', lineHeight: '1.5', maxHeight: '400px', overflowY: 'auto',
                }}>
                  {JSON.stringify(buildPayload(), null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Payload preview (collapsed, on all tabs except import) */}
          {tab !== 'import' && (
            <div className="card" style={{ ...s.section, cursor: 'pointer' }} onClick={() => setShowPayload(p => !p)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="section-title" style={{ marginBottom: 0 }}>Apercu du payload JSON</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {Object.keys(buildPayload()).length} champs
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
                    style={{ transform: showPayload ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>
              {showPayload && (
                <pre style={{
                  fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)',
                  background: 'var(--bg)', borderRadius: '8px', padding: '12px', marginTop: '12px',
                  overflowX: 'auto', lineHeight: '1.5', maxHeight: '240px', overflowY: 'auto',
                }}>
                  {JSON.stringify(buildPayload(), null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Alert */}
          {alert && (
            <div className="fade-in" style={{
              padding: '12px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px',
              background: alert.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)',
              border: `1px solid ${alert.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              color: alert.type === 'success' ? 'var(--success)' : 'var(--danger)',
            }}>
              {alert.msg}
            </div>
          )}

          {/* Launch button */}
          <button
            onClick={launch}
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%', padding: '13px', fontSize: '15px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            }}
          >
            {loading ? (
              <>
                <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Envoi en cours...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                Lancer l'automatisation Make
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  )
}
