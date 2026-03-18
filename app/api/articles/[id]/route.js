import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getArticle, ensureLoaded } from '@/lib/db'

export async function GET(request, { params }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await ensureLoaded()

  const { id } = await params
  const article = getArticle(id)
  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 })

  // Check if download requested
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format')

  if (format === 'html') {
    // Return downloadable HTML file
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
    .meta { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 0.9em; color: #495057; }
    .meta strong { color: #212529; }
    .faq { background: #f0f4ff; border-radius: 8px; padding: 20px; margin-top: 2em; }
    .faq h2 { color: #0f3460; margin-top: 0; }
    a { color: #0f3460; }
  </style>
</head>
<body>
  <div class="meta">
    <p><strong>Mot-cle :</strong> ${esc(article.keyword)}</p>
    <p><strong>Meta titre :</strong> ${esc(article.meta_title)}</p>
    <p><strong>Meta description :</strong> ${esc(article.meta_description)}</p>
    ${article.url ? `<p><strong>URL :</strong> ${esc(article.url)}</p>` : ''}
    ${article.city ? `<p><strong>Ville :</strong> ${esc(article.city)}</p>` : ''}
  </div>

  <h1>${article.h1 || esc(article.keyword)}</h1>

  ${article.intro ? `<div class="intro">${article.intro}</div>` : ''}

  ${article.body ? `<div class="body">${article.body}</div>` : ''}

  ${article.faq ? `<div class="faq">${article.faq}</div>` : ''}
</body>
</html>`
}

function esc(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
