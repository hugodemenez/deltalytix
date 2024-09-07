import Link from "next/link"

export default function TermsOfUse() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Terms of Use</h1>
      <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>
      
      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
        <p>By accessing or using Deltalytix&apos;s website and services, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our services.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">2. Description of Service</h2>
        <p>Deltalytix provides an all-in-one tool for traders to store, explore and understand their track-record. Our services include data storage, analysis tools, and reporting features related to trading activities.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">3. User Accounts</h2>
        <p>To access certain features of our service, you may be required to create an account. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">4. User Responsibilities</h2>
        <p>You agree to use our services only for lawful purposes and in accordance with these Terms of Use. You are responsible for all content and activity that occurs under your account.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">5. Intellectual Property</h2>
        <p>The content, features, and functionality of our services are owned by Deltalytix and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">6. Limitation of Liability</h2>
        <p>Deltalytix shall not be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the services.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">7. Modifications to Service</h2>
        <p>We reserve the right to modify or discontinue, temporarily or permanently, the service (or any part thereof) with or without notice. You agree that Deltalytix shall not be liable to you or to any third party for any modification, suspension or discontinuance of the service.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">8. Governing Law</h2>
        <p>These Terms shall be governed and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">9. Contact Us</h2>
        <p>If you have any questions about these Terms, please contact us at:</p>
        <p className="mt-2">Email: terms@deltalytix.com</p>
      </section>

      <Link href="/" className="text-blue-600 hover:underline">Return to Home</Link>
    </div>
  )
}