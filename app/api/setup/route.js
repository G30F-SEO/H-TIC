import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

// POST /api/setup — Creates the htic_store table in Supabase
// Must be authenticated (admin only)
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return NextResponse.json({
      error: 'SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans les variables d\'environnement',
    }, { status: 400 })
  }

  const sql = `
    CREATE TABLE IF NOT EXISTS htic_store (
      key TEXT PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `

  try {
    // Use Supabase's REST SQL endpoint (requires service_role key)
    const res = await fetch(`${url}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({}),
    })

    // The rpc endpoint won't work for DDL. Use the pg endpoint via the SQL API
    // Supabase provides a /pg endpoint or we can use the management API
    // Simplest: use the supabase-js client to call a function, or try direct insert

    // Try creating by attempting an upsert — if table exists it works, if not we need SQL
    const { createClient } = require('@supabase/supabase-js')
    const sb = createClient(url, key)

    // First try: does the table exist?
    const { error: checkError } = await sb.from('htic_store').select('key').limit(1)

    if (!checkError) {
      return NextResponse.json({ ok: true, message: 'Table htic_store existe deja. Tout est pret !' })
    }

    // Table doesn't exist. Use the Supabase SQL HTTP API
    // This endpoint is available at /rest/v1/ but doesn't support DDL
    // We need to use the management API or pg directly

    // Use fetch to Supabase's /sql endpoint (available with service role)
    const sqlRes = await fetch(`${url}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
    })

    // If we can't auto-create, provide the SQL to run manually
    return NextResponse.json({
      ok: false,
      message: 'La table n\'existe pas encore. Executez ce SQL dans le SQL Editor de Supabase :',
      sql: sql.trim(),
      steps: [
        'Ouvrez https://supabase.com/dashboard',
        'Selectionnez votre projet',
        'Allez dans SQL Editor (icone terminal a gauche)',
        'Collez le SQL ci-dessus et cliquez Run',
      ],
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/setup — Check Supabase connection status
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.json({ configured: false, message: 'Supabase non configure' })
  }

  try {
    const { createClient } = require('@supabase/supabase-js')
    const sb = createClient(url, key)
    const { data, error } = await sb.from('htic_store').select('key').limit(1)

    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      return NextResponse.json({
        configured: true,
        tableExists: false,
        message: 'Supabase connecte mais la table htic_store n\'existe pas',
        sql: 'CREATE TABLE IF NOT EXISTS htic_store (key TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT \'[]\'::jsonb, updated_at TIMESTAMPTZ DEFAULT now());',
      })
    }

    if (error) {
      return NextResponse.json({ configured: true, tableExists: false, error: error.message })
    }

    return NextResponse.json({ configured: true, tableExists: true, message: 'Supabase OK — persistance active' })
  } catch (err) {
    return NextResponse.json({ configured: true, tableExists: false, error: err.message })
  }
}
