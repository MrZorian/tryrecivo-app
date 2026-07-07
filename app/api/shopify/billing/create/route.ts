import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const PLANS: Record<string, { name: string; price: number; emails: number }> = {
  starter: { name: 'Recivo Starter', price: 19, emails: 5000 },
  growth:  { name: 'Recivo Growth',  price: 49, emails: 20000 },
  pro:     { name: 'Recivo Pro',     price: 99, emails: 0 }, // 0 = unlimited
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

  // Get user's connected store
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: store } = await supabase
    .from('stores')
    .select('shop_domain, access_token')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!store) {
    return NextResponse.redirect(`${APP_URL}/dashboard?error=no_store`)
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
    test: false,
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
        'X-Shopify-Access-Token': store.access_token,
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
    // If the token is invalid/expired, redirect to reinstall flow
    const isTokenError = JSON.stringify(gqlJson?.errors || '').toLowerCase().includes('invalid api key') ||
      JSON.stringify(gqlJson?.errors || '').toLowerCase().includes('access token')
    if (isTokenError) {
      return NextResponse.redirect(`${APP_URL}/api/shopify/install?shop=${store.shop_domain}`)
    }
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=${encodeURIComponent(errors)}`)
  }

  return NextResponse.redirect(confirmationUrl)
}
