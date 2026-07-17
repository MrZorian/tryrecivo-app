/**
 * GET /api/shopify/complete-install
 *
 * Server route that finalises a Shopify install for a newly authenticated user.
 *
 * Flow:
 *   1. Merchant installs from App Store → callback saves pending data to cookie
 *      → redirects to /signup?from=shopify
 *   2. Merchant signs up / logs in → /shopify/complete (client page) ensures
 *      Supabase session is persisted → hard-navigates here
 *   3. This route reads the cookie, creates the store record, registers the
 *      orders/paid webhook, clears the cookie, and redirects to the dashboard.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

  // ── 1. Authenticate the current user ────────────────────────────────────────
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

  // ── 2. Read the pending install cookie ──────────────────────────────────────
  const pendingCookie = req.cookies.get('shopify_pending_install')?.value
  if (!pendingCookie) {
    // Cookie expired or user came here directly — go to dashboard normally
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

  // ── 3. Upsert the store record ───────────────────────────────────────────────
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
      user_id: user.id, // re-associate in case of reinstall
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

  // ── 4. Register orders/paid webhook ─────────────────────────────────────────
  // Shopify ignores duplicate registrations, so this is safe to call on reinstall.
  const whRes = await fetch(`https://${shop}/admin/api/2024-10/webhooks.json`, {
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
  const whJson = await whRes.json()
  console.log('[complete-install] webhook reg status=' + whRes.status, JSON.stringify(whJson))
  console.log(`[complete-install] Store ${shop} connected for user ${user.id}`)

  // ── 5. Clear cookie and redirect to dashboard ────────────────────────────────
  const res = NextResponse.redirect(`${APP_URL}/dashboard?connected=true`)
  res.cookies.set('shopify_pending_install', '', { maxAge: 0, path: '/' })
  return res
}
