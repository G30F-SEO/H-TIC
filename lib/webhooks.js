export function getWebhookUrl(branch) {
  return process.env.WEBHOOK_URL || null
}
