'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import ClientNav from '@/components/ClientNav'

const BRANCHES = [
  { id: 'vitrine', label: 'Vitrine', icon: '🏪', color: 'blue' },
  { id: 'ecommerce', label: 'E-commerce', icon: '🛒', color: 'green' },
  { id: 'catalogue', label: 'Catalogue', icon: '📚', color: 'amber' },
]

const STATUS_MAP = {
  draft: { label: 'Brouillon', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)' },
  queued: { label: 'En file', color: 'var(--warning)', bg: 'var(--warning-soft)' },
  processing: { label: 'En cours', color: 'var(--blue)', bg: 'var(--blue-soft)' },
  done: { label: 'Termine', color: 'var(--success)', bg: 'var(--success-soft)' },
  error: { label: 'Erreur', color: 'var(--danger)', bg: 'var(--danger-soft)' },
}

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

function CampaignDetail({ campaign, onBack }) {
  const { loginId } = useParams()
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/portal/campaigns/${campaign.id}/lines`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setLines(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [campaign.id])

  const branchInfo = BRANCHES.find(b => b.id === campaign.branch) || BRANCHES[0]
  const stats = {
    total: lines.length,
    draft: lines.filter(l => l.status === 'draft').length,
    queued: lines.filter(l => l.status === 'queued').length,
    processing: lines.filter(l => l.status === 'processing').length,
    done: lines.filter(l => l.status === 'done').length,
    error: lines.filter(l => l.status === 'error').length,
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={onBack} className="btn btn-secondary btn-sm" style={{ padding: '6px 10px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600' }}>
            {branchInfo.icon} {campaign.name || 'Campagne'}
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {branchInfo.label} · {campaign.sector || '—'} · {new Date(campaign.createdAt).toLocaleDateString('fr')}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
        <span>{stats.total} total</span>
        <span>{stats.draft} brouillon(s)</span>
        <span style={{ color: 'var(--warning)' }}>{stats.queued} en file</span>
        {stats.processing > 0 && <span style={{ color: 'var(--blue)' }}>{stats.processing} en cours</span>}
        <span style={{ color: 'var(--success)' }}>{stats.done} termine(s)</span>
        <span style={{ color: 'var(--danger)' }}>{stats.error} erreur(s)</span>
      </div>

      {/* Lines table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Chargement...</div>
      ) : lines.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Aucune ligne dans cette campagne.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Statut</th>
                <th>URL</th>
                <th>Mot-cle</th>
                <th>Ville</th>
                <th>H1</th>
                <th style={{ width: '60px' }}>Article</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(line => (
                <tr key={line.id}>
                  <td><StatusBadge status={line.status || 'draft'} /></td>
                  <td style={{ fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {line.url || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ fontWeight: '500', color: line.keyword_main ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {line.keyword_main || '—'}
                  </td>
                  <td>{line.city || '—'}</td>
                  <td style={{ fontSize: '12px' }}>{line.h1 || '—'}</td>
                  <td>
                    {line.articleId && (
                      <a
                        href={`/portal/${loginId}/articles/${line.articleId}`}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function PortalCampaignsPage() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch('/api/portal/campaigns')
      .then(r => r.ok ? r.json() : [])
      .then(data => setCampaigns(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <ClientNav />
      <main style={{ flex: 1, marginLeft: '220px', padding: '32px', maxWidth: '920px' }}>
        {selected ? (
          <CampaignDetail campaign={selected} onBack={() => setSelected(null)} />
        ) : (
          <div className="fade-in">
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '4px' }}>Campagnes</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Vos campagnes de generation de contenu et leur avancement.
              </p>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Chargement...</div>
            ) : campaigns.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                Aucune campagne pour le moment.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {campaigns.map(camp => {
                  const branchInfo = BRANCHES.find(b => b.id === camp.branch) || BRANCHES[0]
                  const lineCount = (camp.lines || []).length
                  const doneCount = (camp.lines || []).filter(l => l.status === 'done').length
                  const errorCount = (camp.lines || []).filter(l => l.status === 'error').length

                  return (
                    <div
                      key={camp.id}
                      className="card"
                      onClick={() => setSelected(camp)}
                      style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
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
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {doneCount > 0 && <span className="badge badge-green">{doneCount} OK</span>}
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
        )}
      </main>
    </div>
  )
}
