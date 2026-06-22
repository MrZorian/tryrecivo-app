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
  const chargeId = searchParams.get('charge_id')
  const planId = searchParams.get('plan')
  const shop = searchParams.get('shop')

  if (!chargeId || !planId || !shop) {
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=missing_params`)
  }

  // Auth check
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return req.cookies.get(name)?.value },
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

  // Verify charge status with Shopify
  const chargeRes = await fetch(
    `https://${shop}/admin/api/2024-01/recurring_application_charges/${chargeId}.json`,
    { headers: { 'X-Shopify-Access-Token': store.access_token } }
  )
  const { recurring_application_charge: charge } = await chargeRes.json()

  if (!charge || charge.status !== 'accepted') {
    return NextResponse.redirect(`${APP_URL}/dashboard/billing?error=charge_declined`)
  }

  // Activate the charge
  await fetch(
    `https://${shop}/admin/api/2024-01/recurring_application_charges/${chargeId}/activate.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': store.access_token,
        'Content-Type': 'application/json',
      },
    }
  )

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
