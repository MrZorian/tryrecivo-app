/**
 * GDPR Mandatory Webhook: customers/redact
 * Shopify calls this when a customer asks to delete their personal data.
 * We must delete all stored data for this customer.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createClient } from '@supabase/supabase-js'

function verifyHmac(body: string, hmacHeader: string | null): boolean {
    if (!hmacHeader) return false
    const secret = process.env.SHOPIFY_API_SECRET!
    const digest = createHmac('sha256', secret).update(body, 'utf8').digest('base64')
    return digest === hmacHeader
}

export async function POST(req: NextRequest) {
    const body = await req.text()
    const hmac = req.headers.get('x-shopify-hmac-sha256')

  if (!verifyHmac(body, hmac)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = JSON.parse(body)
    const { shop_domain, customer, orders_to_redact } = payload

  const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

  // Delete email logs for this customer from this shop
  if (orders_to_redact?.length > 0) {
        const orderIds = orders_to_redact.map((o: any) => String(o.id))
        const { data: store } = await supabase
          .from('stores')
          .select('id')
          .eq('shop_domain', shop_domain)
          .maybeSingle()

      if (store) {
              await supabase
                .from('email_logs')
                .delete()
                .eq('store_id', store.id)
                .in('order_id', orderIds)
      }
  }

  console.log(`[GDPR] Redacted customer ${customer?.id} data on shop ${shop_domain}`)

  return NextResponse.json({ acknowledged: true }, { status: 200 })
}
