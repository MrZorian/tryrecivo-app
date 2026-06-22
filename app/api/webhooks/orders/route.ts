import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { createHmac } from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

async function verifyShopifyHmac(req: NextRequest, body: string): Promise<boolean> {
  const hmacHeader = req.headers.get('x-shopify-hmac-sha256')
  if (!hmacHeader) return false
  const secret = process.env.SHOPIFY_API_SECRET!
  const digest = createHmac('sha256', secret).update(body, 'utf8').digest('base64')
  return digest === hmacHeader
}

function buildEmailHtml(order: any, store: any, settings: any, isPaidPlan: boolean): string {
  const style = settings?.receipt_style || 'bold'
  const brandColor = settings?.brand_color || '#1a2f5e'
  const accentColor = '#00bfa5'

  const lineItemsData = order.line_items || []
  const storeName = store.shop_name || store.shop_domain

  const brandinFooter = isPaidPlan ? '' : `
    <tr><td colspan="2" style="padding:16px 32px;text-align:center;background:#f8fafc;border-top:1px solid #f1f5f9;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">
        Powered by <a href="https://tryrecivo.com" style="color:#00bfa5;font-weight:700;text-decoration:none;">
          <img src="https://tryrecivo.com/favicon.ico" width="12" height="12" style="vertical-align:middle;margin-right:3px;" alt=""/>Recivo
        </a> - Branded receipts for Shopify
      </p>
    </td></tr>`

  const shippingRow = settings?.show_delivery_charges && order.shipping_lines?.length > 0
    ? `<tr><td style="font-size:13px;color:#64748b;padding:4px 0;">Shipping</td><td style="font-size:13px;color:#334155;text-align:right;padding:4px 0;">$${order.shipping_lines[0]?.price || '0.00'}</td></tr>` : ''

  const taxRow = settings?.show_tax_breakdown
    ? `<tr><td style="font-size:13px;color:#64748b;padding:4px 0;">Tax</td><td style="font-size:13px;color:#334155;text-align:right;padding:4px 0;">$${order.total_tax || '0.00'}</td></tr>` : ''

  const socialLinks = settings?.show_social_links && (settings?.instagram_url || settings?.tiktok_url || settings?.facebook_url)
    ? `<div style="margin-top:24px;text-align:center;">
        <p style="font-size:11px;color:#94a3b8;margin:0 0 8px;">Follow us</p>
        ${settings.instagram_url ? `<a href="${settings.instagram_url}" style="margin:0 6px;font-size:12px;color:${brandColor};font-weight:600;">Instagram</a>` : ''}
        ${settings.tiktok_url ? `<a href="${settings.tiktok_url}" style="margin:0 6px;font-size:12px;color:${brandColor};font-weight:600;">TikTok</a>` : ''}
        ${settings.facebook_url ? `<a href="${settings.facebook_url}" style="margin:0 6px;font-size:12px;color:${brandColor};font-weight:600;">Facebook</a>` : ''}
      </div>` : ''

  const customerName = `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || 'there'

  if (style === 'bold') {
    const itemRows = lineItemsData.map((item: any) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;">${item.title}${item.variant_title ? ` <span style="color:#94a3b8;font-size:12px;">(${item.variant_title})</span>` : ''} x${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;text-align:right;white-space:nowrap;">$${item.price}</td>
      </tr>`).join('')

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table width="580" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10);">
  <tr><td style="background:${brandColor};padding:36px 32px;">
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:1.5px;">${storeName}</p>
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:white;">Order confirmed!</h1>
    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.65);">Order #${order.order_number} - ${new Date(order.created_at).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</p>
  </td></tr>
  <tr><td style="padding:28px 32px;">
    <p style="margin:0 0 20px;font-size:15px;color:#334155;">Hi ${customerName},</p>
    <table width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:2px solid #f1f5f9;padding-top:16px;">
      ${shippingRow}${taxRow}
      <tr><td colspan="2" style="padding-top:10px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="background:#e0f7f4;border-radius:10px;padding:14px 16px;font-size:16px;font-weight:800;color:#085041;">Total</td>
          <td style="background:#e0f7f4;border-radius:10px;padding:14px 16px;font-size:16px;font-weight:800;color:#085041;text-align:right;">$${order.total_price}</td>
        </tr></table>
      </td></tr>
    </table>
    ${settings?.thank_you_message ? `<p style="margin:24px 0 0;font-size:14px;color:#64748b;line-height:1.7;">${settings.thank_you_message}</p>` : ''}
    ${settings?.return_policy ? `<div style="margin-top:20px;padding:14px 16px;background:#f8fafc;border-radius:8px;border-left:3px solid ${brandColor};"><p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;"><strong style="color:#334155;">Returns:</strong> ${settings.return_policy}</p></div>` : ''}
    ${socialLinks}
    ${settings?.disclaimer ? `<p style="margin-top:20px;font-size:11px;color:#94a3b8;line-height:1.5;">${settings.disclaimer}</p>` : ''}
  </td></tr>
  ${brandinFooter}
