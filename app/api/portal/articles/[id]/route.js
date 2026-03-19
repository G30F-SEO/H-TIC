import { NextResponse } from 'next/server'
import { verifyClientRequest } from '@/lib/portal-auth'
import { getArticle, getCampaigns, ensureLoaded } from '@/lib/db'

export async function GET(request, { params }) {
  const client = await verifyClientRequest(request)
  if (!client) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureLoaded()
  const { id } = await params
  const article = getArticle(id)
  if (!article) return NextResponse.json({ error: 'Article introuvable' }, { status: 404 })

  // Verify ownership
  const clientCampaignIds = getCampaigns().filter(c => c.clientId === client.id).map(c => c.id)
  if (!clientCampaignIds.includes(article.campaignId) && article.clientId !== client.id) {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  if (searchParams.get('format') === 'html') {
    const html = buildFullHtml(article)
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${slugify(article.keyword || article.id)}.html"`,
      },
    })
  }

  return NextResponse.json(article)
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'article'
}

function esc(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildFullHtml(article) {
  if (article.full_html) return article.full_html
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(article.meta_title || article.h1 || article.keyword)}</title>
  <meta name="description" content="${esc(article.meta_description)}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #1a1a2e; max-width: 800px; margin: 0 auto; padding: 40px 24px; }
    h1 { font-size: 2em; margin-bottom: 0.5em; color: #16213e; }
    h2 { font-size: 1.4em; margin: 1.5em 0 0.5em; color: #0f3460; }
    h3 { font-size: 1.15em; margin: 1.2em 0 0.4em; color: #16213e; }
    p { margin-bottom: 1em; }
    ul, ol { margin: 0.5em 0 1em 1.5em; }
    .faq { background: #f0f4ff; border-radius: 8px; padding: 20px; margin-top: 2em; }
    a { color: #0f3460; }
  </style>
</head>
<body>
  <h1>${article.h1 || esc(article.keyword)}</h1>
  ${article.intro ? `<div>${article.intro}</div>` : ''}
  ${article.body ? `<div>${article.body}</div>` : ''}
  ${article.faq ? `<div class="faq">${article.faq}</div>` : ''}
</body>
</html>`
}
