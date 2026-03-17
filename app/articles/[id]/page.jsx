'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Nav from '@/components/Nav'

export default function ArticlePage() {
  const { id } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('preview') // 'preview' | 'html' | 'sections'

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then(r => r.json())
      .then(data => { if (!data.error) setArticle(data) })
      .finally(() => setLoading(false))
  }, [id])

  function downloadHtml() {
    window.open(`/api/articles/${id}?format=html`, '_blank')
  }

  function copySection(text) {
    navigator.clipboard.writeText(text)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Nav />
        <main style={{ flex: 1, marginLeft: '220px', padding: '32px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Chargement...</p>
        </main>
      </div>
    )
  }

  if (!article) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Nav />
        <main style={{ flex: 1, marginLeft: '220px', padding: '32px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Article introuvable</h1>
          <p style={{ color: 'var(--text-muted)' }}>Cet article n'existe pas ou a ete supprime.</p>
          <a href="/campaigns" className="btn btn-primary btn-sm" style={{ marginTop: '16px', textDecoration: 'none' }}>Retour aux campagnes</a>
        </main>
      </div>
    )
  }

  const sections = [
    { key: 'meta_title', label: 'Meta titre', value: article.meta_title },
    { key: 'meta_description', label: 'Meta description', value: article.meta_description },
    { key: 'h1', label: 'H1', value: article.h1 },
    { key: 'intro', label: 'Introduction', value: article.intro, html: true },
    { key: 'body', label: 'Corps de texte', value: article.body, html: true },
    { key: 'faq', label: 'FAQ', value: article.faq, html: true },
  ].filter(s => s.value)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Nav />
      <main style={{ flex: 1, marginLeft: '220px', padding: '32px', maxWidth: '1000px' }}>
        <div className="fade-in">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <a href="/campaigns" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '13px' }}>Campagnes</a>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>/</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{article.company || 'Article'}</span>
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '4px' }}>
                {article.keyword || article.h1 || 'Article'}
              </h1>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                {article.url && <span>{article.url}</span>}
                {article.city && <span>{article.city}</span>}
                <span>Genere le {new Date(article.updatedAt).toLocaleDateString('fr')}</span>
              </div>
            </div>
            <button onClick={downloadHtml} className="btn btn-primary btn-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Telecharger HTML
            </button>
          </div>

          {/* Meta card */}
          <div className="card" style={{ marginBottom: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div className="label">Mot-cle</div>
                <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{article.keyword || '—'}</div>
              </div>
              <div>
                <div className="label">URL cible</div>
                <div style={{ fontSize: '13px' }}>{article.url || '—'}</div>
              </div>
            </div>
            {(article.meta_title || article.meta_description) && (
              <div style={{ marginTop: '14px', padding: '12px', background: 'var(--bg)', borderRadius: '8px' }}>
                {article.meta_title && (
                  <div style={{ marginBottom: '6px' }}>
                    <span className="label" style={{ display: 'inline', marginBottom: 0 }}>Meta titre : </span>
                    <span style={{ color: 'var(--blue)', fontSize: '14px' }}>{article.meta_title}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '6px' }}>({article.meta_title.length} car.)</span>
                  </div>
                )}
                {article.meta_description && (
                  <div>
                    <span className="label" style={{ display: 'inline', marginBottom: 0 }}>Meta description : </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{article.meta_description}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '6px' }}>({article.meta_description.length} car.)</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* View tabs */}
          <div className="tabs">
            <button className={`tab ${view === 'preview' ? 'tab-active' : ''}`} onClick={() => setView('preview')}>
              Apercu
            </button>
            <button className={`tab ${view === 'sections' ? 'tab-active' : ''}`} onClick={() => setView('sections')}>
              Sections ({sections.length})
            </button>
            <button className={`tab ${view === 'html' ? 'tab-active' : ''}`} onClick={() => setView('html')}>
              Code HTML
            </button>
          </div>

          {/* Preview */}
          {view === 'preview' && (
            <div className="card fade-in" style={{ padding: '32px' }}>
              <div style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                lineHeight: '1.7', color: '#1a1a2e', fontSize: '15px',
              }}>
                {article.h1 && <h1 style={{ fontSize: '1.8em', marginBottom: '0.5em', color: '#16213e', fontWeight: '700' }}>{article.h1}</h1>}
                {article.intro && <div dangerouslySetInnerHTML={{ __html: article.intro }} style={{ marginBottom: '1.5em' }} />}
                {article.body && <div dangerouslySetInnerHTML={{ __html: article.body }} />}
                {article.faq && (
                  <div style={{ background: 'rgba(108,99,255,0.05)', borderRadius: '8px', padding: '20px', marginTop: '2em' }}>
                    <div dangerouslySetInnerHTML={{ __html: article.faq }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sections view */}
          {view === 'sections' && (
            <div className="fade-in" style={{ display: 'grid', gap: '10px' }}>
              {sections.map(sec => (
                <div key={sec.key} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span className="section-title" style={{ marginBottom: 0 }}>{sec.label}</span>
                    <button onClick={() => copySection(sec.value)} className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: '11px' }}>
                      Copier
                    </button>
                  </div>
                  {sec.html ? (
                    <div
                      style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)', maxHeight: '300px', overflowY: 'auto' }}
                      dangerouslySetInnerHTML={{ __html: sec.value }}
                    />
                  ) : (
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: sec.key === 'h1' ? '600' : '400' }}>
                      {sec.value}
                      {(sec.key === 'meta_title' || sec.key === 'meta_description') && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '8px' }}>({sec.value.length} car.)</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* HTML view */}
          {view === 'html' && (
            <div className="card fade-in">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <button onClick={() => copySection(buildRawHtml(article))} className="btn btn-secondary btn-sm" style={{ fontSize: '11px' }}>
                  Copier tout le HTML
                </button>
              </div>
              <pre style={{
                fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)',
                background: 'var(--bg)', borderRadius: '8px', padding: '16px',
                overflowX: 'auto', lineHeight: '1.5', maxHeight: '600px', overflowY: 'auto',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {buildRawHtml(article)}
              </pre>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function buildRawHtml(article) {
  if (article.full_html) return article.full_html
  let html = ''
  if (article.h1) html += `<h1>${article.h1}</h1>\n\n`
  if (article.intro) html += `${article.intro}\n\n`
  if (article.body) html += `${article.body}\n\n`
  if (article.faq) html += `${article.faq}\n`
  return html.trim()
}
