'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function StoresPage() {
  const [user, setUser] = useState<any>(null)
  const [stores, setStores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setStores(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const handleReconnect = (shopDomain: string) => {
    window.location.href = `/api/shopify/install?shop=${shopDomain}`
  }

  const handleDelete = async (storeId: string) => {
    setDeleting(storeId)
    const res = await fetch(`/api/shopify/stores/${storeId}`, { method: 'DELETE' })
    if (res.ok) {
      setStores(prev => prev.filter(s => s.id !== storeId))
    }
    setDeleting(null)
    setConfirmDelete(null)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{borderColor:'#00bfa5',borderTopColor:'transparent'}}></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="tryrecivo" width={120} />
        </Link>
        <span className="text-sm text-gray-400">{user?.email}</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{color:'#1a2f5e'}}>Connected Stores</h1>
            <p className="text-gray-500 text-sm mt-1">{stores.length} Shopify store{stores.length !== 1 ? 's' : ''} linked to your account</p>
          </div>
          <Link
            href="/dashboard/connect"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
            style={{background:'#1a2f5e'}}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add store
          </Link>
        </div>

        {/* Store list */}
        {stores.length === 0 ? (
          <div className="bg-white rounded-xl p-12 border-2 border-dashed border-gray-200 text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{background:'#e0f7f4'}}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#00bfa5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2" style={{color:'#1a2f5e'}}>No stores connected</h3>
            <p className="text-gray-500 text-sm mb-6">Connect your first Shopify store to start sending branded receipts</p>
            <Link href="/dashboard/connect" className="inline-block px-6 py-3 rounded-lg text-white font-semibold text-sm" style={{background:'#1a2f5e'}}>
              Connect Shopify store
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {stores.map(store => (
              <div key={store.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 flex items-start justify-between gap-4">
                  {/* Store info */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center" style={{background:'#e0f7f4'}}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00bfa5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                        <line x1="3" y1="6" x2="21" y2="6"/>
                        <path d="M16 10a4 4 0 01-8 0"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{store.shop_name || store.shop_domain}</p>
                      <p className="text-sm text-gray-400 truncate">{store.shop_domain}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{color:'#0f6e56'}}>
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{background:'#00bfa5'}}></span>
                          {store.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-gray-400">
                          Connected {new Date(store.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleReconnect(store.shop_domain)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Reconnect
                    </button>
                    {confirmDelete === store.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Remove?</span>
                        <button
                          onClick={() => handleDelete(store.id)}
                          disabled={deleting === store.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                          style={{background: deleting === store.id ? '#94a3b8' : '#ef4444'}}
                        >
                          {deleting === store.id ? '...' : 'Yes, remove'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-50 border border-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(store.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 border border-red-100 hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Token expiry warning if applicable */}
                {store.token_expires_at && new Date(store.token_expires_at) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) && (
                  <div className="px-5 py-3 border-t border-amber-50" style={{background:'#fffbeb'}}>
                    <p className="text-xs text-amber-700">
                      ⚠️ Connection expires soon — click <strong>Reconnect</strong> to refresh it.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">← Back to dashboard</Link>
        </div>
      </div>
    </div>
  )
}
