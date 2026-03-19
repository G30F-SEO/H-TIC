import { NextResponse } from 'next/server'
import { ensureLoaded, getCampaigns } from '@/lib/db'

function escapeCsv(val) {
  if (val == null) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export async function GET() {
  await ensureLoaded()
  const campaigns = getCampaigns()

  const headers = [
    'Campagne', 'Branche', 'Mot-cle principal', 'URL', 'Ville',
    'Statut', 'H1', 'Intention SEO', 'Mots-cles secondaires',
    'Date creation', 'Date lancement', 'Date completion',
  ]

  const rows = []
  for (const camp of campaigns) {
    for (const line of (camp.lines || [])) {
      rows.push([
        camp.name, camp.branch, line.keyword_main, line.url, line.city,
        line.status, line.h1, line.intent, line.keywords_sec,
        camp.createdAt, line.launchedAt || '', line.completedAt || '',
      ].map(escapeCsv).join(','))
    }
  }

  const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="campagnes-htic-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
