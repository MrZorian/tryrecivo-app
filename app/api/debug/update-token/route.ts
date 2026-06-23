import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  if (searchParams.get('secret') !== 'recivo-debug-2026') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey!)
  const userId = '3034dfd6-5a67-4a58-8de3-c83c8349d050'
  const shop = 'recivo-test-store.myshopify.com'

  // If ?token= provided, set it directly
  const newToken = searchParams.get('token')
  if (newToken) {
    const { data, error } = await supabase
      .from('stores')
      .update({ access_token: newToken })
      .eq('shop_domain', shop)
      .select('id, shop_domain, LEFT(access_token, 15) as token_prefix')
    return NextResponse.json({ directUpdate: { data, error: error?.message } })
  }

  // Test upsert (same as callback does)
  const { data: upserted, error: upsertErr } = await supabase
    .from('stores')
    .upsert({
      user_id: userId,
      shop_domain: shop,
      shop_name: 'Recivo Test Store',
      access_token: 'TEST_TOKEN_UPSERT',
    }, { onConflict: 'shop_domain' })
    .select('id, shop_domain, user_id')

  // Revert to real token right away
  await supabase
    .from('stores')
    .update({ access_token: 'shpua_0f86662d885c76c17bd3336ec85c4e40' })
    .eq('shop_domain', shop)

  return NextResponse.json({
    upsertError: upsertErr?.message || null,
    upsertSuccess: !upsertErr,
    upserted,
  })
}
