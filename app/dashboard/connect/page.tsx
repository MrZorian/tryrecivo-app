'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import Link from 'next/link'

export default function ConnectStore() {
  const [shopDomain, setShopDomain] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConnect = () => {
    if (!shopDomain) return
    setLoading(true)
    const cleanDomain = shopDomain.replace('https://', '').replace('http://', '').replace('.myshopify.com', '')
    window.location.href = `/api/shopify/install?shop=${cleanDomain}.myshopify.com`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</Link>
        <span className="text-gray-300">/</span>
        <span className="font-semibold text-sm" style={{color:'#1a2f5e'}}>Connect Store</span>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{background:'#e0f7f4'}}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00bfa5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-3" style={{color:'#1a2f5e'}}>Connect your Shopify store</h1>
        <p className="text-gray-500 mb-8">Enter your Shopify store domain to get started. We&apos;ll ask for permission to access your orders.</p>

        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm text-left">
          <label className="block text-sm font-medium text-gray-700 mb-2">Your Shopify store domain</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={shopDomain}
              onChange={e => setShopDomain(e.target.value)}
              placeholder="yourstore"
              className="flex-1 px-4 py-3 rounded-lg border border-gray-200 text-gray-900 focus:outline-none text-sm"
            />
            <span className="flex items-center text-gray-400 text-sm">.myshopify.com</span>
          </div>
          <button
            onClick={handleConnect}
            disabled={loading || !shopDomain}
            className="w-full mt-4 py-3 rounded-lg text-white font-semibold text-sm"
            style={{background: loading || !shopDomain ? '#94a3b8' : '#1a2f5e'}}
          >
            {loading ? 'Connecting...' : 'Connect store'}
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-left">
          <p className="text-xs text-blue-700 font-semibold mb-1">What we access:</p>
          <ul className="text-xs text-blue-600 space-y-1">
            <li>✓ Read orders (to send receipts)</li>
            <li>✓ Read customer emails (to deliver receipts)</li>
            <li>✗ We never modify your store or products</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
