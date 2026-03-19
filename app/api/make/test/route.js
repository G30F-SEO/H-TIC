import { NextResponse } from 'next/server'
import { testConnection, isMakeConfigured } from '@/lib/make-api'

export async function GET() {
  if (!isMakeConfigured()) {
    return NextResponse.json({
      configured: false,
      error: 'Variables MAKE_API_TOKEN, MAKE_TEAM_ID et MAKE_TEMPLATE_SCENARIO_ID requises',
    })
  }
  const result = await testConnection()
  return NextResponse.json({ configured: true, ...result })
}
