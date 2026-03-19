export function getWebhookUrl(branch, client = null) {
  // Per-client webhook takes priority
  if (client?.makeWebhookUrl) return client.makeWebhookUrl
  if (client?.webhookUrl) return client.webhookUrl
  return process.env.WEBHOOK_URL || null
}
