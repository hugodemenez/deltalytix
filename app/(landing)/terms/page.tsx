import React from 'react';

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      
      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">1. Company Information</h2>
        <p>Deltalytix is owned and operated by Hugo DEMENEZ, operating as a sole proprietorship.</p>
        <p>Contact: <a href="mailto:contact@deltalytix.app">contact@deltalytix.app</a></p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">2. Services</h2>
        <p>Deltalytix provides access to a platform dashboard offering advanced analytics services for modern traders. We host trades data through Supabase, a SOC 2 compliant service.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">3. User Accounts and Data</h2>
        <p>Users can create an account through Discord OAuth or email. We collect and store information including Discord profile picture URL, email address, and name in our Supabase database. We use a cookie to persist user connections.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">4. Subscription and Payments</h2>
        <p>We offer paid plans on a monthly or yearly basis. Payment is processed through Stripe. We offer a 7-day free trial. Refunds are generally not provided after the trial period, but may be considered on a case-by-case basis. Any refunds may be subject to processing fees charged by our payment service provider.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">5. Intellectual Property</h2>
        <p>Deltalytix owns all intellectual property rights related to our service. Users are not permitted to copy or reproduce our service. Our code is licensed under the terms specified in our LICENSE file, which is the GNU Affero General Public License version 3.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">6. Data Protection and Privacy</h2>
        <p>We comply with the General Data Protection Regulation (GDPR) and other applicable data protection laws. We protect user data by using Supabase, which is SOC 2 compliant, and by anonymizing data in our database. We do not use third-party analytics services. For more information, please see our Privacy Policy.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">7. Limitation of Liability</h2>
        <p>To the fullest extent permitted by applicable law, Deltalytix shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from (a) your use or inability to use the service; (b) any unauthorized access to or use of our servers and/or any personal information stored therein.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">8. Termination</h2>
        <p>We reserve the right to suspend or terminate your access to the service at any time for any reason, including but not limited to a violation of these Terms. You may terminate your account at any time by contacting us.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">9. Governing Law</h2>
        <p>These Terms of Service are governed by the laws of France. Any disputes shall be subject to the exclusive jurisdiction of the courts of France.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">10. Changes to Terms</h2>
        <p>We reserve the right to modify these Terms of Service at any time. We will notify users of any significant changes.</p>
      </section>

      <p className="mt-8 text-sm">Last updated: {new Date().toISOString().split('T')[0]}</p>
    </div>
  );
}