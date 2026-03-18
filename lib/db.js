import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'

const DATA_DIR = '/tmp/htic-data'
const HISTORY_FILE = path.join(DATA_DIR, 'history.json')
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'campaigns.json')
const LOGS_FILE = path.join(DATA_DIR, 'logs.json')
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json')
const CLIENTS_FILE = path.join(DATA_DIR, 'clients.json')
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json')

const ALL_FILES = [CAMPAIGNS_FILE, HISTORY_FILE, LOGS_FILE, ARTICLES_FILE, CLIENTS_FILE, TICKETS_FILE]

// --- Store key mapping (file path -> DB key) ---
const STORE_KEYS = {
  [HISTORY_FILE]: 'htic:history',
  [CAMPAIGNS_FILE]: 'htic:campaigns',
  [LOGS_FILE]: 'htic:logs',
  [ARTICLES_FILE]: 'htic:articles',
  [CLIENTS_FILE]: 'htic:clients',
  [TICKETS_FILE]: 'htic:tickets',
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
    const { createClient } = require('@supabase/supabase-js')
    _supabase = createClient(config.url, config.key)
    return _supabase
  } catch {
    return null
  }
}

// =============================================
// ensureLoaded() — single entry point for cold-start recovery
// Loads ALL data from Supabase into /tmp once per process lifecycle.
// Fast no-op after first successful load.
// =============================================
let _loadPromise = null
let _loaded = false

export async function ensureLoaded() {
  if (_loaded) return
  if (_loadPromise) return _loadPromise

  _loadPromise = _doLoad()
  try {
    await _loadPromise
    _loaded = true
  } catch (err) {
    console.error('[db] ensureLoaded failed:', err.message)
  } finally {
    _loadPromise = null
  }
}

async function _doLoad() {
  const sb = getSupabase()
  if (!sb) return // No Supabase = local-only mode

  ensureDir()

  // Fetch all 4 keys in one batch
  try {
    const keys = Object.values(STORE_KEYS)
    const { data, error } = await sb
      .from('htic_store')
      .select('key, data')
      .in('key', keys)

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.error('[db] Table htic_store missing — go to Settings to create it')
      } else {
        console.error('[db] Supabase read error:', error.message)
      }
      return
    }

    if (!data || data.length === 0) return

    // Map DB key -> file path (reverse lookup)
    const keyToFile = {}
    for (const [file, storeKey] of Object.entries(STORE_KEYS)) {
      keyToFile[storeKey] = file
    }

    for (const row of data) {
      const file = keyToFile[row.key]
      if (!file || row.data === null || row.data === undefined) continue

      // Only write to /tmp if the file doesn't already exist (preserve in-memory state)
      if (!existsSync(file)) {
        writeFileSync(file, JSON.stringify(row.data, null, 2))
        console.log(`[db] Restored ${row.key} from Supabase`)
      }
    }
  } catch (err) {
    console.error('[db] Supabase load error:', err.message)
  }
}

// Alias for backward compatibility
export async function syncAllFromKV() {
  return ensureLoaded()
}

// =============================================
// syncTo(file) — persist to Supabase after every write.
// Awaited to ensure data is saved before response.
// =============================================
async function syncTo(file) {
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
}

