import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Add columns one by one using insert/select trick to detect if they exist
  const queries = [
    `ALTER TABLE receipt_settings ADD COLUMN IF NOT EXISTS custom_links jsonb DEFAULT '[]'::jsonb`,
    `ALTER TABLE receipt_settings ADD COLUMN IF NOT EXISTS recivo_link_hidden boolean DEFAULT false`,
    `ALTER TABLE receipt_settings ADD COLUMN IF NOT EXISTS recivo_link_url text DEFAULT 'https://tryrecivo.com'`,
    `ALTER TABLE receipt_settings ADD COLUMN IF NOT EXISTS recivo_link_label text DEFAULT 'Powered by tryrecivo'`,
  ]

  const results: string[] = []
  for (const q of queries) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      body: JSON.stringify({ query: q }),
    })
    results.push(res.ok ? 'ok' : await res.text())
  }

  return NextResponse.json({ results })
}
