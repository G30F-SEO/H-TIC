const WEBHOOK_MAP = {
  vitrine: 'WEBHOOK_VITRINE',
  ecommerce: 'WEBHOOK_ECOMMERCE',
  catalogue: 'WEBHOOK_CATALOGUE',
}

export function getWebhookUrl(branch) {
  const envKey = WEBHOOK_MAP[branch]
  if (!envKey) return null
  return process.env[envKey] || null
}