// --- Core file helpers ---
function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function readJson(file, fallback = []) {
  try {
    if (!existsSync(file)) return fallback
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch {
    return fallback
  }
}

async function writeJson(file, data) {
  ensureDir()
  writeFileSync(file, JSON.stringify(data, null, 2))
  await syncTo(file)
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// --- History ---
export function getHistory() {
  return readJson(HISTORY_FILE)
}

export async function addHistoryEntry(entry) {
  const history = getHistory()
  const newEntry = { id: uid('h'), ...entry, createdAt: new Date().toISOString() }
  history.unshift(newEntry)
  await writeJson(HISTORY_FILE, history.slice(0, 500))
  return newEntry
}

export async function clearHistory() {
  await writeJson(HISTORY_FILE, [])
}

// --- Campaigns (parent) ---
export function getCampaigns() {
  const campaigns = readJson(CAMPAIGNS_FILE)
  return campaigns.map(c => {
    if (!c.lines && c.keyword_main) {
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

export async function saveCampaigns(campaigns) {
  await writeJson(CAMPAIGNS_FILE, campaigns)
}

export function getCampaign(id) {
  return getCampaigns().find(c => c.id === id) || null
}

export async function addCampaign(data) {
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
  await saveCampaigns(campaigns)
  return campaign
}

export async function updateCampaign(id, updates) {
  const campaigns = getCampaigns()
  const idx = campaigns.findIndex(c => c.id === id)
  if (idx === -1) return null
  const { lines, ...safeUpdates } = updates
  campaigns[idx] = { ...campaigns[idx], ...safeUpdates, updatedAt: new Date().toISOString() }
  if (lines !== undefined) campaigns[idx].lines = lines
  await saveCampaigns(campaigns)
  return campaigns[idx]
}

export async function deleteCampaign(id) {
  const campaigns = getCampaigns().filter(c => c.id !== id)
  await saveCampaigns(campaigns)
}

export async function deleteCampaigns(ids) {
  const campaigns = getCampaigns().filter(c => !ids.includes(c.id))
  await saveCampaigns(campaigns)
}

// --- Lines (children of a campaign) ---
export async function addLine(campaignId, data) {
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
    product_name: data.product_name || '',
    product_price: data.product_price || '',
    product_ref: data.product_ref || '',
    cat_product: data.cat_product || '',
    cat_ref: data.cat_ref || '',
    cat_specs: data.cat_specs || '',
    createdAt: new Date().toISOString(),
  }
  campaigns[idx].lines.push(line)
  await saveCampaigns(campaigns)
  return line
}

export async function updateLine(campaignId, lineId, updates) {
  const campaigns = getCampaigns()
  const campIdx = campaigns.findIndex(c => c.id === campaignId)
  if (campIdx === -1) return null
  const lineIdx = campaigns[campIdx].lines.findIndex(l => l.id === lineId)
  if (lineIdx === -1) return null
  campaigns[campIdx].lines[lineIdx] = { ...campaigns[campIdx].lines[lineIdx], ...updates }
  await saveCampaigns(campaigns)
  return campaigns[campIdx].lines[lineIdx]
}

export async function deleteLines(campaignId, lineIds) {
  const campaigns = getCampaigns()
  const campIdx = campaigns.findIndex(c => c.id === campaignId)
  if (campIdx === -1) return
  campaigns[campIdx].lines = campaigns[campIdx].lines.filter(l => !lineIds.includes(l.id))
  await saveCampaigns(campaigns)
}

// --- Logs ---
export function getLogs() {
  return readJson(LOGS_FILE)
}

export async function addLog(level, message, meta = {}) {
  const logs = getLogs()
  const entry = { id: uid('l'), level, message, meta, timestamp: new Date().toISOString() }
  logs.unshift(entry)
  await writeJson(LOGS_FILE, logs.slice(0, 1000))
  return entry
}

export async function clearLogs() {
  await writeJson(LOGS_FILE, [])
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

export async function saveArticle(data) {
  const articles = getArticles()
  const existing = articles.findIndex(a => a.campaignId === data.campaignId && a.lineId === data.lineId)
  const article = {
    id: existing >= 0 ? articles[existing].id : uid('art'),
    campaignId: data.campaignId,
    lineId: data.lineId,
    company: data.company || '',
    keyword: data.keyword || '',
    url: data.url || '',
    city: data.city || '',
    meta_title: data.meta_title || '',
    meta_description: data.meta_description || '',
    h1: data.h1 || '',
    intro: data.intro || '',
    body: data.body || '',
    faq: data.faq || '',
    full_html: data.full_html || '',
    createdAt: existing >= 0 ? articles[existing].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  if (existing >= 0) {
    articles[existing] = article
  } else {
    articles.unshift(article)
  }
  await writeJson(ARTICLES_FILE, articles.slice(0, 500))
  return article
}

export async function deleteArticle(id) {
  const articles = getArticles().filter(a => a.id !== id)
  await writeJson(ARTICLES_FILE, articles)
}

// --- Clients ---
function generatePassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pw = ''
  for (let i = 0; i < length; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  return pw
}

function generateLoginId(firstName, lastName) {
  const normalize = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
  return normalize(firstName) + '-' + normalize(lastName)
}

export function getClients() {
  return readJson(CLIENTS_FILE)
}

export function getClient(id) {
  return getClients().find(c => c.id === id) || null
}

export function getClientByLoginId(loginId) {
  return getClients().find(c => c.loginId === loginId) || null
}

export async function addClient(data) {
  const clients = getClients()
  let loginId = generateLoginId(data.firstName || '', data.lastName || '')
  // Ensure unique loginId
  let suffix = 0
  let finalLoginId = loginId
  while (clients.some(c => c.loginId === finalLoginId)) {
    suffix++
    finalLoginId = loginId + suffix
  }
  const client = {
    id: uid('cli'),
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    phone: data.phone || '',
    credits: parseInt(data.credits) || 0,
    creditsUsed: 0,
    loginId: finalLoginId,
    password: generatePassword(),
    webhookUrl: data.webhookUrl || '',
    active: true,
    createdAt: new Date().toISOString(),
  }
  clients.push(client)
  await writeJson(CLIENTS_FILE, clients)
  return client
}

export async function updateClient(id, updates) {
  const clients = getClients()
  const idx = clients.findIndex(c => c.id === id)
  if (idx === -1) return null
  const safe = { ...updates }
  delete safe.id
  delete safe.createdAt
  if (safe.credits !== undefined) safe.credits = parseInt(safe.credits) || 0
  clients[idx] = { ...clients[idx], ...safe }
  await writeJson(CLIENTS_FILE, clients)
  return clients[idx]
}

export async function deleteClient(id) {
  const clients = getClients().filter(c => c.id !== id)
  await writeJson(CLIENTS_FILE, clients)
}

export async function deleteClients(ids) {
  const clients = getClients().filter(c => !ids.includes(c.id))
  await writeJson(CLIENTS_FILE, clients)
}

export async function useCredit(clientId) {
  const clients = getClients()
  const idx = clients.findIndex(c => c.id === clientId)
  if (idx === -1) return null
  if (clients[idx].creditsUsed >= clients[idx].credits) return { error: 'no_credits' }
  clients[idx].creditsUsed++
  await writeJson(CLIENTS_FILE, clients)
  return clients[idx]
}
