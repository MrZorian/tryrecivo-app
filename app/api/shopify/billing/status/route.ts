/**
 * GET /api/shopify/billing/status
 *
 * Source-of-truth plan check. Instead of trusting a billing callback (which
 * Shopify App Pricing / managed pricing may not fire against our own endpoint),
 * we ask Shopify directly which subscription is active for the merchant's store
 * via the Admin GraphQL API, then sync our `profiles` row to match.
 *
 * Returns: { plan, emails_limit }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const PLAN_LIMITS: Record<string, number> = {
  free: 500,
  starter: 5000,
  growth: 20000,
  pro: 999999,
}

// Map a Shopify subscription name (e.g. "Growth", "Pro plan") to our plan id.
function planIdFromName(name: string): string {
  const n = (name || '').toLowerCase()
  if (n.includes('pro')) return 'pro'
  if (n.includes('growth')) return 'growth'
  if (n.includes('starter')) return 'starter'
  return 'free'
}

export async function GET(req: NextRequest) {
  // 1. Authenticate the current user from their session cookie.
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
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  // 2. Look up the user's active store + access token (service role).
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

  // No store yet → fall back to whatever we already have on the profile.
  if (!store?.shop_domain || !store?.access_token) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, emails_limit')
      .eq('id', user.id)
      .maybeSingle()
    return NextResponse.json({
      plan: profile?.plan || 'free',
      emails_limit: profile?.emails_limit || 500,
      source: 'profile',
    })
  }

  // 3. Ask Shopify which subscription is active for this shop.
  let plan = 'free'
  try {
    const gqlRes = await fetch(
      `https://${store.shop_domain}/admin/api/2024-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': store.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `{
            currentAppInstallation {
              activeSubscriptions { name status }
            }
          }`,
        }),
      }
    )
    const gqlJson = await gqlRes.json()
    const subs = gqlJson?.data?.currentAppInstallation?.activeSubscriptions || []
    const active = subs.find(
      (s: { name: string; status: string }) => s.status === 'ACTIVE'
    )
    if (active) plan = planIdFromName(active.name)
  } catch (err) {
    console.error('[billing/status] GraphQL query failed:', err)
    // On failure, don't downgrade — return the stored plan.
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, emails_limit')
      .eq('id', user.id)
      .maybeSingle()
    return NextResponse.json({
      plan: profile?.plan || 'free',
      emails_limit: profile?.emails_limit || 500,
      source: 'profile-fallback',
    })
  }

  // 4. Sync the profile to match Shopify's truth.
  const emails_limit = PLAN_LIMITS[plan] ?? 500
  await supabase
    .from('profiles')
    .update({ plan, emails_limit })
    .eq('id', user.id)

  return NextResponse.json({ plan, emails_limit, source: 'shopify' })
}
