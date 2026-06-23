// Shared email template logic -- used by both the webhook handler and the receipt preview

export type ReceiptStyle = 'basic' | 'modern' | 'classic' | 'luxury'

export interface ReceiptSettings {
  receipt_style?: string
  brand_color?: string
  thank_you_message?: string
  return_policy?: string
  disclaimer?: string
  show_delivery_charges?: boolean
  show_tax_breakdown?: boolean
  show_social_links?: boolean
  instagram_url?: string
  tiktok_url?: string
  facebook_url?: string
  twitter_url?: string
  pinterest_url?: string
  youtube_url?: string
  linkedin_url?: string
}

export function normalizeStyle(style: string | undefined): ReceiptStyle {
  const compat: Record<string, ReceiptStyle> = { bold: 'basic', minimal: 'modern' }
  const s = style || 'basic'
  return (compat[s] as ReceiptStyle) || (s as ReceiptStyle)
}

export const PLAN_STYLES: Record<string, ReceiptStyle[]> = {
  free: ['basic'],
  starter: ['basic', 'modern', 'classic'],
  growth: ['basic', 'modern', 'classic', 'luxury'],
  pro: ['basic', 'modern', 'classic', 'luxury'],
}

export const SOCIAL_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', color: '#E1306C', iconUrl: 'https://img.icons8.com/color/32/000000/instagram-new--v1.png' },
  { id: 'tiktok',    name: 'TikTok',    color: '#010101', iconUrl: 'https://img.icons8.com/color/32/000000/tiktok.png' },
  { id: 'facebook',  name: 'Facebook',  color: '#1877F2', iconUrl: 'https://img.icons8.com/color/32/000000/facebook-new.png' },
  { id: 'twitter',   name: 'Twitter / X', color: '#000000', iconUrl: 'https://img.icons8.com/color/32/000000/twitter--v1.png' },
  { id: 'pinterest', name: 'Pinterest', color: '#E60023', iconUrl: 'https://img.icons8.com/color/32/000000/pinterest--v1.png' },
  { id: 'youtube',   name: 'YouTube',   color: '#FF0000', iconUrl: 'https://img.icons8.com/color/32/000000/youtube-play.png' },
  { id: 'linkedin',  name: 'LinkedIn',  color: '#0A66C2', iconUrl: 'https://img.icons8.com/color/32/000000/linkedin.png' },
]

export interface OrderData {
  order_number: string | number
  created_at: string
  total_price: string
  total_tax?: string
  line_items?: Array<{ title: string; variant_title?: string; quantity: number; price: string }>
  shipping_lines?: Array<{ price: string }>
  customer?: { first_name?: string; last_name?: string }
}

export interface StoreData {
  shop_name?: string
  shop_domain?: string
}

function buildSocialLinks(settings: ReceiptSettings): string {
  if (!settings.show_social_links) return ''
  const links = SOCIAL_PLATFORMS
    .map(p => {
      const url = (settings as any)[`${p.id}_url`]
      if (!url) return ''
      return `<a href="${url}" target="_blank" style="display:inline-block;margin:0 5px;text-decoration:none;"><img src="${p.iconUrl}" alt="${p.name}" width="28" height="28" style="display:block;border-radius:6px;" /></a>`
    })
    .filter(Boolean).join('')
  if (!links) return ''
  return `<div style="margin-top:24px;text-align:center;"><p style="font-size:11px;color:#94a3b8;margin:0 0 10px;font-family:sans-serif;">Follow us</p>${links}</div>`
}

