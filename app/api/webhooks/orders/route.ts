import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { createHmac } from 'crypto'
import { buildEmailHtml } from '@/lib/emailTemplates'

const resend = new Resend(process.env.RESEND_API_KEY)

async function verifyShopifyHmac(req: NextRequest, body: string): Promise<boolean> {
  const hmacHeader = req.headers.get('x-shopify-hmac-sha256')
  if (!hmacHeader) return false
  const secret = process.env.SHOPIFY_API_SECRET!
  const digest = createHmac('sha256', secret).update(body, 'utf8').digest('base64')
  return digest === hmacHeader
}

export async function POST(req: NextRequest) {
  const shop = req.headers.get('x-shopify-shop-domain')
  if (!shop) return NextResponse.json({ error: 'Missing shop' }, { status: 400 })

  const rawBody = await req.text()
  const isValid = await verifyShopifyHmac(req, rawBody)
  if (!isValid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const order = JSON.parse(rawBody)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: store } = await supabase.from('stores').select('*').eq('shop_domain', shop).single()
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', store.user_id).single()
  if (profile && profile.emails_used >= profile.emails_limit) {
    return NextResponse.json({ error: 'Email limit reached' }, { status: 429 })
  }

  const { data: settings } = await supabase.from('receipt_settings').select('*').eq('store_id', store.id).single()

  const customerEmail = order.email
  const customerName = `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim()
  if (!customerEmail) return NextResponse.json({ ok: true })

  const isPaidPlan = profile?.plan && profile.plan !== 'free'
  const emailHtml = buildEmailHtml(order, store, settings, isPaidPlan)

  const { data: emailData, error } = await resend.emails.send({
    from: `${store.shop_name} <receipts@tryrecivo.com>`,
    to: customerEmail,
    subject: `Order #${order.order_number} confirmed — ${store.shop_name}`,
    html: emailHtml,
  })

  if (error) {
    console.error('Resend error:', error)
    return NextResponse.json({ error }, { status: 500 })
  }

  await supabase.from('email_logs').insert({
    store_id: store.id,
    order_id: order.id.toString(),
    order_number: order.order_number.toString(),
    customer_email: customerEmail,
    customer_name: customerName,
    status: 'sent',
    resend_email_id: emailData?.id,
    order_total: parseFloat(order.total_price),
  })

  await supabase.from('profiles').update({ emails_used: (profile?.emails_used || 0) + 1 }).eq('id', store.user_id)

  return NextResponse.json({ ok: true })
}
