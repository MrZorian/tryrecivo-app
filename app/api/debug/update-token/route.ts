import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  if (searchParams.get('secret') !== 'recivo-debug-2026') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const keyInfo = { defined: !!serviceKey, length: serviceKey?.length, prefix: serviceKey?.slice(0, 20) }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey!)
  const { data: stores, error: readErr } = await supabase.from('stores').select('id, shop_domain, user_id')
  const { data: updated, error: updateErr } = await supabase
    .from('stores').update({ shop_name: 'Debug Test' })
    .eq('shop_domain', 'recivo-test-store.myshopify.com').select()

  return NextResponse.json({ keyInfo, stores, readError: readErr?.message, updated, updateError: updateErr?.message })
}
