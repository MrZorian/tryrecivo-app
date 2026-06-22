'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const STYLES = [
  {
    id: 'bold',
    name: 'Bold',
    desc: 'Vibrant header with your brand color',
    preview: (color: string) => (
      <div style={{background:'#f0f4f8',borderRadius:8,padding:10,fontSize:10,fontFamily:'sans-serif'}}>
        <div style={{background:color,borderRadius:6,padding:'8px 10px',color:'white',marginBottom:6}}>
          <div style={{fontWeight:800,fontSize:12}}>Order confirmed! ð</div>
          <div style={{opacity:0.7,fontSize:9}}>Order #1001 Â· Jun 22, 2026</div>
        </div>
        <div style={{background:'white',borderRadius:6,padding:'8px 10px'}}>
          <div style={{borderBottom:'1px solid #f1f5f9',paddingBottom:4,marginBottom:4,display:'flex',justifyContent:'space-between'}}>
            <span style={{color:'#334155'}}>Item Ã1</span><span style={{color:'#334155'}}>$49.99</span>
          </div>
          <div style={{background:'#e0f7f4',borderRadius:4,padding:'4px 8px',display:'flex',justifyContent:'space-between',marginTop:4}}>
            <span style={{fontWeight:800,color:'#085041',fontSize:11}}>Total</span><span style={{fontWeight:800,color:'#085041',fontSize:11}}>$49.99</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'minimal',
    name: 'Minimal',
    desc: 'Clean serif typography, no backgrounds',
    preview: () => (
      <div style={{background:'white',borderRadius:8,padding:12,fontFamily:'Georgia,serif',fontSize:10}}>
        <div style={{borderBottom:'2px solid #111',paddingBottom:8,marginBottom:8}}>
          <div style={{fontSize:9,letterSpacing:2,textTransform:'uppercase',color:'#888'}}>Store Name</div>
          <div style={{fontSize:14,color:'#111',marginTop:2}}>Order Receipt</div>
        </div>
        <div style={{color:'#999',fontSize:9,letterSpacing:1,marginBottom:4}}>ORDER #1001 Â· Jun 22, 2026</div>
        <div style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #f5f5f5',paddingBottom:4,marginBottom:4}}>
          <span style={{color:'#333'}}>Item Ã1</span><span style={{color:'#333'}}>$49.99</span>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid #111',paddingTop:4}}>
          <span style={{fontWeight:'bold',color:'#111'}}>Total</span><span style={{fontWeight:'bold',color:'#111'}}>$49.99</span>
        </div>
      </div>
    )
  },
  {
    id: 'classic',
    name: 'Classic',
    desc: 'Traditional bordered table layout',
    preview: (color: string) => (
      <div style={{background:'#f5f5f5',borderRadius:8,padding:10,fontFamily:'Arial,sans-serif',fontSize:10}}>
        <div style={{background:color,padding:'6px 10px',borderRadius:'4px 4px 0 0',display:'flex',justifyContent:'space-between'}}>
          <span style={{color:'white',fontWeight:'bold',fontSize:11}}>Store Name</span>
          <span style={{color:'rgba(255,255,255,0.7)',fontSize:9}}>ORDER RECEIPT</span>
        </div>
        <div style={{background:'white',border:'1px solid #ddd',borderTop:'none'}}>
          <div style={{background:'#f0f0f0',display:'flex',borderBottom:'1px solid #ddd'}}>
            <span style={{flex:1,padding:'4px 8px',color:'#666',fontSize:9,textTransform:'uppercase'}}>Item</span>
            <span style={{width:30,padding:'4px 4px',color:'#666',fontSize:9,textAlign:'center'}}>Qty</span>
            <span style={{width:40,padding:'4px 8px',color:'#666',fontSize:9,textAlign:'right'}}>Price</span>
          </div>
          <div style={{display:'flex',borderBottom:'1px solid #ddd'}}>
            <span style={{flex:1,padding:'5px 8px',color:'#333'}}>Item</span>
            <span style={{width:30,padding:'5px 4px',color:'#333',textAlign:'center'}}>Ã1</span>
            <span style={{width:40,padding:'5px 8px',color:'#333',textAlign:'right'}}>$49.99</span>
          </div>
          <div style={{display:'flex',background:'#f0f0f0'}}>
            <span style={{flex:1,padding:'5px 8px',fontWeight:'bold',color:'#333'}}>TOTAL</span>
            <span style={{width:40,padding:'5px 8px',fontWeight:'bold',color:color,textAlign:'right'}}>$49.99</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'luxury',
    name: 'Luxury',
    desc: 'Dark elegant design with gold accents',
    preview: () => (
      <div style={{background:'#1a1a1a',borderRadius:8,padding:10,fontFamily:'Georgia,serif',fontSize:10}}>
        <div style={{borderBottom:'2px solid #c9a84c',paddingBottom:8,marginBottom:10,textAlign:'center'}}>
          <div style={{fontSize:9,letterSpacing:3,textTransform:'uppercase',color:'#c9a84c',marginBottom:3}}>Store Name</div>
          <div style={{fontSize:12,color:'white',letterSpacing:2,textTransform:'uppercase'}}>Order Confirmed</div>
          <div style={{fontSize:9,color:'#777',marginTop:2}}>No. 1001 Â· Jun 22, 2026</div>
        </div>
        <div>
          <div style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #333',paddingBottom:5,marginBottom:5}}>
            <span style={{color:'#ccc'}}>Item Ã1</span><span style={{color:'#ccc'}}>$49.99</span>
          </div>
          <div style={{background:'#111',borderRadius:3,padding:'6px 8px',display:'flex',justifyContent:'space-between'}}>
            <span style={{color:'#c9a84c',fontSize:9,letterSpacing:2,textTransform:'uppercase'}}>Total</span>
            <span style={{color:'#c9a84c',fontWeight:'bold',fontSize:12}}>$49.99</span>
          </div>
        </div>
      </div>
    )
  },
]

export default function ReceiptSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [store, setStore] = useState<any>(null)
  const [settings, setSettings] = useState({
    receipt_style: 'bold',
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
        if (existing) setSettings(s => ({ ...s, ...existing }))
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
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">â Dashboard</Link>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-sm" style={{color:'#1a2f5e'}}>Receipt Settings</span>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg text-white text-sm font-semibold" style={{background: saving ? '#94a3b8' : '#00bfa5'}}>
          {saving ? 'Saving...' : saved ? 'â Saved!' : 'Save changes'}
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <h1 className="text-2xl font-bold" style={{color:'#1a2f5e'}}>Customize your receipt</h1>

        {!store && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            â ï¸ Connect a Shopify store first.{' '}
            <Link href="/dashboard/connect" className="font-semibold underline">Connect now â</Link>
          </div>
        )}

        {/* Receipt Style Picker */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h2 className="font-bold mb-1" style={{color:'#1a2f5e'}}>Receipt style</h2>
          <p className="text-sm text-gray-400 mb-5">Choose how your receipt emails look to customers.</p>
          <div className="grid grid-cols-2 gap-4">
            {STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => setSettings({...settings, receipt_style: s.id})}
                className={`rounded-xl border-2 p-3 text-left transition-all ${settings.receipt_style === s.id ? 'border-[#00bfa5] shadow-md' : 'border-gray-100 hover:border-gray-200'}`}
              >
                <div className="mb-3 pointer-events-none">
                  {s.preview(settings.brand_color)}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${settings.receipt_style === s.id ? 'border-[#00bfa5] bg-[#00bfa5]' : 'border-gray-300'}`}/>
                  <div>
                    <p className="font-semibold text-sm" style={{color:'#1a2f5e'}}>{s.name}</p>
                    <p className="text-xs text-gray-400">{s.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Brand Color */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h2 className="font-bold mb-4" style={{color:'#1a2f5e'}}>Branding</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Brand color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={settings.brand_color} onChange={e => setSettings({...settings, brand_color: e.target.value})} className="w-12 h-10 rounded cursor-pointer border border-gray-200"/>
              <input type="text" value={settings.brand_color} onChange={e => setSettings({...settings, brand_color: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-32 text-gray-900"/>
            </div>
          </div>
        </div>

        {/* Messages */}
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

        {/* Social Links */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold" style={{color:'#1a2f5e'}}>Social links</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={settings.show_social_links} onChange={e => setSettings({...settings, show_social_links: e.target.checked})} className="w-4 h-4"/>
              <span className="text-sm text-gray-600">Show in receipt</span>
            </label>
          </div>
          <div className="space-y-3">
            {['instagram', 'tiktok', 'facebook'].map(platform => (
              <div key={platform}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{platform} URL</label>
                <input type="url" value={(settings as any)[`${platform}_url`]} onChange={e => setSettings({...settings, [`${platform}_url`]: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none" placeholder={`https://${platform}.com/yourstore`}/>
              </div>
            ))}
          </div>
        </div>

        {/* Display Options */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h2 className="font-bold mb-4" style={{color:'#1a2f5e'}}>Display options</h2>
          <div className="space-y-3">
            {[
              { key: 'show_delivery_charges', label: 'Show delivery charges' },
              { key: 'show_tax_breakdown', label: 'Show tax breakdown' },
            ].map(item => (
              <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={(settings as any)[item.key]} onChange={e => setSettings({...settings, [item.key]: e.target.checked})} className="w-4 h-4"/>
                <span className="text-sm text-gray-700">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="w-full py-3 rounded-lg text-white font-semibold" style={{background: saving ? '#94a3b8' : '#00bfa5'}}>
          {saving ? 'Saving...' : saved ? 'â Changes saved!' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
