import { readFileSync, writeFileSync, existsSync } from 'fs'
import path from 'path'

const DATA_DIR = '/tmp/htic-data'
const HISTORY_FILE = path.join(DATA_DIR, 'history.json')
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'campaigns.json')
const LOGS_FILE = path.join(DATA_DIR, 'logs.json')

function ensureDir() {
  const { mkdirSync } = require('fs')
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

function writeJson(file, data) {
  ensureDir()
  writeFileSync(file, JSON.stringify(data, null, 2))
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
