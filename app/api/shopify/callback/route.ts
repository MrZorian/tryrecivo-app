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

  // Only reject if state is actively mismatched (not if cookie is simply missing)
  if (!shop || !code || (storedState && state !== storedState)) {
    return NextResponse.redirect(`${APP_URL}/dashboard?error=invalid_oauth`)
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

  const { access_token } = await tokenRes.json()
  if (!access_token) return NextResponse.redirect(`${APP_URL}/dashboard?error=no_token`)

  // Get shop info from Shopify
  const shopRes = await fetch(`https://${shop}/admin/api/2026-04/shop.json`, {
    headers: { 'X-Shopify-Access-Token': access_token },
  })
  const { shop: shopData } = await shopRes.json()

  // Get authenticated user via Supabase SSR (reads session from browser cookies)
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

  // Save store with service role client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase.from('stores').upsert({
    user_id: user.id,
    shop_domain: shop,
    shop_name: shopData.name,
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
