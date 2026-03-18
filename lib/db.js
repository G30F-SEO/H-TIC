import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'

const DATA_DIR = '/tmp/htic-data'
const HISTORY_FILE = path.join(DATA_DIR, 'history.json')
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'campaigns.json')
const LOGS_FILE = path.join(DATA_DIR, 'logs.json')
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json')

// --- Store key mapping (file path -> DB key) ---
const STORE_KEYS = {
  [HISTORY_FILE]: 'htic:history',
  [CAMPAIGNS_FILE]: 'htic:campaigns',
  [LOGS_FILE]: 'htic:logs',
  [ARTICLES_FILE]: 'htic:articles',
}

// =============================================
// Supabase persistence layer
// Table required: htic_store (key TEXT PRIMARY KEY, data JSONB, updated_at TIMESTAMPTZ)
// =============================================
function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return (url && key) ? { url, key } : null
}

let _supabase = null
function getSupabase() {
  if (_supabase) return _supabase
  const config = getSupabaseConfig()
  if (!config) return null
  try {
    // Dynamic import is async, so we use the REST API directly for sync-friendly usage
    const { createClient } = require('@supabase/supabase-js')
    _supabase = createClient(config.url, config.key)
    return _supabase
  } catch {
    return null
  }
}

function isDbConfigured() {
  return !!getSupabaseConfig()
}

// --- Sync Layer ---
const _loaded = new Set()
let _syncPromise = null

/**
 * syncFrom(file) - On cold start, load data from Supabase into /tmp.
 */
async function syncFrom(file) {
  if (_loaded.has(file)) return
  _loaded.add(file)

  if (existsSync(file)) return

  const sb = getSupabase()
  if (!sb) return

  const storeKey = STORE_KEYS[file]
  if (!storeKey) return

  try {
    const { data, error } = await sb
      .from('htic_store')
      .select('data')
      .eq('key', storeKey)
      .single()

    if (!error && data?.data !== null && data?.data !== undefined) {
      ensureDir()
      writeFileSync(file, JSON.stringify(data.data, null, 2))
      console.log(`[db] Loaded ${storeKey} from Supabase`)
    }
  } catch (err) {
    console.error(`[db] syncFrom failed for ${storeKey}:`, err.message)
  }
}

/**
 * syncTo(file) - Fire-and-forget persist to Supabase after every write.
 */
