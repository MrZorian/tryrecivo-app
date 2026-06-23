import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

const PLAN_LIMITS: Record<string, { emails_limit: number }> = {
  starter: { emails_limit: 5000 },
  growth:  { emails_limit: 20000 },
  pro:     { emails_limit: 999999 },
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('Stripe webhook signature error:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId  = session.metadata?.user_id
    const planId  = session.metadata?.plan
    if (userId && planId) {
      const limits = PLAN_LIMITS[planId] || { emails_limit: 500 }
      await supabase.from('profiles').update({
        plan: planId,
        emails_limit: limits.emails_limit,
        stripe_subscription_id: session.subscription as string,
        stripe_customer_id: session.customer as string,
      }).eq('id', userId)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.user_id
    if (userId) {
      await supabase.from('profiles').update({
        plan: 'free',
        emails_limit: 500,
        stripe_subscription_id: null,
      }).eq('id', userId)
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const sub    = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.user_id
    const planId = sub.metadata?.plan
    if (userId && planId && sub.status === 'active') {
      const limits = PLAN_LIMITS[planId] || { emails_limit: 500 }
      await supabase.from('profiles').update({
        plan: planId,
        emails_limit: limits.emails_limit,
      }).eq('id', userId)
    }
  }

  return NextResponse.json({ received: true })
}
