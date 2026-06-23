import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const PLAN_LIMITS: Record<string, { emails_limit: number }> = {
  starter: { emails_limit: 5000 },
  growth:  { emails_limit: 20000 },
  pro:     { emails_limit: 999999 },
}

export async function GET(req: NextRequest) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!
  const { searchParams } = req.nextUrl
  // GraphQL billing returns charge_id as the subscription GID or numeric id
  const chargeId = searchParams.get('charge_id')
  const planId = searchParams.get('plan')
  const shop = searchParams.get('shop')

  if (!planId || !shop) {
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=missing_params`)
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

  // Get store access token
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: store } = await supabase
    .from('stores')
    .select('access_token')
    .eq('shop_domain', shop)
    .eq('user_id', user.id)
    .single()

  if (!store) {
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=store_not_found`)
  }

  // Verify subscription status via GraphQL
  const query = `
    query getSubscription($id: ID!) {
      node(id: $id) {
        ... on AppSubscription {
          id
          status
        }
      }
    }
  `
  // charge_id from Shopify can be numeric -- build GID if needed
  const gid = chargeId && chargeId.startsWith('gid://') ? chargeId : `gid://shopify/AppSubscription/${chargeId}`

  const verifyRes = await fetch(`https://${shop}/admin/api/2026-04/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': store.access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { id: gid } }),
  })
  const verifyJson = await verifyRes.json()
  const subscription = verifyJson?.data?.node

  if (!subscription || subscription.status !== 'ACCEPTED') {
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=charge_declined`)
  }

  // Activate the subscription
  const activateMutation = `
    mutation appSubscriptionActivate($id: ID!) {
      appSubscriptionActivate(id: $id) {
        appSubscription { id status }
        userErrors { field message }
      }
    }
  `
  await fetch(`https://${shop}/admin/api/2026-04/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': store.access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: activateMutation, variables: { id: gid } }),
  })

  // Update user plan + limits in Supabase
  const planLimits = PLAN_LIMITS[planId] || { emails_limit: 500 }
  await supabase
    .from('profiles')
    .update({
      plan: planId,
      emails_limit: planLimits.emails_limit,
      shopify_charge_id: chargeId,
    })
    .eq('id', user.id)

  return NextResponse.redirect(`${APP_URL}/dashboard/billing?upgraded=true`)
}
