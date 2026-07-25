/**
 * GET /api/shopify/billing/create?plan=starter|growth|pro
 *
 * Creates a Shopify subscription using the Billing API (appSubscriptionCreate).
 * We deliberately use the Billing API rather than a Managed Pricing URL so that:
 *   - a real, queryable AppSubscription is always created, and
 *   - we control the returnUrl (Shopify sends the merchant back to our own
 *     callback with a charge_id, instead of dumping them on the App URL root).
 *
 * Flow: build subscription → get confirmationUrl → redirect merchant there →
 * merchant approves → Shopify redirects to returnUrl (our callback).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const PLAN_PRICES: Record<string, { name: string; amount: number }> = {
  starter: { name: 'Starter', amount: 19 },
  growth:  { name: 'Growth',  amount: 49 },
  pro:     { name: 'Pro',     amount: 99 },
}

export async function GET(req: NextRequest) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!
  const { searchParams } = req.nextUrl
  const planId = searchParams.get('plan') || ''

  const plan = PLAN_PRICES[planId]
  if (!plan) {
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=invalid_plan`)
  }

  // Authenticate the current user.
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

  // Get the user's connected store + access token.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: store } = await supabase
    .from('stores')
    .select('shop_domain, access_token')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!store?.shop_domain || !store?.access_token) {
    return NextResponse.redirect(`${APP_URL}/dashboard?error=no_store`)
  }

  // Shopify sends the merchant back here after they approve the charge. We embed
  // shop + plan so the callback can activate the right plan for the right store.
  const returnUrl = `${APP_URL}/api/shopify/billing/callback?shop=${encodeURIComponent(store.shop_domain)}&plan=${planId}`

  const mutation = `mutation AppSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean) {
    appSubscriptionCreate(name: $name, lineItems: $lineItems, returnUrl: $returnUrl, test: $test) {
      userErrors { field message }
      confirmationUrl
      appSubscription { id status }
    }
  }`

  const variables = {
    name: `Recivo ${plan.name}`,
    returnUrl,
    // Development/Plus-sandbox stores can ONLY create test charges, so reviewers
    // are never charged. Production stores charge normally with test:false.
    test: false,
    lineItems: [
      {
        plan: {
          appRecurringPricingDetails: {
            price: { amount: plan.amount, currencyCode: 'USD' },
            interval: 'EVERY_30_DAYS',
          },
        },
      },
    ],
  }

  let confirmationUrl: string | null = null
  try {
    const res = await fetch(
      `https://${store.shop_domain}/admin/api/2024-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': store.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: mutation, variables }),
      }
    )
    const json = await res.json()
    const result = json?.data?.appSubscriptionCreate
    if (result?.userErrors?.length) {
      console.error('[billing/create] userErrors:', JSON.stringify(result.userErrors))
    }
    confirmationUrl = result?.confirmationUrl || null
    if (!confirmationUrl) {
      console.error('[billing/create] no confirmationUrl. Full response:', JSON.stringify(json))
    }
  } catch (err) {
    console.error('[billing/create] appSubscriptionCreate failed:', err)
  }

  if (!confirmationUrl) {
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=billing_create_failed`)
  }

  return NextResponse.redirect(confirmationUrl)
}
