import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
        <p>Deltalytix (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>
        <p>We collect information when you create an account, including:</p>
        <ul className="list-disc pl-5 mt-2">
          <li>Email address</li>
          <li>Name</li>
          <li>Discord profile picture URL (if you sign up using Discord OAuth)</li>
        </ul>
        <p className="mt-2">We also collect and store trades data that you provide to us for analysis purposes.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">3. How We Use Your Information</h2>
        <p>We use the collected information for various purposes, including:</p>
        <ul className="list-disc pl-5 mt-2">
          <li>Providing and maintaining our service</li>
          <li>Notifying you about changes to our service</li>
          <li>Allowing you to participate in interactive features of our service</li>
          <li>Providing customer support</li>
          <li>Gathering analysis or valuable information to improve our service</li>
          <li>Monitoring the usage of our service</li>
          <li>Detecting, preventing and addressing technical issues</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">4. Data Storage and Security</h2>
        <p>We use Supabase, a SOC 2 compliant service, to store your data. We implement appropriate data collection, storage and processing practices and security measures to protect against unauthorized access, alteration, disclosure or destruction of your personal information and data stored on our service.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">5. Cookies</h2>
        <p>We use &quot;cookies&quot; to collect information. Cookies are small data files stored on your hard drive by a website. We may use both session cookies (which expire once you close your web browser) and persistent cookies (which stay on your computer until you delete them) to provide you with a more personal and interactive experience on our Site.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">6. Third-Party Services</h2>
        <p>We do not use third-party analytics services. Our service may contain links to other sites that are not operated by us. We strongly advise you to review the Privacy Policy of every site you visit.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">7. GDPR Compliance</h2>
        <p>We comply with the General Data Protection Regulation (GDPR). You have the right to access, update or delete your personal information. Please contact us to exercise these rights.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">8. Changes to This Privacy Policy</h2>
        <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">9. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us at: <a href="mailto:privacy@deltalytix.com" className="text-primary hover:underline">privacy@deltalytix.com</a></p>
      </section>

      <p className="mt-8 text-sm">Last updated: {new Date().toISOString().split('T')[0]}</p>
    </div>
  );
}