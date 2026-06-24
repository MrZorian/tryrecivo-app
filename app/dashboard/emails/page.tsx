'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function EmailLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: stores } = await supabase.from('stores').select('*').eq('user_id', user.id)
      if (stores && stores.length > 0) {
        const { data: logs } = await supabase.from('email_logs').select('*').eq('store_id', stores[0].id).order('sent_at', { ascending: false }).limit(100)
        setLogs(logs || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity mr-1">
          <img src="/logo.png" alt="tryrecivo" width={120} />
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-semibold text-sm" style={{color:'#1a2f5e'}}>Email Logs</span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{color:'#1a2f5e'}}>Email logs</h1>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-sm text-gray-500">{logs.length} receipts sent</p>
          </div>
          {loading ? (
            <div className="py-16 text-center"><p className="text-gray-400">Loading...</p></div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center"><p className="text-gray-400">No receipts sent yet</p></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {logs.map(log => (
                <div key={log.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Order #{log.order_number}</p>
                    <p className="text-xs text-gray-400">{log.customer_email} · {log.customer_name}</p>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    {log.order_total && <p className="text-sm font-semibold text-gray-700">${log.order_total}</p>}
                    <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold" style={{background:'#e0f7f4', color:'#0f6e56'}}>{log.status}</span>
                    <p className="text-xs text-gray-400">{new Date(log.sent_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