</table></td></tr></table></body></html>`
  }

  if (style === 'minimal') {
    const itemRows = lineItemsData.map((item: any) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f5f5f5;font-size:13px;color:#333;">${item.title}${item.variant_title ? ` (${item.variant_title})` : ''} x${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f5f5f5;font-size:13px;color:#333;text-align:right;">$${item.price}</td>
      </tr>`).join('')

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:48px 16px;">
<table width="520" cellpadding="0" cellspacing="0">
  <tr><td style="border-bottom:2px solid #111;padding-bottom:20px;">
    <p style="margin:0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#888;">${storeName}</p>
    <h1 style="margin:8px 0 0;font-size:22px;font-weight:normal;color:#111;letter-spacing:-0.5px;">Order Receipt</h1>
  </td></tr>
  <tr><td style="padding:20px 0 0;">
    <p style="margin:0 0 4px;font-size:12px;color:#888;letter-spacing:1px;text-transform:uppercase;">Order #${order.order_number}</p>
    <p style="margin:0 0 24px;font-size:12px;color:#888;">${new Date(order.created_at).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</p>
    <p style="margin:0 0 20px;font-size:14px;color:#333;">Dear ${customerName},</p>
    <table width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
      ${shippingRow}${taxRow}
      <tr>
        <td style="padding:12px 0 0;font-size:14px;font-weight:bold;color:#111;border-top:1px solid #111;">Total</td>
        <td style="padding:12px 0 0;font-size:14px;font-weight:bold;color:#111;text-align:right;border-top:1px solid #111;">$${order.total_price}</td>
      </tr>
    </table>
    ${settings?.thank_you_message ? `<p style="margin:28px 0 0;font-size:13px;color:#555;line-height:1.8;font-style:italic;">"${settings.thank_you_message}"</p>` : ''}
    ${settings?.return_policy ? `<p style="margin:16px 0 0;font-size:11px;color:#888;line-height:1.6;border-top:1px solid #eee;padding-top:16px;">${settings.return_policy}</p>` : ''}
    ${socialLinks}
    ${settings?.disclaimer ? `<p style="margin-top:16px;font-size:10px;color:#bbb;line-height:1.5;">${settings.disclaimer}</p>` : ''}
  </td></tr>
  ${brandinFooter}
</table></td></tr></table></body></html>`
  }

  if (style === 'classic') {
    const itemRows = lineItemsData.map((item: any) => `
      <tr style="background:white;">
        <td style="padding:10px 12px;border:1px solid #ddd;font-size:13px;color:#333;">${item.title}${item.variant_title ? `<br><span style="color:#999;font-size:11px;">${item.variant_title}</span>` : ''}</td>
        <td style="padding:10px 12px;border:1px solid #ddd;font-size:13px;color:#333;text-align:center;">x${item.quantity}</td>
        <td style="padding:10px 12px;border:1px solid #ddd;font-size:13px;color:#333;text-align:right;">$${item.price}</td>
      </tr>`).join('')

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="580" cellpadding="0" cellspacing="0" style="background:white;border:1px solid #ddd;">
  <tr><td style="background:${brandColor};padding:20px 24px;">
    <table width="100%"><tr>
      <td><p style="margin:0;font-size:18px;font-weight:bold;color:white;">${storeName}</p></td>
      <td style="text-align:right;"><p style="margin:0;font-size:12px;color:rgba(255,255,255,0.8);">ORDER RECEIPT</p></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:20px 24px;background:#f9f9f9;border-bottom:1px solid #ddd;">
    <table width="100%"><tr>
      <td><p style="margin:0;font-size:12px;color:#666;">Order No.</p><p style="margin:4px 0 0;font-size:14px;font-weight:bold;color:#333;">#${order.order_number}</p></td>
      <td><p style="margin:0;font-size:12px;color:#666;">Date</p><p style="margin:4px 0 0;font-size:14px;color:#333;">${new Date(order.created_at).toLocaleDateString()}</p></td>
      <td><p style="margin:0;font-size:12px;color:#666;">Bill To</p><p style="margin:4px 0 0;font-size:14px;color:#333;">${customerName}</p></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:20px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr style="background:#f0f0f0;">
        <th style="padding:8px 12px;border:1px solid #ddd;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#666;text-align:left;">Item</th>
        <th style="padding:8px 12px;border:1px solid #ddd;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#666;text-align:center;">Qty</th>
        <th style="padding:8px 12px;border:1px solid #ddd;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#666;text-align:right;">Price</th>
      </tr>
      ${itemRows}
      ${shippingRow ? `<tr><td colspan="2" style="padding:8px 12px;border:1px solid #ddd;font-size:13px;color:#666;">Shipping</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;text-align:right;color:#333;">$${order.shipping_lines?.[0]?.price || '0.00'}</td></tr>` : ''}
      ${taxRow ? `<tr><td colspan="2" style="padding:8px 12px;border:1px solid #ddd;font-size:13px;color:#666;">Tax</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;text-align:right;color:#333;">$${order.total_tax || '0.00'}</td></tr>` : ''}
      <tr style="background:#f0f0f0;">
        <td colspan="2" style="padding:10px 12px;border:1px solid #ddd;font-size:14px;font-weight:bold;color:#333;">TOTAL</td>
        <td style="padding:10px 12px;border:1px solid #ddd;font-size:14px;font-weight:bold;color:${brandColor};text-align:right;">$${order.total_price}</td>
      </tr>
    </table>
    ${settings?.thank_you_message ? `<p style="margin:20px 0 0;font-size:13px;color:#555;line-height:1.7;padding:12px;background:#f9f9f9;border-left:3px solid ${brandColor};">${settings.thank_you_message}</p>` : ''}
    ${settings?.return_policy ? `<p style="margin:12px 0 0;font-size:11px;color:#888;line-height:1.5;">${settings.return_policy}</p>` : ''}
    ${socialLinks}
    ${settings?.disclaimer ? `<p style="margin-top:12px;font-size:10px;color:#bbb;line-height:1.5;">${settings.disclaimer}</p>` : ''}
  </td></tr>
  ${brandinFooter}
</table></td></tr></table></body></html>`
  }

  const goldColor = '#c9a84c'
  const itemRows = lineItemsData.map((item: any) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e8e0d0;font-size:14px;color:#2c2c2c;font-family:Georgia,serif;">${item.title}${item.variant_title ? `<br><span style="color:#999;font-size:11px;font-style:italic;">${item.variant_title}</span>` : ''} x${item.quantity}</td>
      <td style="padding:12px 0;border-bottom:1px solid #e8e0d0;font-size:14px;color:#2c2c2c;text-align:right;font-family:Georgia,serif;">$${item.price}</td>
    </tr>`).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#1a1a1a;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fdfaf5;border-radius:4px;overflow:hidden;box-shadow:0 8px 48px rgba(0,0,0,0.4);">
  <tr><td style="background:#111;padding:40px 40px 32px;text-align:center;border-bottom:3px solid ${goldColor};">
    <p style="margin:0 0 12px;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:${goldColor};">${storeName}</p>
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:normal;color:white;letter-spacing:2px;text-transform:uppercase;">Order Confirmed</h1>
    <p style="margin:0;font-size:12px;color:#aaa;letter-spacing:1px;">No. ${order.order_number} - ${new Date(order.created_at).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</p>
  </td></tr>
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 24px;font-size:15px;color:#444;font-style:italic;">Dear ${customerName},</p>
    <p style="margin:0 0 20px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999;">Your Items</p>
    <table width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      ${shippingRow}${taxRow}
    </table>
    <div style="margin-top:20px;padding:20px;background:#111;border-radius:2px;">
      <table width="100%"><tr>
        <td style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${goldColor};">Total</td>
        <td style="font-size:20px;font-weight:bold;color:${goldColor};text-align:right;">$${order.total_price}</td>
      </tr></table>
    </div>
    ${settings?.thank_you_message ? `<p style="margin:28px 0 0;font-size:13px;color:#555;line-height:1.9;text-align:center;font-style:italic;">"${settings.thank_you_message}"</p>` : ''}
    ${settings?.return_policy ? `<p style="margin:20px 0 0;font-size:11px;color:#888;line-height:1.7;padding-top:16px;border-top:1px solid #e8e0d0;">${settings.return_policy}</p>` : ''}
    ${socialLinks}
    ${settings?.disclaimer ? `<p style="margin-top:16px;font-size:10px;color:#bbb;line-height:1.5;">${settings.disclaimer}</p>` : ''}
  </td></tr>
  <tr><td style="background:#111;padding:16px 40px;text-align:center;border-top:1px solid #333;">
    <p style="margin:0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#555;">Thank you for your order</p>
  </td></tr>
  ${brandinFooter}
</table></td></tr></table></body></html>`
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

  const isPaidPlan = profile && profile.plan !== 'free'
  const emailHtml = buildEmailHtml(order, store, settings, isPaidPlan)

  const { data: emailData, error } = await resend.emails.send({
    from: `${store.shop_name} <receipts@tryrecivo.com>`,
    to: customerEmail,
    subject: `Order #${order.order_number} confirmed - ${store.shop_name}`,
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
