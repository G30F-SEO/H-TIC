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

// --- History ---
export function getHistory() {
  return readJson(HISTORY_FILE)
}

export function addHistoryEntry(entry) {
  const history = getHistory()
  const newEntry = {
    id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...entry,
    createdAt: new Date().toISOString(),
  }
  history.unshift(newEntry)
  writeJson(HISTORY_FILE, history.slice(0, 500))
  return newEntry
}

export function clearHistory() {
  writeJson(HISTORY_FILE, [])
}

// --- Campaigns ---
export function getCampaigns() {
  return readJson(CAMPAIGNS_FILE)
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
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: 'draft',
    createdAt: new Date().toISOString(),
    launchedAt: null,
    completedAt: null,
    error: null,
    makeStatus: null,
    ...data,
  }
  campaigns.push(campaign)
  saveCampaigns(campaigns)
  return campaign
}

export function updateCampaign(id, updates) {
  const campaigns = getCampaigns()
  const idx = campaigns.findIndex(c => c.id === id)
  if (idx === -1) return null
  campaigns[idx] = { ...campaigns[idx], ...updates }
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

// --- Logs ---
export function getLogs() {
  return readJson(LOGS_FILE)
}

export function addLog(level, message, meta = {}) {
  const logs = getLogs()
  const entry = {
    id: `l_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    level,
    message,
    meta,
    timestamp: new Date().toISOString(),
  }
  logs.unshift(entry)
  writeJson(LOGS_FILE, logs.slice(0, 1000))
  return entry
}

export function clearLogs() {
  writeJson(LOGS_FILE, [])
}
