import { NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'

const DATA_DIR = '/tmp/htic-data'
const TEMPLATES_FILE = path.join(DATA_DIR, 'templates.json')

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function getTemplates() {
  if (!existsSync(TEMPLATES_FILE)) return []
  try { return JSON.parse(readFileSync(TEMPLATES_FILE, 'utf-8')) } catch { return [] }
}

function saveTemplates(templates) {
  ensureDir()
  writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2))
}

function uid() {
  return 'tpl-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// GET — list all templates
export async function GET() {
  return NextResponse.json(getTemplates())
}

// POST — save a campaign as template
export async function POST(request) {
  const { name, branch, sector, tone, word_count, lang, description, info, lines } = await request.json()
  if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

  const template = {
    id: uid(),
    name,
    branch: branch || 'vitrine',
    sector: sector || '',
    tone: tone || 'expert',
    word_count: word_count || '1200',
    lang: lang || 'fr',
    description: description || '',
    info: info || {},
    lines: (lines || []).map(l => ({
      url: l.url || '', city: l.city || '', keyword_main: l.keyword_main || '',
      keywords_sec: l.keywords_sec || '', intent: l.intent || '', h1: l.h1 || '',
      extra: l.extra || '',
      product_name: l.product_name || '', product_price: l.product_price || '', product_ref: l.product_ref || '',
      cat_product: l.cat_product || '', cat_ref: l.cat_ref || '', cat_specs: l.cat_specs || '',
    })),
    createdAt: new Date().toISOString(),
  }

  const templates = getTemplates()
  templates.unshift(template)
  saveTemplates(templates)

  return NextResponse.json(template)
}

// DELETE — delete a template
export async function DELETE(request) {
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const templates = getTemplates().filter(t => t.id !== id)
  saveTemplates(templates)

  return NextResponse.json({ ok: true })
}
