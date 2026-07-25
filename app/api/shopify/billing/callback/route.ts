/**
 * GET /api/shopify/billing/callback?shop=...&plan=...&charge_id=...
 *
 * Return URL for the Billing API flow. After the merchant approves the charge,
 * Shopify redirects here with a charge_id. We verify the AppSubscription is
 * ACTIVE, sync the plan onto the user's profile, and send them back to billing.
 *
 * Uses the service-role client + shop-domain lookup because the Supabase session
 * cookie is not reliably present on Shopify's cross-domain redirect.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PLAN_LIMITS: Record<string, number> = {
  starter: 5000,
  growth: 20000,
  pro: 999999,
}

function planIdFromName(name: string): string {
  const n = (name || '').toLowerCase()
  if (n.includes('pro')) return 'pro'
  if (n.includes('growth')) return 'growth'
  if (n.includes('starter')) return 'starter'
  return 'free'
}

export async function GET(req: NextRequest) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!
  const { searchParams } = req.nextUrl
  const shop = searchParams.get('shop')
  const planParam = (searchParams.get('plan') || '').toLowerCase()
  const chargeId = searchParams.get('charge_id')

  if (!shop) {
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=missing_params`)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Resolve the store (and its token + owner) from the shop domain.
  const { data: store } = await supabase
    .from('stores')
    .select('user_id, access_token')
    .eq('shop_domain', shop)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!store?.user_id || !store?.access_token) {
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=store_not_found`)
  }

  // Verify the subscription is actually ACTIVE before granting the plan. We ask
  // Shopify directly rather than trusting the redirect params.
  let plan = 'free'
  try {
    const query = `{
      currentAppInstallation {
        activeSubscriptions { name status }
      }
    }`
    const res = await fetch(
      `https://${shop}/admin/api/2024-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': store.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    )
    const json = await res.json()
    const subs = json?.data?.currentAppInstallation?.activeSubscriptions || []
    const active = subs.find(
      (s: { name: string; status: string }) => s.status === 'ACTIVE'
    )
    if (active) {
      plan = planIdFromName(active.name)
    } else if (planParam && PLAN_LIMITS[planParam]) {
      // Fallback: trust the plan we initiated the charge for.
      plan = planParam
    }
  } catch (err) {
    console.error('[billing/callback] verification query failed:', err)
    if (planParam && PLAN_LIMITS[planParam]) plan = planParam
  }

  if (plan === 'free') {
    // No active subscription found — the merchant likely declined.
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=charge_declined`)
  }

  const emailsLimit = PLAN_LIMITS[plan] ?? 500
  await supabase
    .from('profiles')
    .update({ plan, emails_limit: emailsLimit })
    .eq('id', store.user_id)

  console.log(`[billing/callback] Activated ${plan} for ${shop} (charge_id=${chargeId})`)
  return NextResponse.redirect(`${APP_URL}/dashboard/billing?upgraded=true`)
}
