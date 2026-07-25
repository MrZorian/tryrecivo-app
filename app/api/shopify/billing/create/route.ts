/**
 * GET /api/shopify/billing/create?plan=starter|growth|pro
 *
 * This app uses Shopify **Managed Pricing**, so charges are created and approved
 * on Shopify's hosted plan-selection page — NOT via the Billing API
 * (`appSubscriptionCreate` is rejected for Managed Pricing apps with
 * "Managed Pricing Apps cannot use the Billing API").
 *
 * We simply redirect the merchant to the Managed Pricing plan page. After they
 * choose/confirm a plan, Shopify activates the subscription and returns them to
 * the app; the billing page then reads the active subscription via GraphQL
 * (see /api/shopify/billing/status) and reflects the current plan.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const VALID_PLANS = ['starter', 'growth', 'pro']

export async function GET(req: NextRequest) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!
  const { searchParams } = req.nextUrl
  const planId = searchParams.get('plan') || ''

  if (!VALID_PLANS.includes(planId)) {
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

  // Get the user's connected store.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: store } = await supabase
    .from('stores')
    .select('shop_domain')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!store?.shop_domain) {
    return NextResponse.redirect(`${APP_URL}/dashboard?error=no_store`)
  }

  // Redirect to the Shopify Managed Pricing plan-selection page for this plan.
  const storeHandle = store.shop_domain.replace('.myshopify.com', '')
  const planUrl = `https://admin.shopify.com/store/${storeHandle}/charges/recivo/plans/${planId}?interval=EVERY_30_DAYS`

  return NextResponse.redirect(planUrl)
}
