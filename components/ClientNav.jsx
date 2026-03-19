'use client'
import { usePathname, useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function ClientNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { loginId } = useParams()
  const [client, setClient] = useState(null)

  const base = `/portal/${loginId}`

  const LINKS = [
    {
      href: `${base}/dashboard`, label: 'Lancement', icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      ),
    },
    {
      href: `${base}/campaigns`, label: 'Campagnes', icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
        </svg>
      ),
    },
    {
      href: `${base}/articles`, label: 'Articles', icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      ),
    },
    {
      href: `${base}/history`, label: 'Historique', icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
    },
    {
      href: `${base}/support`, label: 'Support', icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
  ]

  useEffect(() => {
    fetch(`/api/auth/client/me`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setClient(data) })
      .catch(() => {})
  }, [])

  async function logout() {
    await fetch('/api/auth/client', { method: 'DELETE' })
    router.push(`/portal/${loginId}`)
  }

  const creditsLeft = client ? client.credits - client.creditsUsed : null

  return (
    <nav style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: '220px',
      background: 'var(--bg-surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', padding: '24px 14px 14px',
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px', marginBottom: '16px' }}>
        <img src="/logo-htic.png" alt="H-TIC" width={32} height={32} style={{ objectFit: 'contain', maxWidth: '32px', maxHeight: '32px' }} />
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1.2 }}>H-TIC</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>Launcher</div>
        </div>
      </div>

      {/* Credits counter */}
      {creditsLeft !== null && (
        <div style={{
          margin: '0 8px 20px',
          padding: '10px 12px',
          borderRadius: '8px',
          background: creditsLeft > 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${creditsLeft > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Credits restants
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{
              fontSize: '22px', fontWeight: '700',
              color: creditsLeft > 0 ? 'var(--success)' : 'var(--danger)',
            }}>
              {creditsLeft}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ {client.credits}</span>
          </div>
          {client.credits > 0 && (
            <div style={{
              marginTop: '8px', height: '4px', borderRadius: '2px',
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: '2px',
                width: `${Math.min(100, (creditsLeft / client.credits) * 100)}%`,
                background: creditsLeft > 0 ? 'var(--success)' : 'var(--danger)',
                transition: 'width 0.3s',
              }} />
            </div>
          )}
        </div>
      )}

      {/* Links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        {LINKS.map(link => {
          const active = pathname === link.href || pathname.startsWith(link.href + '/')
          return (
            <a
              key={link.href}
              href={link.href}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 10px', borderRadius: '8px',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: active ? 'var(--accent-soft)' : 'transparent',
                textDecoration: 'none', fontSize: '13px', fontWeight: active ? '500' : '400',
                transition: 'all 0.12s',
              }}
            >
              <span style={{ opacity: active ? 1 : 0.6 }}>{link.icon}</span>
              {link.label}
            </a>
          )
        })}
      </div>

      {/* Client name */}
      {client && (
        <div style={{
          padding: '8px 10px', marginBottom: '4px',
          fontSize: '12px', color: 'var(--text-muted)',
        }}>
          {client.firstName} {client.lastName}
        </div>
      )}

      {/* Logout */}
      <button
        onClick={logout}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '9px 10px', borderRadius: '8px', width: '100%',
          color: 'var(--text-muted)', background: 'none',
          fontSize: '13px', transition: 'color 0.12s',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Deconnexion
      </button>
    </nav>
  )
}
