// Make.com API client for auto-provisioning scenarios per client

function getConfig() {
  const token = process.env.MAKE_API_TOKEN
  const teamId = process.env.MAKE_TEAM_ID
  const zone = process.env.MAKE_ZONE || 'eu2'
  const templateScenarioId = process.env.MAKE_TEMPLATE_SCENARIO_ID
  const templateHookId = process.env.MAKE_TEMPLATE_HOOK_ID
  return { token, teamId, zone, templateScenarioId, templateHookId }
}

export function isMakeConfigured() {
  const { token, teamId, templateScenarioId } = getConfig()
  return !!(token && teamId && templateScenarioId)
}

function baseUrl() {
  const { zone } = getConfig()
  return `https://${zone}.make.com/api/v2`
}

function headers() {
  const { token } = getConfig()
  return {
    'Authorization': `Token ${token}`,
    'Content-Type': 'application/json',
  }
}

// Create a new webhook in Make.com
export async function createWebhook(name) {
  const { teamId } = getConfig()
  const res = await fetch(`${baseUrl()}/hooks`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      name: `H-TIC — ${name}`,
      teamId: parseInt(teamId),
      typeName: 'gateway-webhook',
      typeCategory: 'gateway',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Make API createWebhook failed (${res.status}): ${err}`)
  }
  const data = await res.json()
  return { hookId: data.hook?.id || data.id, hookUrl: data.hook?.url || data.url }
}

// Clone a scenario template
export async function cloneScenario(name) {
  const { templateScenarioId } = getConfig()
  const res = await fetch(`${baseUrl()}/scenarios/${templateScenarioId}/clone`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ name: `H-TIC — ${name}` }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Make API cloneScenario failed (${res.status}): ${err}`)
  }
  const data = await res.json()
  return { scenarioId: data.scenario?.id || data.id }
}

// Activate a scenario
export async function activateScenario(scenarioId) {
  const res = await fetch(`${baseUrl()}/scenarios/${scenarioId}/activate`, {
    method: 'POST',
    headers: headers(),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Make API activateScenario failed (${res.status}): ${err}`)
  }
}

// Delete a scenario
export async function deleteScenario(scenarioId) {
  const res = await fetch(`${baseUrl()}/scenarios/${scenarioId}`, {
    method: 'DELETE',
    headers: headers(),
  })
  if (!res.ok && res.status !== 404) {
    const err = await res.text()
    throw new Error(`Make API deleteScenario failed (${res.status}): ${err}`)
  }
}

// Delete a webhook
export async function deleteWebhook(hookId) {
  const res = await fetch(`${baseUrl()}/hooks/${hookId}`, {
    method: 'DELETE',
    headers: headers(),
  })
  if (!res.ok && res.status !== 404) {
    const err = await res.text()
    throw new Error(`Make API deleteWebhook failed (${res.status}): ${err}`)
  }
}

// Test API connection
export async function testConnection() {
  const { token, teamId } = getConfig()
  if (!token || !teamId) return { ok: false, error: 'MAKE_API_TOKEN et MAKE_TEAM_ID requis' }
  try {
    const res = await fetch(`${baseUrl()}/teams/${teamId}`, { headers: headers() })
    if (res.ok) {
      const data = await res.json()
      return { ok: true, teamName: data.team?.name || data.name || 'OK' }
    }
    return { ok: false, error: `HTTP ${res.status}` }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// Full provisioning: create webhook + clone scenario + activate
export async function provisionClient(clientName) {
  if (!isMakeConfigured()) return null

  try {
    // Step 1: Create webhook
    const { hookId, hookUrl } = await createWebhook(clientName)

    // Step 2: Clone scenario template
    const { scenarioId } = await cloneScenario(clientName)

    // Step 3: Activate the cloned scenario
    try {
      await activateScenario(scenarioId)
    } catch (e) {
      console.warn('[make-api] Could not auto-activate scenario:', e.message)
    }

    return {
      makeScenarioId: scenarioId,
      makeWebhookId: hookId,
      makeWebhookUrl: hookUrl,
    }
  } catch (err) {
    console.error('[make-api] provisionClient failed:', err.message)
    return null
  }
}

// Cleanup: delete scenario + webhook when client is removed
export async function deprovisionClient(client) {
  if (!isMakeConfigured()) return
  try {
    if (client.makeScenarioId) await deleteScenario(client.makeScenarioId)
    if (client.makeWebhookId) await deleteWebhook(client.makeWebhookId)
  } catch (err) {
    console.error('[make-api] deprovisionClient failed:', err.message)
  }
}
