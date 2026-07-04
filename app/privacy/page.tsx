export const metadata = {
  title: 'Privacy Policy – Recivo',
}

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui, sans-serif', color: '#1a1a1a', lineHeight: 1.7 }}>
      <h1 style={{ color: '#1a2f5e', marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: '#666', marginBottom: 40 }}>Last updated: July 4, 2026</p>

      <p>Recivo ("we", "our", or "us") operates as a Shopify app that sends branded email receipts to your customers on your behalf. This Privacy Policy explains what data we collect, how we use it, and your rights.</p>

      <h2 style={{ color: '#1a2f5e', marginTop: 40 }}>1. Information We Collect</h2>
      <p>When a merchant installs Recivo, we access the following data from Shopify:</p>
      <ul>
        <li><strong>Order data</strong> — order number, items purchased, totals, shipping address, and order date — used to generate receipts.</li>
        <li><strong>Customer data</strong> — customer name and email address — used solely to send the receipt email to the correct recipient.</li>
        <li><strong>Shop data</strong> — store name, currency, and branding settings — used to personalise receipt design.</li>
      </ul>

      <h2 style={{ color: '#1a2f5e', marginTop: 40 }}>2. How We Use Your Data</h2>
      <p>We use the data listed above exclusively to:</p>
      <ul>
        <li>Generate and send email receipts to customers after each order.</li>
        <li>Display receipt previews and analytics inside the Recivo dashboard.</li>
        <li>Improve app reliability and performance.</li>
      </ul>
      <p>We do <strong>not</strong> sell, rent, or share your data with third parties for marketing purposes.</p>

      <h2 style={{ color: '#1a2f5e', marginTop: 40 }}>3. Data Storage</h2>
      <p>Order and customer data is stored securely in our database (Supabase, hosted on AWS) solely for the purpose of sending receipts. We retain order records for up to 90 days to allow receipt resends and analytics. You may request deletion at any time.</p>

      <h2 style={{ color: '#1a2f5e', marginTop: 40 }}>4. Third-Party Services</h2>
      <p>Recivo uses the following sub-processors to deliver its service:</p>
      <ul>
        <li><strong>Resend</strong> — email delivery service.</li>
        <li><strong>Supabase</strong> — database and authentication.</li>
        <li><strong>Vercel</strong> — app hosting.</li>
      </ul>
      <p>Each of these services has its own privacy policy and handles data in accordance with GDPR and applicable regulations.</p>

      <h2 style={{ color: '#1a2f5e', marginTop: 40 }}>5. Customer Data Rights (GDPR)</h2>
      <p>If you are a customer of a Shopify store that uses Recivo, you may contact that store directly to request access to, correction of, or deletion of your personal data. Upon receiving a verified deletion request from a merchant, we will permanently delete the associated customer records from our systems within 30 days.</p>

      <h2 style={{ color: '#1a2f5e', marginTop: 40 }}>6. Merchant Data Rights</h2>
      <p>Merchants can request deletion of all their store data by uninstalling the Recivo app or emailing us at <a href="mailto:support@tryrecivo.com" style={{ color: '#00bfa5' }}>support@tryrecivo.com</a>. We will delete all associated data within 30 days.</p>

      <h2 style={{ color: '#1a2f5e', marginTop: 40 }}>7. Security</h2>
      <p>We use industry-standard encryption (TLS in transit, AES-256 at rest) and access controls to protect your data. Shopify API secrets and credentials are never exposed publicly.</p>

      <h2 style={{ color: '#1a2f5e', marginTop: 40 }}>8. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will notify merchants of material changes via email or a notice in the Recivo dashboard.</p>

      <h2 style={{ color: '#1a2f5e', marginTop: 40 }}>9. Contact</h2>
      <p>For any privacy-related questions or requests, contact us at:</p>
      <p>
        <strong>Recivo</strong><br />
        Email: <a href="mailto:support@tryrecivo.com" style={{ color: '#00bfa5' }}>support@tryrecivo.com</a><br />
        Website: <a href="https://tryrecivo.com" style={{ color: '#00bfa5' }}>https://tryrecivo.com</a>
      </p>
    </div>
  )
}
