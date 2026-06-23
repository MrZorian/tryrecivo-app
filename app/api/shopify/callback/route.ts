import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

  // Only check state cookie if it was actually set (may be missing after cross-origin redirect)
  if (storedState && state !== storedState) {
    return NextResponse.redirect(`${APP_URL}/dashboard?error=state_mismatch`)
  }

  // Extract user ID from state (format: "random.userId")
  const userId = state.includes('.') ? state.split('.').slice(1).join('.') : null
  if (!userId) {
    return NextResponse.redirect(`${APP_URL}/dashboard?error=no_user_in_state`)
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
  if (!access_token) {
    console.error('Token exchange failed:', JSON.stringify(tokenJson))
    return NextResponse.redirect(`${APP_URL}/dashboard?error=no_token`)
  }

  // Get shop info from Shopify
  const shopRes = await fetch(`https://${shop}/admin/api/2026-04/shop.json`, {
    headers: { 'X-Shopify-Access-Token': access_token },
  })
  const { shop: shopData } = await shopRes.json()

  // Save store using service role (no session needed)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase.from('stores').upsert({
    user_id: userId,
    shop_domain: shop,
    shop_name: shopData?.name || shop,
    access_token,
  }, { onConflict: 'shop_domain' })

  // Register orders/paid webhook
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
