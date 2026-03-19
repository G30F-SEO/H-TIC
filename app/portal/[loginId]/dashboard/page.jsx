'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import ClientNav from '@/components/ClientNav'

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

const SEO_INTENTS = [
  { value: '', label: 'Selectionnez une intention...' },
  { value: 'Rassurer et convertir', label: 'Rassurer et convertir' },
  { value: 'Informer et eduquer', label: 'Informer et eduquer' },
  { value: 'Comparer des solutions', label: 'Comparer des solutions' },
  { value: 'Guider un choix', label: 'Guider un choix' },
  { value: 'Resoudre un probleme', label: 'Resoudre un probleme' },
  { value: 'Presenter une nouveaute', label: 'Presenter une nouveaute' },
  { value: 'custom', label: 'Personnalise...' },
]

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

export default function ClientDashboard() {
  const { loginId } = useParams()
  const [branch, setBranch] = useState('vitrine')
  const [form, setForm] = useState({
    company: '', url: '', city: '', sector: '', description: '',
    keyword_main: '', keywords_sec: '', intent: '', h1: '',
    word_count: '1200', tone: 'expert', lang: 'fr', extra: '',
    product_name: '', product_price: '', product_ref: '',
    cat_product: '', cat_ref: '', cat_specs: '',
  })
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState(null)
  const [client, setClient] = useState(null)

  useEffect(() => {
    fetch('/api/auth/client/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setClient(data) })
      .catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handle = k => e => set(k, e.target.value)
  const secondaryTags = form.keywords_sec.split(',').map(s => s.trim()).filter(Boolean)
  const creditsLeft = client ? client.credits - client.creditsUsed : null

  async function launch() {
    if (!form.company || !form.url || !form.keyword_main) {
      setAlert({ type: 'error', msg: 'Remplissez les champs obligatoires : entreprise, URL et mot-cle principal.' })
      return
    }
    if (creditsLeft !== null && creditsLeft <= 0) {
      setAlert({ type: 'error', msg: 'Plus de credits disponibles. Contactez H-TIC pour en obtenir davantage.' })
      return
    }
    setLoading(true)
    setAlert(null)
    try {
      const payload = {
        branch, company: form.company, url: form.url, city: form.city,
        sector: form.sector, description: form.description,
        keyword_main: form.keyword_main, keywords_secondary: form.keywords_sec,
        intent: form.intent, h1: form.h1, word_count: form.word_count,
        tone: form.tone, language: form.lang, extra_instructions: form.extra,
        clientId: client?.id,
      }
      if (branch === 'ecommerce') Object.assign(payload, { product_name: form.product_name, product_price: form.product_price, product_ref: form.product_ref })
      if (branch === 'catalogue') Object.assign(payload, { cat_product: form.cat_product, cat_ref: form.cat_ref, cat_specs: form.cat_specs })

      const res = await fetch('/api/portal/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        setAlert({ type: 'success', msg: `Lancement reussi pour "${form.company}" !` })
        // Refresh client data to update credits
        const meRes = await fetch('/api/auth/client/me')
        if (meRes.ok) setClient(await meRes.json())
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <ClientNav />
      <main style={{ flex: 1, marginLeft: '220px', padding: '32px', maxWidth: '920px' }}>
        <div className="fade-in">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '4px' }}>Lancement rapide</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Lancez la generation d'un article. Chaque lancement consomme 1 credit.
                {creditsLeft !== null && (
                  <span style={{ color: creditsLeft > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: '600' }}>
                    {' '}({creditsLeft} credit{creditsLeft !== 1 ? 's' : ''} restant{creditsLeft !== 1 ? 's' : ''})
                  </span>
                )}
              </p>
            </div>
          </div>

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
              <Field label="URL cible" required>
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
              <textarea value={form.description} onChange={handle('description')} placeholder="Anciennete, specialites, valeurs..." style={{ minHeight: '70px' }} />
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
              <Field label="Intention SEO">
                <select
                  value={SEO_INTENTS.some(i => i.value === form.intent) ? form.intent : 'custom'}
                  onChange={e => {
                    if (e.target.value === 'custom') set('intent', '')
                    else set('intent', e.target.value)
                  }}
                >
                  {SEO_INTENTS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
                {!SEO_INTENTS.some(i => i.value === form.intent && i.value !== 'custom' && i.value !== '') && form.intent !== '' && (
                  <input value={form.intent} onChange={handle('intent')} placeholder="Saisissez votre intention SEO..." style={{ marginTop: '6px' }} />
                )}
              </Field>
              <Field label="H1 suggere">
                <input value={form.h1} onChange={handle('h1')} placeholder="ex : Pose de carrelage a Pau" />
              </Field>
            </div>
            <div style={s.grid3}>
              <Field label="Nombre de mots">
                <select value={form.word_count} onChange={handle('word_count')}>
                  {WORD_COUNTS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </Field>
              <Field label="Ton">
                <select value={form.tone} onChange={handle('tone')}>
                  {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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
                <Field label="Nom du produit"><input value={form.product_name} onChange={handle('product_name')} placeholder="ex : Carrelage 60x60" /></Field>
                <Field label="Prix indicatif"><input value={form.product_price} onChange={handle('product_price')} placeholder="ex : 15 EUR / m2" /></Field>
                <Field label="Reference"><input value={form.product_ref} onChange={handle('product_ref')} placeholder="ex : SKU-001" /></Field>
              </div>
            </div>
          )}

          {/* Catalogue specific */}
          {branch === 'catalogue' && (
            <div className="card fade-in" style={s.section}>
              <div className="section-title">Specifique catalogue</div>
              <div style={{ ...s.grid2, marginBottom: '12px' }}>
                <Field label="Nom du produit"><input value={form.cat_product} onChange={handle('cat_product')} placeholder="ex : Dalle terrasse 20mm" /></Field>
                <Field label="Numero de catalogue"><input value={form.cat_ref} onChange={handle('cat_ref')} placeholder="ex : CAT-2025-047" /></Field>
              </div>
              <Field label="Caracteristiques techniques">
                <textarea value={form.cat_specs} onChange={handle('cat_specs')} placeholder="Dimensions, matiere, resistance..." style={{ minHeight: '60px' }} />
              </Field>
            </div>
          )}

          {/* Extra */}
          <div className="card" style={s.section}>
            <div className="section-title">Instructions supplementaires</div>
            <Field label="Instructions">
              <textarea value={form.extra} onChange={handle('extra')} placeholder="Ex : eviter le mot 'innovant', inclure une FAQ de 4 questions..." style={{ minHeight: '70px', resize: 'vertical' }} />
            </Field>
          </div>

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
            disabled={loading || (creditsLeft !== null && creditsLeft <= 0)}
            className="btn btn-primary"
            style={{ width: '100%', padding: '13px', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
          >
            {loading ? (
              <><svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Envoi en cours...</>
            ) : creditsLeft !== null && creditsLeft <= 0 ? (
              'Plus de credits disponibles'
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Lancer (1 credit)</>
            )}
          </button>
        </div>
      </main>
    </div>
  )
}
