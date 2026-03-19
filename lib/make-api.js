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
  const body = {
    name: `H-TIC — ${name}`,
    teamId: parseInt(teamId),
    typeName: 'gateway-webhook',
    typeCategory: 'gateway',
    headers: 1,
    method: 1,
    stringify: 0,
  }
  console.log('[make-api] createWebhook request:', JSON.stringify(body))
  const res = await fetch(`${baseUrl()}/hooks`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`createWebhook (${res.status}): ${err}`)
  }
  const data = await res.json()
  console.log('[make-api] createWebhook response:', JSON.stringify(data))
  const hook = data.hook || data
  return { hookId: hook.id, hookUrl: hook.url }
}

// Clone a scenario template
export async function cloneScenario(name) {
  const { templateScenarioId, teamId } = getConfig()
  console.log('[make-api] cloneScenario template:', templateScenarioId)
  const res = await fetch(`${baseUrl()}/scenarios/${templateScenarioId}/clone`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ name: `H-TIC — ${name}`, organizationId: parseInt(teamId) }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`cloneScenario (${res.status}): ${err}`)
  }
  const data = await res.json()
  console.log('[make-api] cloneScenario response:', JSON.stringify(data))
  const scenario = data.scenario || data
  return { scenarioId: scenario.id }
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
  if (!isMakeConfigured()) return { error: 'Make.com non configure (variables manquantes)' }

  try {
    // Step 1: Create webhook
    console.log('[make-api] Step 1: Creating webhook for', clientName)
    const { hookId, hookUrl } = await createWebhook(clientName)
    console.log('[make-api] Webhook created:', hookId, hookUrl)

    // Step 2: Clone scenario template
    console.log('[make-api] Step 2: Cloning scenario template')
    const { scenarioId } = await cloneScenario(clientName)
    console.log('[make-api] Scenario cloned:', scenarioId)

    // Step 3: Activate the cloned scenario
    try {
      console.log('[make-api] Step 3: Activating scenario', scenarioId)
      await activateScenario(scenarioId)
      console.log('[make-api] Scenario activated')
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
    return { error: err.message }
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
