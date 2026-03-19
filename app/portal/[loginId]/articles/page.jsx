'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import ClientNav from '@/components/ClientNav'

export default function PortalArticlesPage() {
  const { loginId } = useParams()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/portal/articles')
      .then(r => r.ok ? r.json() : [])
      .then(data => setArticles(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <ClientNav />
      <main style={{ flex: 1, marginLeft: '220px', padding: '32px', maxWidth: '920px' }}>
        <div className="fade-in">
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '4px' }}>Articles generes</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Vos contenus generes. Visualisez et telechargez en HTML.
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Chargement...</div>
          ) : articles.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Aucun article genere pour le moment.</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                Les articles apparaitront ici apres generation.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {articles.map(art => (
                <a
                  key={art.id}
                  href={`/portal/${loginId}/articles/${art.id}`}
                  className="card"
                  style={{ textDecoration: 'none', transition: 'border-color 0.15s' }}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = ''}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '2px' }}>
                        {art.keyword || art.h1 || 'Sans titre'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {art.company && <span>{art.company} · </span>}
                        {art.url && <span>{art.url} · </span>}
                        {art.city && <span>{art.city} · </span>}
                        {new Date(art.updatedAt).toLocaleDateString('fr')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {art.meta_title && <span className="badge badge-blue">Meta</span>}
                      {art.body && <span className="badge badge-green">Contenu</span>}
                      {art.faq && <span className="badge badge-amber">FAQ</span>}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
