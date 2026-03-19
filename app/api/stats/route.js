import { NextResponse } from 'next/server'
import { getArticles, getCampaigns, getHistory, getClients, ensureLoaded } from '@/lib/db'

export async function GET() {
  await ensureLoaded()

  const articles = getArticles()
  const campaigns = getCampaigns()
  const history = getHistory()
  const clients = getClients()

  // Basic totals
  const totalArticles = articles.length
  const totalCampaigns = campaigns.length
  const totalClients = clients.length
  const totalLaunches = history.length

  // Status breakdown
  const statusBreakdown = {
    sent: history.filter(h => h.status === 'sent').length,
    error: history.filter(h => h.status === 'error').length,
  }

  // Branch breakdown
  const branchBreakdown = { vitrine: 0, ecommerce: 0, catalogue: 0 }
  history.forEach(h => {
    if (branchBreakdown[h.branch] !== undefined) branchBreakdown[h.branch]++
  })

  // Articles by month (last 12 months)
  const now = new Date()
  const articlesByMonth = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    const count = articles.filter(a => {
      const ad = new Date(a.createdAt || a.updatedAt)
      return ad.getFullYear() === d.getFullYear() && ad.getMonth() === d.getMonth()
    }).length
    articlesByMonth.push({ key, label, count })
  }

  // Top clients by credits used
  const topClients = clients
    .filter(c => c.creditsUsed > 0)
    .sort((a, b) => b.creditsUsed - a.creditsUsed)
    .slice(0, 5)
    .map(c => ({
      name: `${c.firstName} ${c.lastName}`,
      creditsUsed: c.creditsUsed,
      credits: c.credits,
    }))

  // Top keywords
  const kwMap = {}
  articles.forEach(a => {
    if (a.keyword) {
      kwMap[a.keyword] = (kwMap[a.keyword] || 0) + 1
    }
  })
  history.forEach(h => {
    if (h.keyword_main) {
      kwMap[h.keyword_main] = (kwMap[h.keyword_main] || 0) + 1
    }
  })
  const topKeywords = Object.entries(kwMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }))

  // Recent activity (last 10)
  const recentActivity = history.slice(0, 10).map(h => ({
    id: h.id,
    company: h.company,
    keyword: h.keyword_main,
    branch: h.branch,
    status: h.status,
    createdAt: h.createdAt,
  }))

  // Launches by month (for dual chart)
  const launchesByMonth = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    const count = history.filter(h => {
      const hd = new Date(h.createdAt)
      return hd.getFullYear() === d.getFullYear() && hd.getMonth() === d.getMonth()
    }).length
    launchesByMonth.push({ label, articles: articlesByMonth[11 - i]?.count || 0, launches: count })
  }

  return NextResponse.json({
    totalArticles,
    totalCampaigns,
    totalClients,
    totalLaunches,
    statusBreakdown,
    branchBreakdown,
    articlesByMonth: launchesByMonth,
    topClients,
    topKeywords,
    recentActivity,
  })
}
