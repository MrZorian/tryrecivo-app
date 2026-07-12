import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

  // 1. Authenticate the current user
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value },
        set() {},
        remove() {},
      },
    }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${APP_URL}/login?from=shopify`)
  }

  // 2. Read the pending install cookie
  const pendingCookie = req.cookies.get('shopify_pending_install')?.value
  if (!pendingCookie) {
    return NextResponse.redirect(`${APP_URL}/dashboard`)
  }

  let pendingData: {
    shop: string
    shop_name: string
    access_token: string
    refresh_token: string | null
    token_expires_at: string | null
  }
  try {
    pendingData = JSON.parse(pendingCookie)
  } catch {
    return NextResponse.redirect(`${APP_URL}/dashboard?error=invalid_pending_data`)
  }

  const { shop, shop_name, access_token, refresh_token, token_expires_at } = pendingData

  // 3. Upsert the store record
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: existingStore } = await supabase
    .from('stores')
    .select('id')
    .eq('shop_domain', shop)
    .maybeSingle()

  if (existingStore) {
    await supabase.from('stores').update({
      access_token,
      shop_name,
      user_id: user.id,
      ...(refresh_token && { refresh_token }),
      ...(token_expires_at && { token_expires_at }),
    }).eq('id', existingStore.id)
  } else {
    await supabase.from('stores').insert({
      user_id: user.id,
      shop_domain: shop,
      shop_name,
      access_token,
      ...(refresh_token && { refresh_token }),
      ...(token_expires_at && { token_expires_at }),
    })
  }

  // 4. Register orders/paid webhook (safe to re-register; Shopify ignores duplicates)
  await fetch(`https://${shop}/admin/api/2026-04/webhooks.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': access_token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      webhook: {
        topic: 'orders/paid',
        address: `${APP_URL}/api/webhooks/orders`,
        format: 'json',
      },
    }),
  })

  console.log(`[complete-install] Store ${shop} connected for user ${user.id}`)

  // 5. Clear cookie and redirect to dashboard
  const res = NextResponse.redirect(`${APP_URL}/dashboard?connected=true`)
  res.cookies.set('shopify_pending_install', '', { maxAge: 0, path: '/' })
  return res
}
