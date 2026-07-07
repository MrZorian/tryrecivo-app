import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const PLANS: Record<string, { name: string; price: number; emails: number }> = {
  starter: { name: 'Recivo Starter', price: 19, emails: 5000 },
  growth:  { name: 'Recivo Growth',  price: 49, emails: 20000 },
  pro:     { name: 'Recivo Pro',     price: 99, emails: 0 }, // 0 = unlimited
}

// Refresh an expiring Shopify access token using the stored refresh_token.
// Returns the new access_token on success, or null if refresh failed.
async function refreshShopifyToken(
  supabase: ReturnType<typeof createClient>,
  store: { shop_domain: string; refresh_token: string | null }
): Promise<string | null> {
  if (!store.refresh_token) return null
  const tokenRes = await fetch(`https://${store.shop_domain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      grant_type: 'refresh_token',
      refresh_token: store.refresh_token,
    }),
  })
  const data = await tokenRes.json()
  if (!data.access_token) {
    console.error('Shopify token refresh failed:', JSON.stringify(data))
    return null
  }
  const token_expires_at = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null
  await supabase.from('stores').update({
    access_token: data.access_token,
    ...(data.refresh_token && { refresh_token: data.refresh_token }),
    ...(token_expires_at && { token_expires_at }),
  }).eq('shop_domain', store.shop_domain)
  return data.access_token
}

export async function GET(req: NextRequest) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!
  const { searchParams } = req.nextUrl
  const planId = searchParams.get('plan')

  if (!planId || !PLANS[planId]) {
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=invalid_plan`)
  }

  // Auth check
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

  // Get user's connected store (most recently updated active store)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: store } = await supabase
    .from('stores')
    .select('shop_domain, access_token, refresh_token, token_expires_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!store) {
    return NextResponse.redirect(`${APP_URL}/dashboard?error=no_store`)
  }

  // Proactively refresh token if it expires within 5 minutes
  let access_token: string = store.access_token
  if (store.token_expires_at) {
    const expiresAt = new Date(store.token_expires_at).getTime()
    if (Date.now() + 5 * 60 * 1000 >= expiresAt) {
      const refreshed = await refreshShopifyToken(supabase, store)
      if (refreshed) {
        access_token = refreshed
      } else {
        // Refresh failed — force reinstall to get a new token
        return NextResponse.redirect(`${APP_URL}/api/shopify/install?shop=${store.shop_domain}`)
      }
    }
  }

  const plan = PLANS[planId]

  // Create subscription via Shopify GraphQL Billing API
  const returnUrl = `${APP_URL}/api/shopify/billing/callback?plan=${planId}&shop=${store.shop_domain}`
  const mutation = `
    mutation appSubscriptionCreate($name: String!, $returnUrl: URL!, $test: Boolean!, $lineItems: [AppSubscriptionLineItemInput!]!) {
      appSubscriptionCreate(name: $name, returnUrl: $returnUrl, test: $test, lineItems: $lineItems) {
        appSubscription { id }
        confirmationUrl
        userErrors { field message }
      }
    }
  `
  const variables = {
    name: plan.name,
    returnUrl,
    test: true,
    lineItems: [{
      plan: {
        appRecurringPricingDetails: {
          price: { amount: plan.price.toFixed(2), currencyCode: 'USD' },
          interval: 'EVERY_30_DAYS',
        },
      },
    }],
  }

  const gqlRes = await fetch(
    `https://${store.shop_domain}/admin/api/2026-04/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: mutation, variables }),
    }
  )

  const gqlJson = await gqlRes.json()
  const result = gqlJson?.data?.appSubscriptionCreate
  const confirmationUrl = result?.confirmationUrl

  if (!confirmationUrl) {
    const errors = result?.userErrors?.length
      ? JSON.stringify(result.userErrors)
      : JSON.stringify(gqlJson?.errors || gqlJson)
    console.error('Shopify billing create failed:', errors)
    const errStr = JSON.stringify(gqlJson?.errors || '')
    const isTokenError = errStr.toLowerCase().includes('invalid api key') ||
      errStr.toLowerCase().includes('access token') ||
      errStr.toLowerCase().includes('non-expiring')
    if (isTokenError) {
      return NextResponse.redirect(`${APP_URL}/api/shopify/install?shop=${store.shop_domain}`)
    }
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=${encodeURIComponent(errors)}`)
  }

  return NextResponse.redirect(confirmationUrl)
}
