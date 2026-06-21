import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const shop = req.headers.get('x-shopify-shop-domain')
  if (!shop) return NextResponse.json({ error: 'Missing shop' }, { status: 400 })

  const order = await req.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get store
  const { data: store } = await supabase.from('stores').select('*').eq('shop_domain', shop).single()
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  // Check profile email limit
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', store.user_id).single()
  if (profile && profile.emails_used >= profile.emails_limit) {
    return NextResponse.json({ error: 'Email limit reached' }, { status: 429 })
  }

  // Get receipt settings
  const { data: settings } = await supabase.from('receipt_settings').select('*').eq('store_id', store.id).single()

  const customerEmail = order.email
  const customerName = `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim()
  if (!customerEmail) return NextResponse.json({ ok: true })

  // Build email HTML
  const brandColor = settings?.brand_color || '#1a2f5e'
  const lineItems = order.line_items?.map((item: any) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;">${item.title} x${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;text-align:right;">$${item.price}</td>
    </tr>
  `).join('')

  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,sans-serif;">
<div style="max-width:580px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <div style="background:${brandColor};padding:32px 32px 28px;">
    <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1px;">${store.shop_name}</p>
    <h1 style="margin:0 0 6px;font-size:24px;font-weight:700;color:white;">Order confirmed! 🎉</h1>
    <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.7);">Order #${order.order_number} · ${new Date(order.created_at).toLocaleDateString()}</p>
  </div>

  <!-- Body -->
  <div style="padding:28px 32px;">
    <p style="margin:0 0 20px;font-size:15px;color:#334155;">Hi ${customerName || 'there'},</p>

    <!-- Items -->
    <table style="width:100%;border-collapse:collapse;">
      ${lineItems}
    </table>

    <!-- Totals -->
    <div style="margin-top:16px;padding-top:16px;border-top:2px solid #f1f5f9;">
      ${settings?.show_delivery_charges && order.shipping_lines?.length > 0 ? `
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:14px;color:#64748b;">Delivery</span>
        <span style="font-size:14px;color:#334155;">$${order.shipping_lines?.[0]?.price || '0.00'}</span>
      </div>` : ''}
      ${settings?.show_tax_breakdown ? `
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:14px;color:#64748b;">Tax</span>
        <span style="font-size:14px;color:#334155;">$${order.total_tax || '0.00'}</span>
      </div>` : ''}
      <div style="background:#e0f7f4;border-radius:10px;padding:14px 16px;display:flex;justify-content:space-between;margin-top:12px;">
        <span style="font-size:16px;font-weight:700;color:#085041;">Total</span>
        <span style="font-size:16px;font-weight:700;color:#085041;">$${order.total_price}</span>
      </div>
    </div>

    <!-- Thank you message -->
    ${settings?.thank_you_message ? `<p style="margin:24px 0 0;font-size:14px;color:#64748b;line-height:1.6;">${settings.thank_you_message}</p>` : ''}

    <!-- Return policy -->
    ${settings?.return_policy ? `
    <div style="margin-top:20px;padding:14px 16px;background:#f8fafc;border-radius:8px;border-left:3px solid ${brandColor};">
      <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;"><strong style="color:#334155;">Return policy:</strong> ${settings.return_policy}</p>
    </div>` : ''}

    <!-- Social links -->
    ${settings?.show_social_links && (settings?.instagram_url || settings?.tiktok_url || settings?.facebook_url) ? `
    <div style="margin-top:24px;text-align:center;">
      <p style="font-size:12px;color:#94a3b8;margin-bottom:10px;">Follow us</p>
      <div>
        ${settings.instagram_url ? `<a href="${settings.instagram_url}" style="margin:0 8px;font-size:12px;color:${brandColor};font-weight:600;">Instagram</a>` : ''}
        ${settings.tiktok_url ? `<a href="${settings.tiktok_url}" style="margin:0 8px;font-size:12px;color:${brandColor};font-weight:600;">TikTok</a>` : ''}
        ${settings.facebook_url ? `<a href="${settings.facebook_url}" style="margin:0 8px;font-size:12px;color:${brandColor};font-weight:600;">Facebook</a>` : ''}
      </div>
    </div>` : ''}

    <!-- Disclaimer -->
    ${settings?.disclaimer ? `<p style="margin-top:20px;font-size:11px;color:#94a3b8;line-height:1.5;">${settings.disclaimer}</p>` : ''}
  </div>

  <!-- Footer -->
  <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #f1f5f9;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Powered by <a href="https://tryrecivo.com" style="color:#00bfa5;font-weight:600;">Recivo</a></p>
  </div>
</div>
</body>
</html>
  `

  // Send email via Resend
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

  // Log the email
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

  // Increment email count
  await supabase.from('profiles').update({ emails_used: (profile?.emails_used || 0) + 1 }).eq('id', store.user_id)

  return NextResponse.json({ ok: true })
}
