'use client'
import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function ClientLoginPage() {
  const { loginId } = useParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push(`/portal/${loginId}/dashboard`)
      } else {
        setError(data.error || 'Identifiants incorrects.')
      }
    } catch {
      setError('Erreur reseau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '24px',
    }}>
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '300px',
        background: 'radial-gradient(ellipse, rgba(108,99,255,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="fade-in" style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <img
            src="/logo-htic.png"
            alt="H-TIC"
            height={56}
            style={{ marginBottom: '16px', objectFit: 'contain' }}
          />
          <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
            Espace Client
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Connectez-vous a votre espace
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card" style={{ padding: '28px' }}>
            <div className="field" style={{ marginBottom: '16px' }}>
              <label className="label">Identifiant</label>
              <input
                type="text"
                value={loginId}
                disabled
                style={{ opacity: 0.6 }}
              />
            </div>
            <div className="field" style={{ marginBottom: '16px' }}>
              <label className="label">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoFocus
                required
              />
            </div>

            {error && (
              <div style={{
                background: 'var(--danger-soft)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '8px', padding: '10px 12px',
                color: 'var(--danger)', fontSize: '13px', marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="btn btn-primary"
              style={{
                width: '100%', padding: '11px',
                fontSize: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {loading ? (
                <>
                  <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Connexion...
                </>
              ) : 'Se connecter'}
            </button>
          </div>
        </form>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px' }}>
          Session valide 8 heures
        </p>
      </div>

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        padding: '14px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
      }}>
        <a
          href="https://www.h-tic.fr/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            color: 'var(--text-muted)', textDecoration: 'none',
            fontSize: '12px',
          }}
        >
          <img src="/logo-htic.png" alt="H-TIC" height={18} style={{ objectFit: 'contain', opacity: 0.7 }} />
          <span>h-tic.fr</span>
        </a>
      </div>
    </div>
  )
}
