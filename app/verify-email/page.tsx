'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function VerifyEmailContent() {
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const supabase = createClient()

  const handleResend = async () => {
    if (!email) return
    setResending(true)
    await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
    setResent(true)
    setTimeout(() => setResent(false), 5000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6" style={{background:'#e0f7f4'}}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="13" rx="2" stroke="#00bfa5" strokeWidth="1.8"/>
            <polyline points="3,5 12,12 21,5" stroke="#00bfa5" strokeWidth="1.8" strokeLinejoin="round"/>
            <circle cx="19" cy="15" r="3.5" fill="#00bfa5"/>
            <polyline points="17,15 18.5,16.5 21,13.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 className="text-2xl font-bold mb-2" style={{color:'#1a2f5e'}}>Check your inbox</h1>
        <p className="text-gray-500 text-sm mb-2">
          We sent a verification link to
        </p>
        {email && (
          <p className="font-semibold text-sm mb-4" style={{color:'#1a2f5e'}}>{email}</p>
        )}
        <p className="text-gray-400 text-sm mb-8">
          Click the link in the email to verify your account and access your dashboard. Check your spam folder if you don't see it.
        </p>

        {/* Steps */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-3">
          {[
            { step: '1', text: 'Open the verification email from Recivo' },
            { step: '2', text: 'Click "Verify my email"' },
            { step: '3', text: 'You\'ll be redirected to your dashboard' },
          ].map(item => (
            <div key={item.step} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background:'#00bfa5'}}>{item.step}</span>
              <span className="text-sm text-gray-600">{item.text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleResend}
          disabled={resending || resent}
          className="w-full py-3 rounded-lg text-sm font-semibold border-2 transition-all"
          style={resent
            ? {borderColor:'#00bfa5', color:'#00bfa5', background:'#e0f7f4'}
            : {borderColor:'#1a2f5e', color:'#1a2f5e', background:'transparent'}
          }
        >
          {resending ? 'Sending...' : resent ? 'â Email sent!' : 'Resend verification email'}
        </button>

        <p className="text-center text-sm text-gray-400 mt-6">
          Wrong email?{' '}
          <Link href="/signup" className="font-semibold" style={{color:'#1a2f5e'}}>
            Sign up again
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
