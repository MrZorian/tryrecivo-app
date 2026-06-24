'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { buildEmailHtml, normalizeStyle, PLAN_STYLES, SOCIAL_PLATFORMS } from '@/lib/emailTemplates'

// ── Sample order data for preview ──────────────────────────────────────────────
const SAMPLE_ORDER = {
  order_number: '1042',
  created_at: new Date().toISOString(),
  total_price: '89.97',
  total_tax: '7.20',
  line_items: [
    { title: 'Classic White Tee', variant_title: 'M / White', quantity: 2, price: '29.99' },
    { title: 'Canvas Tote Bag', variant_title: '', quantity: 1, price: '29.99' },
  ],
  shipping_lines: [{ price: '5.99' }],
  customer: { first_name: 'Alex', last_name: 'Morgan' },
}

// ── Style metadata ─────────────────────────────────────────────────────────────
const STYLES = [
  {
    id: 'basic',
    name: 'Basic',
    desc: 'Bold header with brand color',
    minPlan: 'free',
    preview: (color: string) => (
      <div style={{ background: '#f0f4f8', borderRadius: 8, padding: 10, fontSize: 10, fontFamily: 'sans-serif' }}>
        <div style={{ background: color, borderRadius: 6, padding: '8px 10px', color: 'white', marginBottom: 6 }}>
          <div style={{ fontWeight: 800, fontSize: 12 }}>Order confirmed! 🎉</div>
          <div style={{ opacity: 0.7, fontSize: 9 }}>Order #1042 · Today</div>
        </div>
        <div style={{ background: 'white', borderRadius: 6, padding: '8px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 4, marginBottom: 4 }}>
            <span style={{ color: '#334155' }}>White Tee ×2</span><span style={{ color: '#334155' }}>$59.98</span>
          </div>
          <div style={{ background: '#e0f7f4', borderRadius: 4, padding: '4px 8px', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontWeight: 800, color: '#085041', fontSize: 11 }}>Total</span>
            <span style={{ fontWeight: 800, color: '#085041', fontSize: 11 }}>$89.97</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'modern',
    name: 'Modern',
    desc: 'Clean serif typography',
    minPlan: 'starter',
    preview: (_color?: string) => (
      <div style={{ background: 'white', borderRadius: 8, padding: 12, fontFamily: 'Georgia,serif', fontSize: 10 }}>
        <div style={{ borderBottom: '2px solid #111', paddingBottom: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#888' }}>Store Name</div>
          <div style={{ fontSize: 13, color: '#111', marginTop: 2 }}>Order Receipt</div>
        </div>
        <div style={{ color: '#999', fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>ORDER #1042</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f5f5f5', paddingBottom: 4, marginBottom: 4 }}>
          <span style={{ color: '#333' }}>White Tee ×2</span><span style={{ color: '#333' }}>$59.98</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #111', paddingTop: 4 }}>
          <span style={{ fontWeight: 'bold', color: '#111' }}>Total</span><span style={{ fontWeight: 'bold', color: '#111' }}>$89.97</span>
        </div>
      </div>
    ),
  },
  {
    id: 'classic',
    name: 'Classic',
    desc: 'Traditional table layout',
    minPlan: 'starter',
    preview: (color: string) => (
      <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 10, fontFamily: 'Arial,sans-serif', fontSize: 10 }}>
        <div style={{ background: color, padding: '6px 10px', borderRadius: '4px 4px 0 0', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}>Store Name</span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>RECEIPT</span>
        </div>
        <div style={{ background: 'white', border: '1px solid #ddd', borderTop: 'none' }}>
          <div style={{ background: '#f0f0f0', display: 'flex', borderBottom: '1px solid #ddd' }}>
            <span style={{ flex: 1, padding: '3px 8px', color: '#666', fontSize: 9, textTransform: 'uppercase' }}>Item</span>
            <span style={{ width: 30, padding: '3px 4px', color: '#666', fontSize: 9, textAlign: 'center' }}>Qty</span>
            <span style={{ width: 40, padding: '3px 8px', color: '#666', fontSize: 9, textAlign: 'right' }}>Price</span>
          </div>
          <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
            <span style={{ flex: 1, padding: '4px 8px', color: '#333' }}>White Tee</span>
            <span style={{ width: 30, padding: '4px 4px', color: '#333', textAlign: 'center' }}>×2</span>
            <span style={{ width: 40, padding: '4px 8px', color: '#333', textAlign: 'right' }}>$59.98</span>
          </div>
          <div style={{ display: 'flex', background: '#f0f0f0' }}>
            <span style={{ flex: 1, padding: '4px 8px', fontWeight: 'bold', color: '#333' }}>TOTAL</span>
            <span style={{ width: 40, padding: '4px 8px', fontWeight: 'bold', color: color, textAlign: 'right' }}>$89.97</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'luxury',
    name: 'Luxury',
    desc: 'Dark elegant with gold accents',
    minPlan: 'growth',
    preview: (_color?: string) => (
      <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 10, fontFamily: 'Georgia,serif', fontSize: 10 }}>
        <div style={{ borderBottom: '2px solid #c9a84c', paddingBottom: 8, marginBottom: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: '#c9a84c', marginBottom: 3 }}>Store Name</div>
          <div style={{ fontSize: 11, color: 'white', letterSpacing: 2, textTransform: 'uppercase' }}>Order Confirmed</div>
          <div style={{ fontSize: 9, color: '#777', marginTop: 2 }}>No. 1042</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: 4, marginBottom: 5 }}>
          <span style={{ color: '#ccc' }}>White Tee ×2</span><span style={{ color: '#ccc' }}>$59.98</span>
        </div>
        <div style={{ background: '#111', borderRadius: 3, padding: '5px 8px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#c9a84c', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' }}>Total</span>
          <span style={{ color: '#c9a84c', fontWeight: 'bold', fontSize: 11 }}>$89.97</span>
        </div>
      </div>
    ),
  },
]

const PLAN_ORDER = ['free', 'starter', 'growth', 'pro']
function planIndex(plan: string) { return PLAN_ORDER.indexOf(plan) }

// Plan badge colors
const PLAN_BADGE: Record<string, string> = {
  free: '#94a3b8',
  starter: '#00bfa5',
  growth: '#f59e0b',
  pro: '#8b5cf6',
}

export default function ReceiptSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [store, setStore] = useState<any>(null)
  const [userPlan, setUserPlan] = useState('free')
  const [logoUploading, setLogoUploading] = useState(false)
  const [settings, setSettings] = useState({
    receipt_style: 'basic',
    brand_color: '#1a2f5e',
    logo_url: '',
    thank_you_message: 'Thank you for your order! We appreciate your business.',
    return_policy: 'Returns accepted within 30 days of purchase.',
    disclaimer: '',
    show_delivery_charges: true,
    show_tax_breakdown: true,
    show_social_links: true,
    instagram_url: '',
    tiktok_url: '',
    facebook_url: '',
    twitter_url: '',
    pinterest_url: '',
    youtube_url: '',
    linkedin_url: '',
    custom_links: [] as Array<{label: string, url: string}>,
    recivo_link_hidden: false,
    recivo_link_url: 'https://tryrecivo.com',
    recivo_link_label: 'Powered by tryrecivo',
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
      if (profile?.plan) setUserPlan(profile.plan)

      const { data: stores } = await supabase.from('stores').select('*').eq('user_id', user.id).limit(1)
      if (stores && stores.length > 0) {
        setStore(stores[0])
        const { data: existing } = await supabase.from('receipt_settings').select('*').eq('store_id', stores[0].id).single()
        if (existing) {
          const normalizedStyle = normalizeStyle(existing.receipt_style)
          // Parse custom_links from jsonb/string
          let parsedLinks: Array<{label: string, url: string}> = []
          if (existing.custom_links) {
            if (Array.isArray(existing.custom_links)) parsedLinks = existing.custom_links
            else if (typeof existing.custom_links === 'string') {
              try { parsedLinks = JSON.parse(existing.custom_links) } catch {}
            }
          }
          setSettings(s => ({ ...s, ...existing, receipt_style: normalizedStyle, custom_links: parsedLinks }))
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!store) return
    setSaving(true)
    const payload: any = { ...settings, store_id: store.id }
    const { error } = await supabase.from('receipt_settings').upsert(payload)
    if (error) {
      // Columns may not exist yet — fall back to core fields only
      const { custom_links, recivo_link_hidden, recivo_link_url, recivo_link_label, ...coreSettings } = payload
      await supabase.from('receipt_settings').upsert(coreSettings)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !store) return
    setLogoUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLogoUploading(false); return }
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${store.id}.${ext}`
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
      setSettings(s => ({ ...s, logo_url: publicUrl }))
    }
    setLogoUploading(false)
  }

  // Live preview HTML — regenerated whenever settings change
  const previewHtml = useMemo(() => buildEmailHtml(
    SAMPLE_ORDER,
    { shop_name: store?.shop_name || 'Your Store', shop_domain: store?.shop_domain },
    settings,
    userPlan !== 'free'
  ), [settings, store, userPlan])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  const allowedStyles = PLAN_STYLES[userPlan] || PLAN_STYLES['free']

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="tryrecivo" width="120" />
          </Link>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-sm" style={{ color: '#1a2f5e' }}>Receipt Settings</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !store}
          className="px-5 py-2 rounded-lg text-white text-sm font-semibold transition-colors"
          style={{ background: saving ? '#94a3b8' : '#00bfa5' }}
        >
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save changes'}
        </button>
      </nav>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Settings ─────────────────────────────────────────────────── */}
        <div className="w-full lg:w-[460px] xl:w-[500px] overflow-y-auto flex-shrink-0 px-6 py-8 space-y-6 border-r border-gray-100">
          <h1 className="text-2xl font-bold" style={{ color: '#1a2f5e' }}>Customize receipt</h1>

          {!store && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              ⚠️ Connect a Shopify store first.{' '}
              <Link href="/dashboard/connect" className="font-semibold underline">Connect now →</Link>
            </div>
          )}

          {/* ── Style Picker ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-bold mb-1" style={{ color: '#1a2f5e' }}>Receipt style</h2>
            <p className="text-xs text-gray-400 mb-5">Choose how your receipt emails look to customers.</p>
            <div className="grid grid-cols-2 gap-3">
              {STYLES.map(s => {
                const locked = !allowedStyles.includes(s.id as any)
                const isActive = settings.receipt_style === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (locked) return
                      setSettings({ ...settings, receipt_style: s.id })
                    }}
                    className={`rounded-xl border-2 p-3 text-left transition-all relative ${isActive ? 'border-[#00bfa5] shadow-md' : locked ? 'border-gray-100 opacity-60 cursor-not-allowed' : 'border-gray-100 hover:border-gray-300'}`}
                  >
                    {/* Lock overlay */}
                    {locked && (
                      <div className="absolute inset-0 rounded-xl bg-white/70 flex flex-col items-center justify-center z-10 gap-1">
                        <span className="text-lg">🔒</span>
                        <Link
                          href="/dashboard/billing"
                          onClick={e => e.stopPropagation()}
                          className="text-xs font-semibold px-2 py-1 rounded-full text-white"
                          style={{ background: PLAN_BADGE[s.minPlan] }}
                        >
                          {s.minPlan.charAt(0).toUpperCase() + s.minPlan.slice(1)}+
                        </Link>
                      </div>
                    )}
                    <div className="mb-3 pointer-events-none">
                      {s.preview(settings.brand_color)}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${isActive ? 'border-[#00bfa5] bg-[#00bfa5]' : 'border-gray-300'}`} />
                      <div>
                        <p className="font-semibold text-xs" style={{ color: '#1a2f5e' }}>{s.name}</p>
                        <p className="text-xs text-gray-400">{s.desc}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Brand Color ───────────────────────────────────────────────────── */}─────────────────────────────── */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-bold mb-4" style={{ color: '#1a2f5e' }}>Branding</h2>
            <label className="block text-sm font-medium text-gray-700 mb-2">Brand color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.brand_color}
                onChange={e => setSettings({ ...settings, brand_color: e.target.value })}
                className="w-12 h-10 rounded cursor-pointer border border-gray-200"
              />
              <input
                type="text"
                value={settings.brand_color}
                onChange={e => setSettings({ ...settings, brand_color: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-32 text-gray-900"
              />
            </div>

            {/* Store Logo */}
            <div className={`mt-5 pt-5 border-t border-gray-100 ${userPlan === 'free' ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Store logo in receipt</label>
                {userPlan === 'free' && (
                  <Link href="/dashboard/billing" className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: '#00bfa5' }}>Starter+</Link>
                )}
              </div>
              {settings.logo_url ? (
                <div className="flex items-center gap-3 mb-3">
                  <img src={settings.logo_url} alt="Store logo" style={{ maxHeight: 48, maxWidth: 160, objectFit: 'contain', borderRadius: 6, border: '1px solid #f1f5f9', padding: 4, background: 'white' }} />
                  <button onClick={() => setSettings(s => ({ ...s, logo_url: '' }))} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mb-2">PNG, JPG, SVG — max 2 MB. Shown in receipt header.</p>
              )}
              <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors ${logoUploading || userPlan === 'free' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <span>📎</span>
                {logoUploading ? 'Uploading...' : settings.logo_url ? 'Change logo' : 'Upload logo'}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleLogoUpload} disabled={logoUploading || userPlan === 'free'} />
              </label>
              {userPlan === 'free' && (
                <p className="text-xs text-gray-400 mt-2">Upgrade to Starter to add your logo.</p>
              )}
            </div>

            {/* tryrecivo attribution link */}
            <div className="mt-5 pt-5 border-t border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700">tryrecivo.com link in receipt</label>
                  <p className="text-xs text-gray-400 mt-0.5">Small attribution link in the receipt footer</p>
                </div>
                {userPlan === 'free' ? (
                  <span className="text-xs text-gray-400 flex items-center gap-1">🔒 Locked on</span>
                ) : (
                  <div
                    className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${!settings.recivo_link_hidden ? 'bg-[#00bfa5]' : 'bg-gray-200'}`}
                    onClick={() => setSettings(s => ({ ...s, recivo_link_hidden: !s.recivo_link_hidden }))}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${!settings.recivo_link_hidden ? 'left-5' : 'left-1'}`} />
                  </div>
                )}
              </div>
              {userPlan === 'free' && (
                <p className="text-xs text-gray-400 mt-2">Upgrade to hide or customize this link.</p>
              )}
              {userPlan !== 'free' && !settings.recivo_link_hidden && (
                <div className="space-y-2 mt-3">
                  <input
                    type="text"
                    value={settings.recivo_link_label}
                    onChange={e => setSettings(s => ({ ...s, recivo_link_label: e.target.value }))}
                    placeholder="Powered by tryrecivo"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00bfa5]"
                  />
                  <input
                    type="url"
                    value={settings.recivo_link_url}
                    onChange={e => setSettings(s => ({ ...s, recivo_link_url: e.target.value }))}
                    placeholder="https://tryrecivo.com"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00bfa5]"
                  />
                </div>
              )}
            </div>
          </div>


          {/* ── Messages ──────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-bold mb-4" style={{ color: '#1a2f5e' }}>Messages</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thank you message</label>
                <textarea
                  value={settings.thank_you_message}
                  onChange={e => setSettings({ ...settings, thank_you_message: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-[#00bfa5]"
                  placeholder="Thank your customers..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Return policy</label>
                <textarea
                  value={settings.return_policy}
                  onChange={e => setSettings({ ...settings, return_policy: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-[#00bfa5]"
                  placeholder="e.g. Returns accepted within 30 days with receipt."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disclaimer <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={settings.disclaimer}
                  onChange={e => setSettings({ ...settings, disclaimer: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-[#00bfa5]"
                  placeholder="Any legal disclaimer, tax notice, etc."
                />
              </div>
            </div>
          </div>

          {/* ── Social Links ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold" style={{ color: '#1a2f5e' }}>Social links</h2>
                <p className="text-xs text-gray-400 mt-0.5">Logos + links appear in receipt footer</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${settings.show_social_links ? 'bg-[#00bfa5]' : 'bg-gray-200'}`}
                  onClick={() => setSettings({ ...settings, show_social_links: !settings.show_social_links })}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${settings.show_social_links ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-xs text-gray-500">{settings.show_social_links ? 'On' : 'Off'}</span>
              </label>
            </div>
            <div className="space-y-3">
              {SOCIAL_PLATFORMS.map(platform => (
                <div key={platform.id} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                    style={{ background: platform.color }}
                  >
                    {platform.name.slice(0, 2).toUpperCase()}
                  </div>
                  <input
                    type="url"
                    value={(settings as any)[`${platform.id}_url`] || ''}
                    onChange={e => setSettings({ ...settings, [`${platform.id}_url`]: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00bfa5]"
                    placeholder={`${platform.name} URL`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Custom Links ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold" style={{ color: '#1a2f5e' }}>Custom links</h2>
                <p className="text-xs text-gray-400 mt-0.5">Add clickable links in the receipt (e.g. Track order, Shop again)</p>
              </div>
              <button
                onClick={() => setSettings(s => ({ ...s, custom_links: [...(s.custom_links as any[] || []), { label: '', url: '' }] }))}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#00bfa5] text-[#00bfa5] hover:bg-[#e0f7f4] transition-colors flex-shrink-0"
              >
                + Add link
              </button>
            </div>
            {(settings.custom_links as any[]).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">No custom links yet.</p>
            ) : (
              <div className="space-y-2">
                {(settings.custom_links as any[]).map((link: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={link.label}
                      onChange={e => {
                        const updated = [...(settings.custom_links as any[])]
                        updated[idx] = { ...updated[idx], label: e.target.value }
                        setSettings(s => ({ ...s, custom_links: updated }))
                      }}
                      placeholder="Label (e.g. Track Order)"
                      className="w-2/5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00bfa5]"
                    />
                    <input
                      type="url"
                      value={link.url}
                      onChange={e => {
                        const updated = [...(settings.custom_links as any[])]
                        updated[idx] = { ...updated[idx], url: e.target.value }
                        setSettings(s => ({ ...s, custom_links: updated }))
                      }}
                      placeholder="https://..."
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00bfa5]"
                    />
                    <button
                      onClick={() => {
                        const updated = (settings.custom_links as any[]).filter((_: any, i: number) => i !== idx)
                        setSettings(s => ({ ...s, custom_links: updated }))
                      }}
                      className="text-red-400 hover:text-red-600 text-base px-1 flex-shrink-0"
                      title="Remove"
                    >🗑</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Display Options ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-bold mb-4" style={{ color: '#1a2f5e' }}>Display options</h2>
            <div className="space-y-3">
              {[
                { key: 'show_delivery_charges', label: 'Show delivery charges' },
                { key: 'show_tax_breakdown', label: 'Show tax breakdown' },
              ].map(item => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(settings as any)[item.key]}
                    onChange={e => setSettings({ ...settings, [item.key]: e.target.checked })}
                    className="w-4 h-4 accent-[#00bfa5]"
                  />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !store}
            className="w-full py-3 rounded-lg text-white font-semibold transition-colors"
            style={{ background: saving ? '#94a3b8' : '#00bfa5' }}
          >
            {saving ? 'Saving...' : saved ? '✓ Changes saved!' : 'Save changes'}
          </button>
        </div>

        {/* ── Right: Live Preview ─────────────────────────────────────────────── */}
        <div className="hidden lg:flex flex-1 flex-col overflow-hidden bg-gray-100">
          <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00bfa5]" />
              <span className="text-sm font-semibold text-gray-600">Live Preview</span>
              <span className="text-xs text-gray-400">— updates as you edit</span>
            </div>
            <span className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded-full">
              {STYLES.find(s => s.id === settings.receipt_style)?.name || 'Basic'} style
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              {/* Email client chrome */}
              <div className="bg-white rounded-t-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 bg-gray-100 rounded px-3 py-1 text-xs text-gray-500">
                  Order #{SAMPLE_ORDER.order_number} confirmed — {store?.shop_name || 'Your Store'}
                </div>
              </div>
              <iframe
                srcDoc={previewHtml}
                className="w-full border border-t-0 border-gray-200 rounded-b-xl"
                style={{ height: '640px', background: 'white' }}
                title="Receipt Preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
