import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const shop = searchParams.get('shop')
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const storedState = req.cookies.get('shopify_state')?.value

  if (!shop || !code || state !== storedState) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=invalid_oauth`)
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
  if (!access_token) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=no_token`)

  // Get shop info
  const shopRes = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
    headers: { 'X-Shopify-Access-Token': access_token }
  })
  const { shop: shopData } = await shopRes.json()

  // Save to Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get user from session cookie (simplified - in production use proper session)
  const authHeader = req.cookies.get('sb-access-token')?.value
  if (!authHeader) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`)

  const { data: { user } } = await supabase.auth.getUser(authHeader)
  if (!user) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`)

  await supabase.from('stores').upsert({
    user_id: user.id,
    shop_domain: shop,
    shop_name: shopData.name,
    access_token,
  }, { onConflict: 'shop_domain' })

  // Register webhook for orders
  await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': access_token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      webhook: {
        topic: 'orders/create',
        address: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/orders`,
        format: 'json',
      }
    })
  })

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?connected=true`)
}
