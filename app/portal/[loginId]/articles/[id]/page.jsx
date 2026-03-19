'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import ClientNav from '@/components/ClientNav'

export default function PortalArticlePage() {
  const { loginId, id } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('preview')

  useEffect(() => {
    fetch(`/api/portal/articles/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && !data.error) setArticle(data) })
      .finally(() => setLoading(false))
  }, [id])

  function downloadHtml() {
    window.open(`/api/portal/articles/${id}?format=html`, '_blank')
  }

  function downloadDoc() {
    const html = buildRawHtml(article)
    const fullDoc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${article.keyword || 'Article'}</title></head><body>${html}</body></html>`
    const blob = new Blob([fullDoc], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${article.keyword || 'article'}.doc`
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadTxt() {
    const strip = (html) => {
      if (!html) return ''
      return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim()
    }
    let text = ''
    if (article.meta_title) text += `Meta titre : ${article.meta_title}\n`
    if (article.meta_description) text += `Meta description : ${article.meta_description}\n`
    text += '\n'
    if (article.h1) text += `${article.h1}\n${'='.repeat(article.h1.length)}\n\n`
    if (article.intro) text += `${strip(article.intro)}\n\n`
    if (article.body) text += `${strip(article.body)}\n\n`
    if (article.faq) text += `--- FAQ ---\n${strip(article.faq)}\n`
    const blob = new Blob([text.trim()], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${article.keyword || 'article'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function copySection(text) {
    navigator.clipboard.writeText(text)
  }

  function stripHtml(html) {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <ClientNav />
        <main style={{ flex: 1, marginLeft: '220px', padding: '32px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Chargement...</p>
        </main>
      </div>
    )
  }

  if (!article) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <ClientNav />
        <main style={{ flex: 1, marginLeft: '220px', padding: '32px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Article introuvable</h1>
          <p style={{ color: 'var(--text-muted)' }}>Cet article n'existe pas ou a ete supprime.</p>
          <a href={`/portal/${loginId}/articles`} className="btn btn-primary btn-sm" style={{ marginTop: '16px', textDecoration: 'none' }}>
            Retour aux articles
          </a>
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
      <ClientNav />
      <main style={{ flex: 1, marginLeft: '220px', padding: '32px', maxWidth: '920px' }}>
        <div className="fade-in">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <a href={`/portal/${loginId}/articles`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '13px' }}>Articles</a>
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
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={downloadHtml} className="btn btn-primary btn-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                .HTML
              </button>
              <button onClick={downloadDoc} className="btn btn-secondary btn-sm">.DOC</button>
              <button onClick={downloadTxt} className="btn btn-secondary btn-sm">.TXT</button>
            </div>
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
            <button className={`tab ${view === 'preview' ? 'tab-active' : ''}`} onClick={() => setView('preview')}>Apercu</button>
            <button className={`tab ${view === 'sections' ? 'tab-active' : ''}`} onClick={() => setView('sections')}>Sections ({sections.length})</button>
            <button className={`tab ${view === 'html' ? 'tab-active' : ''}`} onClick={() => setView('html')}>Code HTML</button>
          </div>

          {/* Preview */}
          {view === 'preview' && (
            <div className="fade-in" style={{
              padding: '40px', borderRadius: '10px',
              background: '#ffffff', color: '#1a1a1a',
              border: '1px solid var(--border)',
            }}>
              <div style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                lineHeight: '1.8', fontSize: '16px', color: '#222',
                maxWidth: '750px', margin: '0 auto',
              }}>
                {article.h1 && <h1 style={{ fontSize: '1.7em', marginBottom: '0.6em', color: '#111', fontWeight: '700', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{article.h1}</h1>}
                {article.intro && <div dangerouslySetInnerHTML={{ __html: article.intro }} style={{ marginBottom: '1.5em', color: '#333' }} />}
                {article.body && <div dangerouslySetInnerHTML={{ __html: article.body }} style={{ color: '#222' }} />}
                {article.faq && (
                  <div style={{ background: '#f5f5f7', borderRadius: '8px', padding: '24px', marginTop: '2em', color: '#222' }}>
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
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {sec.html ? (
                        <>
                          <button onClick={() => copySection(sec.value)} className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: '11px' }}>Copier HTML</button>
                          <button onClick={() => copySection(stripHtml(sec.value))} className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: '11px' }}>Copier texte</button>
                        </>
                      ) : (
                        <button onClick={() => copySection(sec.value)} className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: '11px' }}>Copier</button>
                      )}
                    </div>
                  </div>
                  {sec.html ? (
                    <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)', maxHeight: '300px', overflowY: 'auto' }} dangerouslySetInnerHTML={{ __html: sec.value }} />
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
                <button onClick={() => copySection(buildRawHtml(article))} className="btn btn-secondary btn-sm" style={{ fontSize: '11px' }}>Copier tout le HTML</button>
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
