'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'

const BRANCHES = [
  { id: 'vitrine', label: 'Site vitrine', icon: '🏪', env: 'WEBHOOK_VITRINE' },
  { id: 'ecommerce', label: 'E-commerce', icon: '🛒', env: 'WEBHOOK_ECOMMERCE' },
  { id: 'catalogue', label: 'Catalogue', icon: '📚', env: 'WEBHOOK_CATALOGUE' },
]

function StatusDot({ status }) {
  const colors = { idle: 'var(--text-muted)', ok: 'var(--success)', error: 'var(--danger)', loading: 'var(--warning)' }
  const labels = { idle: '—', ok: 'OK', error: 'Erreur', loading: '...' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: colors[status] }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: colors[status], display: 'inline-block' }} />
      {labels[status]}
    </span>
  )
}

export default function SettingsPage() {
  const [webhookStatus, setWebhookStatus] = useState({ vitrine: 'idle', ecommerce: 'idle', catalogue: 'idle' })
  const [alert, setAlert] = useState(null)
  const [callbackUrl, setCallbackUrl] = useState('')
  const [copied, setCopied] = useState(false)

  // Detect callback URL from current domain
  useEffect(() => {
    setCallbackUrl(`${window.location.origin}/api/webhook/callback`)
  }, [])

  function showAlert(msg, type = 'success') {
    setAlert({ msg, type })
    setTimeout(() => setAlert(null), 4000)
  }

  async function testWebhook(branch) {
    setWebhookStatus(s => ({ ...s, [branch]: 'loading' }))
    try {
      const res = await fetch('/api/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch }),
      })
      const data = await res.json()
      if (!data.configured) {
        setWebhookStatus(s => ({ ...s, [branch]: 'error' }))
        showAlert(`Webhook "${branch}" non configure dans les variables d'environnement Vercel.`, 'error')
      } else if (data.ok) {
        setWebhookStatus(s => ({ ...s, [branch]: 'ok' }))
        showAlert(`Webhook "${branch}" operationnel (HTTP ${data.status}).`, 'success')
      } else {
        setWebhookStatus(s => ({ ...s, [branch]: 'error' }))
        showAlert(`Erreur webhook "${branch}" : ${data.message || 'HTTP ' + data.status}`, 'error')
      }
    } catch {
      setWebhookStatus(s => ({ ...s, [branch]: 'error' }))
      showAlert('Erreur reseau lors du test.', 'error')
    }
  }

  async function testAll() {
    for (const b of BRANCHES) {
      await testWebhook(b.id)
      await new Promise(r => setTimeout(r, 300))
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Nav />
      <main style={{ flex: 1, marginLeft: '220px', padding: '32px', maxWidth: '700px' }}>
        <div className="fade-in">
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '4px' }}>Parametres</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Configuration des webhooks Make et de l'application.
            </p>
          </div>

          {alert && (
            <div className="fade-in" style={{
              padding: '11px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px',
              background: alert.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)',
              border: `1px solid ${alert.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              color: alert.type === 'success' ? 'var(--success)' : 'var(--danger)',
            }}>
              {alert.msg}
            </div>
          )}

          {/* Webhooks */}
          <div className="card" style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span className="section-title" style={{ marginBottom: 0 }}>Webhooks Make</span>
              <button onClick={testAll} className="btn btn-sm" style={{
                background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', color: '#6c63ff',
              }}>
                Tester tous
              </button>
            </div>

            <div style={{
              background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
              padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)',
              lineHeight: '1.6',
            }}>
              Les URLs webhook sont configurees via les <strong style={{ color: 'var(--text-primary)' }}>variables d'environnement Vercel</strong>,
              pas dans l'interface (pour des raisons de securite). Allez dans votre projet Vercel &rarr;{' '}
              <strong style={{ color: 'var(--text-primary)' }}>Settings &rarr; Environment Variables</strong> pour les renseigner.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {BRANCHES.map(b => (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', background: 'var(--bg)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>{b.icon}</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '1px' }}>{b.label}</div>
                      <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{b.env}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <StatusDot status={webhookStatus[b.id]} />
                    <button
                      onClick={() => testWebhook(b.id)}
                      disabled={webhookStatus[b.id] === 'loading'}
                      className="btn btn-secondary btn-sm"
                      style={{ opacity: webhookStatus[b.id] === 'loading' ? 0.5 : 1 }}
                    >
                      {webhookStatus[b.id] === 'loading' ? 'Test...' : 'Tester'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Webhook Callback URL for Make.com */}
          <div className="card" style={{ marginBottom: '12px' }}>
            <div className="section-title">Webhook de retour (Callback)</div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '14px' }}>
              Configurez ce webhook <strong style={{ color: 'var(--text-primary)' }}>en sortie de votre scenario Make</strong> pour :
            </p>
            <ul style={{ paddingLeft: '18px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Recevoir l'article genere (meta, H1, intro, body, FAQ)
              </li>
              <li style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Marquer la ligne comme terminee dans H-TIC
              </li>
              <li style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Lancer automatiquement</strong> l'article suivant en file (chainé)
              </li>
            </ul>

            <div style={{ marginBottom: '14px' }}>
              <label className="label">URL de callback a configurer dans Make</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  readOnly
                  value={callbackUrl || `${typeof window !== 'undefined' ? window.location.origin : 'https://votre-domaine.vercel.app'}/api/webhook/callback`}
                  style={{
                    flex: 1, fontFamily: 'var(--font-mono)', fontSize: '12px',
                    background: 'var(--bg)', cursor: 'text',
                  }}
                  onClick={e => e.target.select()}
                />
                <button
                  onClick={() => {
                    const url = callbackUrl || `${window.location.origin}/api/webhook/callback`
                    navigator.clipboard.writeText(url)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {copied ? 'Copie !' : 'Copier'}
                </button>
              </div>
            </div>

            <div style={{
              background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
              padding: '14px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.7',
            }}>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px', fontSize: '13px' }}>
                Configuration Make.com
              </div>
              <ol style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Dans votre scenario Make, ajoutez un module <strong style={{ color: 'var(--text-primary)' }}>HTTP &rarr; Make a request</strong> en fin de chaine</li>
                <li>URL : collez l'URL ci-dessus</li>
                <li>Methode : <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--accent-soft)', padding: '1px 5px', borderRadius: '3px' }}>POST</code></li>
                <li>Body type : <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--accent-soft)', padding: '1px 5px', borderRadius: '3px' }}>JSON</code></li>
                <li>Corps JSON attendu :</li>
              </ol>
              <pre style={{
                fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)',
                background: 'var(--bg-surface)', borderRadius: '6px', padding: '12px',
                marginTop: '8px', overflowX: 'auto', lineHeight: '1.5',
                border: '1px solid var(--border)',
              }}>{`{
  "campaignId": "{{campaignId}}",
  "lineId": "{{lineId}}",
  "status": "done",
  "meta_title": "{{meta_title}}",
  "meta_description": "{{meta_description}}",
  "h1": "{{h1}}",
  "intro": "{{intro_html}}",
  "body": "{{body_html}}",
  "faq": "{{faq_html}}"
}`}</pre>
              <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Les champs <code style={{ fontFamily: 'var(--font-mono)' }}>campaignId</code> et <code style={{ fontFamily: 'var(--font-mono)' }}>lineId</code> sont
                inclus dans le payload d'entree de votre scenario — mappez-les directement.
                Le champ <code style={{ fontFamily: 'var(--font-mono)' }}>callback_url</code> est aussi envoye dans chaque payload pour reference.
              </p>
            </div>
          </div>

          {/* Auto-chain explanation */}
          <div className="card" style={{ marginBottom: '12px' }}>
            <div className="section-title">Enchainement automatique</div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '10px' }}>
              Quand Make envoie le webhook de retour avec <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg)', padding: '1px 5px', borderRadius: '3px', fontSize: '12px' }}>status: "done"</code>,
              H-TIC lance <strong style={{ color: 'var(--text-primary)' }}>automatiquement</strong> la prochaine ligne en file de la meme campagne.
            </p>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 14px', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)',
              borderRadius: '8px', fontSize: '13px', color: '#6c63ff',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              Mettez vos lignes en file (statut "queued") → lancez la premiere → les suivantes se lancent toute seules.
            </div>
          </div>

          {/* Setup guide */}
          <div className="card" style={{ marginBottom: '12px' }}>
            <div className="section-title">Guide de configuration Vercel</div>
            <ol style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                'Ouvrez votre projet sur vercel.com',
                'Allez dans Settings → Environment Variables',
                'Ajoutez APP_PASSWORD avec votre mot de passe choisi',
                'Ajoutez JWT_SECRET avec une chaine aleatoire longue',
                'Ajoutez les 3 webhooks : WEBHOOK_VITRINE, WEBHOOK_ECOMMERCE, WEBHOOK_CATALOGUE',
                'Redéployez (Deployments → Redeploy)',
                'Testez chaque webhook depuis cette page',
              ].map((text, i) => (
                <li key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>Etape {i + 1} — </span>
                  {text}
                </li>
              ))}
            </ol>
          </div>

          {/* Note persistence */}
          <div className="card">
            <div className="section-title">Note sur la persistance</div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              Par defaut, l'historique et les campagnes sont stockes dans <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg)', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>/tmp</code> sur
              Vercel — ils se reinitialisent a chaque redeploiement. Pour une persistance complete, connectez une base de donnees
              (recommande : <strong style={{ color: 'var(--text-primary)' }}>Vercel KV</strong> ou <strong style={{ color: 'var(--text-primary)' }}>Supabase</strong>).
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
