'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ReceiptSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [store, setStore] = useState<any>(null)
  const [settings, setSettings] = useState({
    brand_color: '#1a2f5e',
    thank_you_message: 'Thank you for your order! We appreciate your business.',
    return_policy: 'Returns accepted within 30 days of purchase.',
    disclaimer: '',
    instagram_url: '',
    tiktok_url: '',
    facebook_url: '',
    show_delivery_charges: true,
    show_tax_breakdown: true,
    show_social_links: true,
  })
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: stores } = await supabase.from('stores').select('*').eq('user_id', user.id).limit(1)
      if (stores && stores.length > 0) {
        setStore(stores[0])
        const { data: existing } = await supabase.from('receipt_settings').select('*').eq('store_id', stores[0].id).single()
        if (existing) setSettings({ ...settings, ...existing })
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!store) return
    setSaving(true)
    await supabase.from('receipt_settings').upsert({ ...settings, store_id: store.id })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</Link>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-sm" style={{color:'#1a2f5e'}}>Receipt Settings</span>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg text-white text-sm font-semibold" style={{background: saving ? '#94a3b8' : '#00bfa5'}}>
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save changes'}
        </button>
      </nav>
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <h1 className="text-2xl font-bold" style={{color:'#1a2f5e'}}>Customize your receipt</h1>
        {!store && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            ⚠️ Connect a Shopify store first before customizing receipts.{' '}
            <Link href="/dashboard/connect" className="font-semibold underline">Connect now →</Link>
          </div>
        )}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h2 className="font-bold mb-4" style={{color:'1a2f5e'}}>Branding</h2>
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Brand color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={settings.brand_color} onChange={e => setSettings({...settings, brand_color: e.target.value})} className="w4-12 h-10 rounded cursor-pointer border border-gray-200"/>
                <input type="text" value={settings.brand_color} onChange={e => setSettings({...settings, brand_color: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-32 text-gray-900"/>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h2 className="font-bold mb-4" style={{color:'#1a2f5e'}}>Messages</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thank you message</label>
              <textarea value={settings.thank_you_message} onChange={e => setSettings({...settings, thank_you_message: e.target.value})} rows={3} className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2" placeholder="Thank your customers..."/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Return policy</label>
              <textarea value={settings.return_policy} onChange={e => setSettings({...settings, return_policy: e.target.value})} rows={2} className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2" placeholder="Your return policy..."/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Disclaimer <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea value={settings.disclaimer} onChange={e => setSettings({...settings, disclaimer: e.target.value})} rows={2} className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2" placeholder="Any legal disclaimer..."/>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold" style={{color:#1a2f5e'}}>Social links</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={settings.show_social_links} onChange={e => setSettings({...settings, show_social_links: e.target.checked})} className="w-4 h-4"/>
              <span className="text-sm text-gray-600">Show in receipt</span>
            </label>
          </div>
          <div className="space-y-3">
            {['instagram', 'tiktok', 'facebook'].map(platform => (
              <div key={platform}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{platform} URL/label>
                <input type="url" value={(settings as any)[`${platform}_url`]} onChange={e => setSettings({...settings, [`${platform}_url`]: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none" placeholder={`https://${platform}.com/yourstore`}/>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h2 className="font-bold mb-4" style={{color:'#1a2f5e'}}>Display options</h2>
          <div className="space-y-3">
            {[
              { key: 'show_delivery_charges', label: 'Show delivery charges' },
              { key: 'show_tax_breakdown', label: 'Show tax breakdown' },
            ].map(item => (
              <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={(settings as any)[item.key]} onChange={e => setSettings({...settings, [item.key]: e.target.checked})} className="w4-4 h-4"/>
                <span className="text-sm text-gray-700">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="w5full py-3 rounded-lg text-white font-semibold" style={{background: saving ? '#94a3b8' : '#00bfa5'}}>
          {saving ? 'Saving...' : saved ? '✓ Changes saved!' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
