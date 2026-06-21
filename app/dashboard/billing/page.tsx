'use client'
export const dynamic = 'force-dynamic'
import Link from 'next/link'

const plans = [
  { name: 'Free', price: 0, emails: '500', features: ['1 store', 'Logo & brand colors', 'Full order breakdown'], locked: ['Custom thank-you message', 'Return policy', 'Remove Recivo branding'] },
  { name: 'Starter', price: 19, emails: '5,000', popular: true, features: ['1 store', 'Logo & brand colors', 'Custom thank-you message', 'Return policy & disclaimer', 'Remove Recivo branding'], locked: [] },
  { name: 'Growth', price: 49, emails: '20,000', features: ['3 stores', 'Full template editor', 'Custom sending domain', 'Analytics', 'Social links', 'Priority support'], locked: [] },
  { name: 'Pro', price: 99, emails: 'Unlimited', features: ['Unlimited stores', 'Everything in Growth', 'White-label', 'API access', 'Dedicated support'], locked: [] },
]

export default function Billing() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</Link>
        <span className="text-gray-300">/</span>
        <span className="font-semibold text-sm" style={{color:'#1a2f5e'}}>Billing</span>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3" style={{color:'#1a2f5e'}}>Choose your plan</h1>
          <p className="text-gray-500">Upgrade anytime. Cancel anytime. No hidden fees.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {plans.map(plan => (
            <div key={plan.name} className={`bg-white rounded-xl p-6 border shadow-sm relative ${plan.popular ? 'border-2' : 'border-gray-100'}`} style={plan.popular ? {borderColor:'#1a2f5e'} : {}}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white" style={{background:'#1a2f5e'}}>MOST POPULAR</div>
              )}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{plan.name}</p>
              <p className="text-3xl font-bold mb-1" style={{color:'#1a2f5e'}}>${plan.price}<span className="text-base font-normal text-gray-400">/mo</span></p>
              <p className="text-xs font-semibold mb-5" style={{color:'#00bfa5'}}>{plan.emails} emails/mo</p>
              <ul className="space-y-2 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <span style={{color:'#00bfa5'}}>✓</span> {f}
                  </li>
                ))}
                {plan.locked.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <span>✗</span> {f}
                  </li>
                ))}
              </ul>
              <button className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all" style={plan.popular ? {background:'#1a2f5e', color:'white'} : {background:'transparent', color:'#1a2f5e', border:'1.5px solid #1a2f5e'}}>
                {plan.price === 0 ? 'Current plan' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