function syncTo(file) {
  if (!isDbConfigured()) return

  const promise = (async () => {
    const sb = getSupabase()
    if (!sb) return

    const storeKey = STORE_KEYS[file]
    if (!storeKey) return

    try {
      const raw = readFileSync(file, 'utf-8')
      const jsonData = JSON.parse(raw)
      const { error } = await sb
        .from('htic_store')
        .upsert({
          key: storeKey,
          data: jsonData,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' })

      if (error) {
        console.error(`[db] syncTo failed for ${storeKey}:`, error.message)
      }
    } catch (err) {
      console.error(`[db] syncTo failed for ${storeKey}:`, err.message)
    }
  })()

  _syncPromise = promise
  promise.catch(() => {})
}

/**
 * syncAllFromKV() - Eagerly loads ALL data from Supabase on cold start.
 */
export async function syncAllFromKV() {
  if (!isDbConfigured()) return
  await Promise.all([
    syncFrom(CAMPAIGNS_FILE),
    syncFrom(HISTORY_FILE),
    syncFrom(LOGS_FILE),
    syncFrom(ARTICLES_FILE),
  ])
}

/**
 * waitForSync() - Await the last sync promise.
 */
export async function waitForSync() {
  if (_syncPromise) await _syncPromise
}

// --- Core file helpers ---
function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function readJson(file, fallback = []) {
  if (!_loaded.has(file)) {
    syncFrom(file).catch(() => {})
  }

  try {
    if (!existsSync(file)) return fallback
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch {
    return fallback
  }
}

function writeJson(file, data) {
  ensureDir()
  writeFileSync(file, JSON.stringify(data, null, 2))
  syncTo(file)
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// --- History ---
export function getHistory() {
  return readJson(HISTORY_FILE)
}

export function addHistoryEntry(entry) {
  const history = getHistory()
  const newEntry = { id: uid('h'), ...entry, createdAt: new Date().toISOString() }
  history.unshift(newEntry)
  writeJson(HISTORY_FILE, history.slice(0, 500))
  return newEntry
}

export function clearHistory() {
  writeJson(HISTORY_FILE, [])
}

// --- Campaigns (parent) ---
// Structure: { id, name, branch, sector, tone, word_count, lang, info: {...}, lines: [...], createdAt, updatedAt }
export function getCampaigns() {
  const campaigns = readJson(CAMPAIGNS_FILE)
  // Migration: if old flat rows exist (no lines array), wrap them
  return campaigns.map(c => {
    if (!c.lines && c.keyword_main) {
      // Old format row -> convert to campaign with one line
      const { keyword_main, keywords_sec, url, city, intent, h1, extra, status, launchedAt, completedAt, error, makeStatus, product_name, product_price, product_ref, cat_product, cat_ref, cat_specs, ...rest } = c
      return {
        ...rest,
        lines: [{
          id: uid('ln'),
          url: url || '', city: city || '', keyword_main: keyword_main || '',
          keywords_sec: keywords_sec || '', intent: intent || '', h1: h1 || '',
          extra: extra || '', status: status || 'draft',
          launchedAt, completedAt, error, makeStatus,
          product_name: product_name || '', product_price: product_price || '', product_ref: product_ref || '',
          cat_product: cat_product || '', cat_ref: cat_ref || '', cat_specs: cat_specs || '',
        }],
      }
    }
    if (!c.lines) c.lines = []
    return c
  })
}

export function saveCampaigns(campaigns) {
  writeJson(CAMPAIGNS_FILE, campaigns)
}

export function getCampaign(id) {
  return getCampaigns().find(c => c.id === id) || null
}

export function addCampaign(data) {
  const campaigns = getCampaigns()
  const campaign = {
    id: uid('camp'),
    name: data.name || '',
    branch: data.branch || 'vitrine',
    sector: data.sector || '',
    tone: data.tone || 'expert',
    word_count: data.word_count || '1200',
    lang: data.lang || 'fr',
    description: data.description || '',
    info: data.info || {},
    lines: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  campaigns.push(campaign)
  saveCampaigns(campaigns)
  return campaign
}

export function updateCampaign(id, updates) {
  const campaigns = getCampaigns()
  const idx = campaigns.findIndex(c => c.id === id)
  if (idx === -1) return null
  // Don't allow overwriting lines through updates unless explicitly provided
  const { lines, ...safeUpdates } = updates
  campaigns[idx] = { ...campaigns[idx], ...safeUpdates, updatedAt: new Date().toISOString() }
  if (lines !== undefined) campaigns[idx].lines = lines
  saveCampaigns(campaigns)
  return campaigns[idx]
}

export function deleteCampaign(id) {
  const campaigns = getCampaigns().filter(c => c.id !== id)
  saveCampaigns(campaigns)
}

export function deleteCampaigns(ids) {
  const campaigns = getCampaigns().filter(c => !ids.includes(c.id))
  saveCampaigns(campaigns)
}

// --- Lines (children of a campaign) ---
export function addLine(campaignId, data) {
  const campaigns = getCampaigns()
  const idx = campaigns.findIndex(c => c.id === campaignId)
  if (idx === -1) return null
  const line = {
    id: uid('ln'),
    url: data.url || '',
    city: data.city || '',
    keyword_main: data.keyword_main || '',
    keywords_sec: data.keywords_sec || '',
    intent: data.intent || '',
    h1: data.h1 || '',
    extra: data.extra || '',
    status: 'draft',
    launchedAt: null,
    completedAt: null,
    error: null,
    makeStatus: null,
    // E-commerce
    product_name: data.product_name || '',
    product_price: data.product_price || '',
    product_ref: data.product_ref || '',
    // Catalogue
    cat_product: data.cat_product || '',
    cat_ref: data.cat_ref || '',
    cat_specs: data.cat_specs || '',
    createdAt: new Date().toISOString(),
  }
  campaigns[idx].lines.push(line)
  saveCampaigns(campaigns)
  return line
}

export function updateLine(campaignId, lineId, updates) {
  const campaigns = getCampaigns()
  const campIdx = campaigns.findIndex(c => c.id === campaignId)
  if (campIdx === -1) return null
  const lineIdx = campaigns[campIdx].lines.findIndex(l => l.id === lineId)
  if (lineIdx === -1) return null
  campaigns[campIdx].lines[lineIdx] = { ...campaigns[campIdx].lines[lineIdx], ...updates }
  saveCampaigns(campaigns)
  return campaigns[campIdx].lines[lineIdx]
}

export function deleteLines(campaignId, lineIds) {
  const campaigns = getCampaigns()
  const campIdx = campaigns.findIndex(c => c.id === campaignId)
  if (campIdx === -1) return
  campaigns[campIdx].lines = campaigns[campIdx].lines.filter(l => !lineIds.includes(l.id))
  saveCampaigns(campaigns)
}

// --- Logs ---
export function getLogs() {
  return readJson(LOGS_FILE)
}

export function addLog(level, message, meta = {}) {
  const logs = getLogs()
  const entry = { id: uid('l'), level, message, meta, timestamp: new Date().toISOString() }
  logs.unshift(entry)
  writeJson(LOGS_FILE, logs.slice(0, 1000))
  return entry
}

export function clearLogs() {
  writeJson(LOGS_FILE, [])
}

// --- Articles (generated content) ---
export function getArticles() {
  return readJson(ARTICLES_FILE)
}

export function getArticle(id) {
  return getArticles().find(a => a.id === id) || null
}

export function getArticleByLine(campaignId, lineId) {
  return getArticles().find(a => a.campaignId === campaignId && a.lineId === lineId) || null
}

export function getArticlesByCampaign(campaignId) {
  return getArticles().filter(a => a.campaignId === campaignId)
}

export function saveArticle(data) {
  const articles = getArticles()
  // Upsert: replace if same campaignId+lineId exists
  const existing = articles.findIndex(a => a.campaignId === data.campaignId && a.lineId === data.lineId)
  const article = {
    id: existing >= 0 ? articles[existing].id : uid('art'),
    campaignId: data.campaignId,
    lineId: data.lineId,
    company: data.company || '',
    keyword: data.keyword || '',
    url: data.url || '',
    city: data.city || '',
    // Content sections
    meta_title: data.meta_title || '',
    meta_description: data.meta_description || '',
    h1: data.h1 || '',
    intro: data.intro || '',
    body: data.body || '',
    faq: data.faq || '',
    // Raw full HTML if provided
    full_html: data.full_html || '',
    createdAt: existing >= 0 ? articles[existing].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  if (existing >= 0) {
    articles[existing] = article
  } else {
    articles.unshift(article)
  }
  writeJson(ARTICLES_FILE, articles.slice(0, 500))
  return article
}

export function deleteArticle(id) {
  const articles = getArticles().filter(a => a.id !== id)
  writeJson(ARTICLES_FILE, articles)
}