export function buildEmailHtml(order: OrderData, store: StoreData, settings: ReceiptSettings | null, isPaidPlan: boolean): string {
  const style = normalizeStyle(settings?.receipt_style)
  const brandColor = settings?.brand_color || '#1a2f5e'
  const lineItemsData = order.line_items || []
  const storeName = store.shop_name || store.shop_domain || 'Your Store'
  const brandingFooter = isPaidPlan ? '' : `<tr><td colspan="2" style="padding:16px 32px;text-align:center;background:#f8fafc;border-top:1px solid #f1f5f9;"><p style="margin:0;font-size:11px;color:#94a3b8;font-family:sans-serif;">Powered by <a href="https://tryrecivo.com" style="color:#00bfa5;font-weight:700;text-decoration:none;">Recivo</a></p></td></tr>`
  const shippingRow = settings?.show_delivery_charges && (order.shipping_lines?.length ?? 0) > 0 ? `<tr><td style="font-size:13px;color:#64748b;padding:4px 0;">Shipping</td><td style="font-size:13px;color:#334155;text-align:right;padding:4px 0;">$${order.shipping_lines![0]?.price || '0.00'}</td></tr>` : ''
  const taxRow = settings?.show_tax_breakdown ? `<tr><td style="font-size:13px;color:#64748b;padding:4px 0;">Tax</td><td style="font-size:13px;color:#334155;text-align:right;padding:4px 0;">$${order.total_tax || '0.00'}</td></tr>` : ''
  const socialLinks = buildSocialLinks(settings || {})
  const customerName = `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || 'there'
  const orderDate = new Date(order.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  if (style === 'basic') {
    const itemRows = lineItemsData.map(item => `<tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;">${item.title}${item.variant_title ? ` <span style="color:#94a3b8;font-size:12px;">(${item.variant_title})</span>` : ''} ×${item.quantity}</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;text-align:right;white-space:nowrap;">$${item.price}</td></tr>`).join('')
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;"><table width="580" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10);"><tr><td style="background:${brandColor};padding:36px 32px;"><p style="margin:0 0 8px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:1.5px;">${storeName}</p><h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:white;">Order confirmed! 🎉</h1><p style="margin:0;font-size:13px;color:rgba(255,255,255,0.65);">Order #${order.order_number} · ${orderDate}</p></td></tr><tr><td style="padding:28px 32px;"><p style="margin:0 0 20px;font-size:15px;color:#334155;">Hi ${customerName},</p><table width="100%" cellpadding="0" cellspacing="0">${itemRows}</table><table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:2px solid #f1f5f9;padding-top:16px;">${shippingRow}${taxRow}<tr><td colspan="2" style="padding-top:10px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#e0f7f4;border-radius:10px;padding:14px 16px;font-size:16px;font-weight:800;color:#085041;">Total</td><td style="background:#e0f7f4;border-radius:10px;padding:14px 16px;font-size:16px;font-weight:800;color:#085041;text-align:right;">$${order.total_price}</td></tr></table></td></tr></table>${settings?.thank_you_message ? `<p style="margin:24px 0 0;font-size:14px;color:#64748b;line-height:1.7;">${settings.thank_you_message}</p>` : ''}${settings?.return_policy ? `<div style="margin-top:20px;padding:14px 16px;background:#f8fafc;border-radius:8px;border-left:3px solid ${brandColor};"><p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;"><strong>Returns:</strong> ${settings.return_policy}</p></div>` : ''}${socialLinks}${settings?.disclaimer ? `<p style="margin-top:20px;font-size:11px;color:#94a3b8;line-height:1.5;">${settings.disclaimer}</p>` : ''}</td></tr>${brandingFooter}</table></td></tr></table></body></html>`
  }
  if (style === 'modern') {
    const itemRows = lineItemsData.map(item => `<tr><td style="padding:8px 0;border-bottom:1px solid #f5f5f5;font-size:13px;color:#333;">${item.title}${item.variant_title ? ` (${item.variant_title})` : ''} ×${item.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #f5f5f5;font-size:13px;color:#333;text-align:right;">$${item.price}</td></tr>`).join('')
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:48px 16px;"><table width="520" cellpadding="0" cellspacing="0"><tr><td style="border-bottom:2px solid #111;padding-bottom:20px;"><p style="margin:0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#888;">${storeName}</p><h1 style="margin:8px 0 0;font-size:22px;font-weight:normal;color:#111;">Order Receipt</h1></td></tr><tr><td style="padding:20px 0 0;"><p style="margin:0 0 4px;font-size:12px;color:#888;letter-spacing:1px;text-transform:uppercase;">Order #${order.order_number}</p><p style="margin:0 0 24px;font-size:12px;color:#888;">${orderDate}</p><p style="margin:0 0 20px;font-size:14px;color:#333;">Dear ${customerName},</p><table width="100%" cellpadding="0" cellspacing="0">${itemRows}</table><table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">${shippingRow}${taxRow}<tr><td style="padding:12px 0 0;font-size:14px;font-weight:bold;color:#111;border-top:1px solid #111;">Total</td><td style="padding:12px 0 0;font-size:14px;font-weight:bold;color:#111;text-align:right;border-top:1px solid #111;">$${order.total_price}</td></tr></table>${settings?.thank_you_message ? `<p style="margin:28px 0 0;font-size:13px;color:#555;line-height:1.8;font-style:italic;">"${settings.thank_you_message}"</p>` : ''}${settings?.return_policy ? `<p style="margin:16px 0 0;font-size:11px;color:#888;line-height:1.6;border-top:1px solid #eee;padding-top:16px;">${settings.return_policy}</p>` : ''}${socialLinks}${settings?.disclaimer ? `<p style="margin-top:16px;font-size:10px;color:#bbb;line-height:1.5;">${settings.disclaimer}</p>` : ''}</td></tr>${brandingFooter}</table></td></tr></table></body></html>`
  }
  if (style === 'classic') {
    const itemRows = lineItemsData.map(item => `<tr style="background:white;"><td style="padding:10px 12px;border:1px solid #ddd;font-size:13px;color:#333;">${item.title}${item.variant_title ? `<br><span style="color:#999;font-size:11px;">${item.variant_title}</span>` : ''}</td><td style="padding:10px 12px;border:1px solid #ddd;font-size:13px;color:#333;text-align:center;">×${item.quantity}</td><td style="padding:10px 12px;border:1px solid #ddd;font-size:13px;color:#333;text-align:right;">$${item.price}</td></tr>`).join('')
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;"><table width="580" cellpadding="0" cellspacing="0" style="background:white;border:1px solid #ddd;"><tr><td style="background:${brandColor};padding:20px 24px;"><table width="100%"><tr><td><p style="margin:0;font-size:18px;font-weight:bold;color:white;">${storeName}</p></td><td style="text-align:right;"><p style="margin:0;font-size:12px;color:rgba(255,255,255,0.8);">ORDER RECEIPT</p></td></tr></table></td></tr><tr><td style="padding:20px 24px;background:#f9f9f9;border-bottom:1px solid #ddd;"><table width="100%"><tr><td><p style="margin:0;font-size:12px;color:#666;">Order No.</p><p style="margin:4px 0 0;font-size:14px;font-weight:bold;color:#333;">#${order.order_number}</p></td><td><p style="margin:0;font-size:12px;color:#666;">Date</p><p style="margin:4px 0 0;font-size:14px;color:#333;">${orderDate}</p></td><td><p style="margin:0;font-size:12px;color:#666;">Bill To</p><p style="margin:4px 0 0;font-size:14px;color:#333;">${customerName}</p></td></tr></table></td></tr><tr><td style="padding:20px 24px;"><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr style="background:#f0f0f0;"><th style="padding:8px 12px;border:1px solid #ddd;font-size:11px;text-transform:uppercase;color:#666;text-align:left;">Item</th><th style="padding:8px 12px;border:1px solid #ddd;font-size:11px;text-transform:uppercase;color:#666;text-align:center;">Qty</th><th style="padding:8px 12px;border:1px solid #ddd;font-size:11px;text-transform:uppercase;color:#666;text-align:right;">Price</th></tr>${itemRows}${settings?.show_delivery_charges && (order.shipping_lines?.length ?? 0) > 0 ? `<tr><td colspan="2" style="padding:8px 12px;border:1px solid #ddd;font-size:13px;color:#666;">Shipping</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;text-align:right;color:#333;">$${order.shipping_lines![0]?.price || '0.00'}</td></tr>` : ''}${settings?.show_tax_breakdown ? `<tr><td colspan="2" style="padding:8px 12px;border:1px solid #ddd;font-size:13px;color:#666;">Tax</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:13px;text-align:right;color:#333;">$${order.total_tax || '0.00'}</td></tr>` : ''}<tr style="background:#f0f0f0;"><td colspan="2" style="padding:10px 12px;border:1px solid #ddd;font-size:14px;font-weight:bold;color:#333;">TOTAL</td><td style="padding:10px 12px;border:1px solid #ddd;font-size:14px;font-weight:bold;color:${brandColor};text-align:right;">$${order.total_price}</td></tr></table>${settings?.thank_you_message ? `<p style="margin:20px 0 0;font-size:13px;color:#555;line-height:1.7;padding:12px;background:#f9f9f9;border-left:3px solid ${brandColor};">${settings.thank_you_message}</p>` : ''}${settings?.return_policy ? `<p style="margin:12px 0 0;font-size:11px;color:#888;line-height:1.5;">${settings.return_policy}</p>` : ''}${socialLinks}${settings?.disclaimer ? `<p style="margin-top:12px;font-size:10px;color:#bbb;line-height:1.5;">${settings.disclaimer}</p>` : ''}</td></tr>${brandingFooter}</table></td></tr></table></body></html>`
  }
  const goldColor = '#c9a84c'
  const itemRows = lineItemsData.map(item => `<tr><td style="padding:12px 0;border-bottom:1px solid #e8e0d0;font-size:14px;color:#2c2c2c;font-family:Georgia,serif;">${item.title}${item.variant_title ? `<br><span style="color:#999;font-size:11px;font-style:italic;">${item.variant_title}</span>` : ''} ×${item.quantity}</td><td style="padding:12px 0;border-bottom:1px solid #e8e0d0;font-size:14px;color:#2c2c2c;text-align:right;font-family:Georgia,serif;">$${item.price}</td></tr>`).join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#1a1a1a;font-family:Georgia,serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;"><table width="560" cellpadding="0" cellspacing="0" style="background:#fdfaf5;border-radius:4px;overflow:hidden;"><tr><td style="background:#111;padding:40px 40px 32px;text-align:center;border-bottom:3px solid ${goldColor};"><p style="margin:0 0 12px;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:${goldColor};">${storeName}</p><h1 style="margin:0 0 8px;font-size:20px;font-weight:normal;color:white;letter-spacing:2px;text-transform:uppercase;">Order Confirmed</h1><p style="margin:0;font-size:12px;color:#aaa;letter-spacing:1px;">No. ${order.order_number} &nbsp;·&nbsp; ${orderDate}</p></td></tr><tr><td style="padding:36px 40px;"><p style="margin:0 0 24px;font-size:15px;color:#444;font-style:italic;">Dear ${customerName},</p><p style="margin:0 0 20px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999;">Your Items</p><table width="100%" cellpadding="0" cellspacing="0">${itemRows}</table><table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">${shippingRow}${taxRow}</table><table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:#111;border-radius:2px;"><tr><td style="padding:18px 20px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${goldColor};">Total</td><td style="padding:18px 20px;font-size:20px;font-weight:bold;color:${goldColor};text-align:right;">$${order.total_price}</td></tr></table>${settings?.thank_you_message ? `<p style="margin:28px 0 0;font-size:13px;color:#555;line-height:1.9;text-align:center;font-style:italic;">"${settings.thank_you_message}"</p>` : ''}${settings?.return_policy ? `<p style="margin:20px 0 0;font-size:11px;color:#888;line-height:1.7;padding-top:16px;border-top:1px solid #e8e0d0;">${settings.return_policy}</p>` : ''}${socialLinks}${settings?.disclaimer ? `<p style="margin-top:16px;font-size:10px;color:#bbb;line-height:1.5;">${settings.disclaimer}</p>` : ''}</td></tr><tr><td style="background:#111;padding:16px 40px;text-align:center;border-top:1px solid #333;"><p style="margin:0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#555;">Thank you for your order</p></td></tr>${brandingFooter}</table></td></tr></table></body></html>`
}
