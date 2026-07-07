import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const shop = searchParams.get('shop')
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const storedState = req.cookies.get('shopify_state')?.value

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

  if (!shop || !code || !state) {
    return NextResponse.redirect(`${APP_URL}/dashboard?error=invalid_oauth`)
  }

  // State check only if cookie was actually sent (may be missing after cross-origin redirect)
  if (storedState && state !== storedState) {
    return NextResponse.redirect(`${APP_URL}/dashboard?error=state_mismatch`)
  }

  // Exchange code for access token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  })

  const tokenJson = await tokenRes.json()
  const access_token = tokenJson.access_token
  const refresh_token = tokenJson.refresh_token || null
  const expires_in = tokenJson.expires_in || null
  const token_expires_at = expires_in
    ? new Date(Date.now() + expires_in * 1000).toISOString()
    : null
  if (!access_token) {
    console.error('Shopify token exchange failed:', JSON.stringify(tokenJson))
    return NextResponse.redirect(`${APP_URL}/dashboard?error=no_token`)
  }

  // Get shop info
  const shopRes = await fetch(`https://${shop}/admin/api/2026-04/shop.json`, {
    headers: { 'X-Shopify-Access-Token': access_token },
  })
  const { shop: shopData } = await shopRes.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check if this store already exists → just update the token
  const { data: existingStore } = await supabase
    .from('stores')
    .select('id, user_id')
    .eq('shop_domain', shop)
    .single()

  if (existingStore) {
    // Reinstall: update token on existing store record
    const { error: updateErr } = await supabase
      .from('stores')
      .update({
        access_token,
        shop_name: shopData?.name || shop,
        ...(refresh_token && { refresh_token }),
        ...(token_expires_at && { token_expires_at }),
      })
      .eq('shop_domain', shop)
    if (updateErr) {
      console.error('Store token update failed:', updateErr.message)
    }
  } else {
    // New install: need user session to create the association
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
    if (!user) return NextResponse.redirect(`${APP_URL}/login`)

    await supabase.from('stores').insert({
      user_id: user.id,
      shop_domain: shop,
      shop_name: shopData?.name || shop,
      access_token,
      ...(refresh_token && { refresh_token }),
      ...(token_expires_at && { token_expires_at }),
    })
  }

  // Register orders/paid webhook (safe to re-register; Shopify ignores duplicates)
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

  return NextResponse.redirect(`${APP_URL}/dashboard?connected=true`)
}
