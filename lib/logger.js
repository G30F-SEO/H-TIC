import { addLog } from './db'

export function log(level, message, meta = {}) {
  const entry = addLog(level, message, meta)
  const prefix = { info: 'ℹ', warn: '⚠', error: '✕', success: '✓' }[level] || '•'
  console.log(`[${prefix}] ${message}`, Object.keys(meta).length ? meta : '')
  return entry
}

export const logger = {
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  success: (msg, meta) => log('success', msg, meta),
}
