'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [stores, setStores] = useState<any[]>([])
  const [emailLogs, setEmailLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(profile)

      const { data: stores } = await supabase.from('stores').select('*').eq('user_id', user.id)
      setStores(stores || [])

      if (stores && stores.length > 0) {
        const { data: logs } = await supabase
          .from('email_logs')
          .select('*')
          .eq('store_id', stores[0].id)
          .order('sent_at', { ascending: false })
          .limit(5)
        setEmailLogs(logs || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{borderColor:'#00bfa5', borderTopColor:'transparent'}}></div>
        <p className="text-gray-500 text-sm">Loading your dashboard...</p>
      </div>
    </div>
  )

  const emailsUsed = profile?.emails_used || 0
  const emailsLimit = profile?.emails_limit || 500
  const usagePercent = Math.min((emailsUsed / emailsLimit) * 100, 100)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'#1a2f5e'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="13" rx="2" stroke="#00bfa5" strokeWidth="2"/>
              <polyline points="3,5 12,12 21,5" stroke="#00bfa5" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-lg" style={{color:'#1a2f5e'}}>tryrecivo</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.email}</span>
          <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Sign out</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{color:'#1a2f5e'}}>Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {profile?.full_name || user?.email}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Emails sent</p>
            <p className="text-3xl font-bold" style={{color:'#1a2f5e'}}>{emailsUsed}</p>
            <p className="text-xs text-gray-400 mt-1">of {emailsLimit} this month</p>
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{width:`${usagePercent}%`, background:'#00bfa5'}}></div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Stores connected</p>
            <p className="text-3xl font-bold" style={{color:'#1a2f5e'}}>{stores.length}</p>
            <p className="text-xs text-gray-400 mt-1">Shopify stores</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Current plan</p>
            <p className="text-3xl font-bold capitalize" style={{color:'#1a2f5e'}}>{profile?.plan || 'Free'}</p>
            <Link href="/dashboard/billing" className="text-xs font-semibold mt-1 inline-block" style={{color:'#00bfa5'}}>Upgrade →</Link>
          </div>
        </div>

        {/* Connect Store CTA */}
        {stores.length === 0 && (
          <div className="bg-white rounded-xl p-8 border-2 border-dashed border-gray-200 text-center mb-8">
            <div className="w4 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{background:'#e0f7f4'}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00bfa5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2" style={{color:'#1a2f5e'}}>Connect your Shopify store</h3>
            <p className="text-gray-500 text-sm mb-5">Link your store to start sending branded receipts automatically</p>
            <Link href="/dashboard/connect" className="inline-block px-6 py-3 rounded-lg text-white font-semibold" style={{background:'#1a2f5e'}}>
              Connect Shopify store
            </Link>
          </div>
        )}

        {/* Recent Receipts */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold" style={{color:'#1a2f5e'}}>Recent receipts</h2>
            <Link href="/dashboard/emails" className="text-sm font-semibold" style={{color:'#00bfa5'}}>View all →</Link>
          </div>
          {emailLogs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-400 text-sm">No receipts sent yet. Connect a store to get started.</p>
            </div>
          ) : (
            <div className="divide-ydivide-gray-50">
              {emailLogs.map((log) => (
                <div key={log.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Order #{log.order_number}</p>
                    <p className="text-xs text-gray-400">{log.customer_email}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold" style={{background:'#e0f7f4', color:'#0f6e56'}}>
                      {log.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{new Date(log.sent_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { href: '/dashboard/receipt', label: 'Receipt Settings', icon: '✏️' },
            { href: '/dashboard/emails', label: 'Email Logs', icon: '📧' },
            { href: '/dashboard/connect', label: 'Connect Store', icon: '🔗' },
            { href: '/dashboard/billing', label: 'Billing', icon: '💳' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-center">
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="text-sm font-semibold text-gray-700">{item.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
