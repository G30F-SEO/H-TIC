import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'

const DATA_DIR = '/tmp/htic-data'
const HISTORY_FILE = path.join(DATA_DIR, 'history.json')
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'campaigns.json')
const LOGS_FILE = path.join(DATA_DIR, 'logs.json')
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json')

// --- KV key mapping ---
const KV_KEYS = {
  [HISTORY_FILE]: 'htic:history',
  [CAMPAIGNS_FILE]: 'htic:campaigns',
  [LOGS_FILE]: 'htic:logs',
  [ARTICLES_FILE]: 'htic:articles',
}

// --- KV availability ---
function isKVConfigured() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

let _kv = null
async function getKV() {
  if (!isKVConfigured()) return null
  if (!_kv) {
    try {
      const mod = await import('@vercel/kv')
      _kv = mod.kv
    } catch {
      _kv = null
    }
  }
  return _kv
}

// --- KV Sync Layer ---
// Track which files have been loaded from KV on this cold start
const _kvLoaded = new Set()
let _kvSyncPromise = null

/**
 * syncFromKV() - Called on first data access per file.
 * If the /tmp file does not exist and KV is configured, loads data from KV into /tmp.
 * This handles the Vercel cold-start scenario where /tmp is wiped.
 * Returns a promise but callers don't await it on the hot path.
 */
export async function syncFromKV(file) {
  if (_kvLoaded.has(file)) return
  _kvLoaded.add(file)

  // If the /tmp file already exists, no need to load from KV
  if (existsSync(file)) return

  const kv = await getKV()
  if (!kv) return

  const kvKey = KV_KEYS[file]
  if (!kvKey) return

  try {
    const data = await kv.get(kvKey)
    if (data !== null && data !== undefined) {
      ensureDir()
      writeFileSync(file, JSON.stringify(data, null, 2))
    }
  } catch (err) {
    console.error(`[db] syncFromKV failed for ${kvKey}:`, err.message)
  }
}

/**
 * syncToKV(file) - Fire-and-forget async persist to KV after every write.
 * Reads the current /tmp file content and pushes it to KV.
 */
function syncToKV(file) {
  if (!isKVConfigured()) return

  // Fire and forget - don't block the caller
  const promise = (async () => {
    const kv = await getKV()
    if (!kv) return

    const kvKey = KV_KEYS[file]
    if (!kvKey) return

    try {
      const raw = readFileSync(file, 'utf-8')
      const data = JSON.parse(raw)
      await kv.set(kvKey, data)
    } catch (err) {
      console.error(`[db] syncToKV failed for ${kvKey}:`, err.message)
    }
  })()

  // Store the promise so it can be awaited in tests or shutdown hooks if needed
  _kvSyncPromise = promise
  promise.catch(() => {}) // prevent unhandled rejection
}

/**
 * syncAllFromKV() - Eagerly loads ALL data files from KV on cold start.
 * Call this once at app startup (e.g. in middleware or layout) to pre-warm /tmp.
 */
export async function syncAllFromKV() {
  if (!isKVConfigured()) return
  await Promise.all([
    syncFromKV(CAMPAIGNS_FILE),
    syncFromKV(HISTORY_FILE),
    syncFromKV(LOGS_FILE),
    syncFromKV(ARTICLES_FILE),
  ])
}

/**
 * syncAllToKV() - Persists ALL data files to KV.
 * Useful for manual full sync or migration.
 */
export async function syncAllToKV() {
  if (!isKVConfigured()) return
  const kv = await getKV()
  if (!kv) return

  for (const [file, kvKey] of Object.entries(KV_KEYS)) {
    try {
      if (existsSync(file)) {
        const raw = readFileSync(file, 'utf-8')
        const data = JSON.parse(raw)
        await kv.set(kvKey, data)
      }
    } catch (err) {
      console.error(`[db] syncAllToKV failed for ${kvKey}:`, err.message)
    }
  }
}

/**
 * waitForSync() - Await the last KV sync promise.
 * Useful in API routes that want to ensure persistence before responding.
 */
export async function waitForSync() {
  if (_kvSyncPromise) await _kvSyncPromise
}

// --- Core file helpers (unchanged signatures) ---
function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function readJson(file, fallback = []) {
  // Trigger async KV load if this file hasn't been checked yet.
  // On a true cold start where /tmp is empty, the first sync call
  // populates /tmp. Subsequent calls are no-ops.
  // This is fire-and-forget for the sync read path - on the very first
  // request after a cold start, data may be empty until KV loads.
  // To guarantee data is loaded, call syncAllFromKV() at app startup.
  if (!_kvLoaded.has(file)) {
    syncFromKV(file).catch(() => {})
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
  // Fire-and-forget KV sync
  syncToKV(file)
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
