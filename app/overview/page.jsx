'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const BRANCH_COLORS = { vitrine: '#3b82f6', ecommerce: '#22c55e', catalogue: '#f59e0b' }
const BRANCH_LABELS = { vitrine: 'Vitrine', ecommerce: 'E-commerce', catalogue: 'Catalogue' }
const BRANCH_ICONS = { vitrine: '🏪', ecommerce: '🛒', catalogue: '📚' }

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{
          fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {label}
        </div>
        <span style={{ opacity: 0.5 }}>{icon}</span>
      </div>
      <div style={{ fontSize: '32px', fontWeight: '700', color: color || 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '8px', padding: '10px 14px', fontSize: '12px',
    }}>
      <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: '600' }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function OverviewPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.ok ? r.json() : null)
      .then(data => setStats(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Nav />
        <main style={{ flex: 1, marginLeft: '220px', padding: '32px' }}>
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '100px' }}>Chargement...</div>
        </main>
      </div>
    )
  }

  if (!stats) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Nav />
        <main style={{ flex: 1, marginLeft: '220px', padding: '32px' }}>
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '100px' }}>Erreur de chargement des statistiques.</div>
        </main>
      </div>
    )
  }

  const pieData = Object.entries(stats.branchBreakdown)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: BRANCH_LABELS[key], value, color: BRANCH_COLORS[key] }))

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Nav />
      <main style={{ flex: 1, marginLeft: '220px', padding: '32px', maxWidth: '1040px' }}>
        <div className="fade-in">
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '4px' }}>Vue d'ensemble</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Statistiques globales de votre plateforme H-TIC.
            </p>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <StatCard
              label="Articles"
              value={stats.totalArticles}
              color="var(--accent)"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
            />
            <StatCard
              label="Campagnes"
              value={stats.totalCampaigns}
              color="var(--blue)"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>}
            />
            <StatCard
              label="Clients"
              value={stats.totalClients}
              color="var(--success)"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
            />
            <StatCard
              label="Lancements"
              value={stats.totalLaunches}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>}
            />
          </div>

          {/* Status badges */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <span className="badge badge-green" style={{ fontSize: '12px', padding: '5px 12px' }}>
              {stats.statusBreakdown.sent} reussis
            </span>
            <span className="badge badge-danger" style={{ fontSize: '12px', padding: '5px 12px' }}>
              {stats.statusBreakdown.error} erreurs
            </span>
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '20px' }}>
            {/* Area chart */}
            <div className="card">
              <div className="section-title">Activite (12 derniers mois)</div>
              <div style={{ height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.articlesByMonth}>
                    <defs>
                      <linearGradient id="gradArticles" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-line)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--chart-line)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gradLaunches" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="articles" name="Articles" stroke="var(--chart-line)" fill="url(#gradArticles)" strokeWidth={2} />
                    <Area type="monotone" dataKey="launches" name="Lancements" stroke="#22c55e" fill="url(#gradLaunches)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie chart — branches */}
            <div className="card">
              <div className="section-title">Repartition par branche</div>
              {pieData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Aucune donnee
                </div>
              ) : (
                <>
                  <div style={{ height: '180px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                    {Object.entries(stats.branchBreakdown).map(([key, val]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: BRANCH_COLORS[key] }} />
                          {BRANCH_ICONS[key]} {BRANCH_LABELS[key]}
                        </span>
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Top clients */}
            <div className="card">
              <div className="section-title">Top clients</div>
              {stats.topClients.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                  Aucun client actif
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {stats.topClients.map((c, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px', borderRadius: '8px', background: 'var(--bg)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          width: '24px', height: '24px', borderRadius: '6px',
                          background: 'var(--accent-soft)', color: 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: '700',
                        }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
                          {c.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent)' }}>{c.creditsUsed}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ {c.credits}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top keywords */}
            <div className="card">
              <div className="section-title">Mots-cles populaires</div>
              {stats.topKeywords.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                  Aucun mot-cle
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {stats.topKeywords.map((kw, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '5px 10px', borderRadius: '20px', fontSize: '12px',
                      background: i < 3 ? 'var(--accent-soft)' : 'var(--bg)',
                      color: i < 3 ? 'var(--accent)' : 'var(--text-secondary)',
                      border: `1px solid ${i < 3 ? 'var(--accent-border)' : 'var(--border)'}`,
                      fontWeight: i < 3 ? '500' : '400',
                    }}>
                      {kw.keyword}
                      <span style={{ fontSize: '10px', opacity: 0.7 }}>({kw.count})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent activity */}
          {stats.recentActivity.length > 0 && (
            <div className="card" style={{ marginTop: '14px' }}>
              <div className="section-title">Activite recente</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {stats.recentActivity.map(a => (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px', borderRadius: '8px',
                    fontSize: '13px',
                  }}>
                    <span style={{ fontSize: '14px' }}>{BRANCH_ICONS[a.branch] || '📄'}</span>
                    <span style={{ fontWeight: '500', color: 'var(--text-primary)', minWidth: '120px' }}>
                      {a.company || '—'}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', flex: 1 }}>
                      {a.keyword || '—'}
                    </span>
                    <span className={`badge badge-${a.status === 'sent' ? 'success' : 'danger'}`}>
                      {a.status === 'sent' ? 'OK' : 'Erreur'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(a.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
