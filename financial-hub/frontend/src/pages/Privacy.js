import React from 'react';
import { Link } from 'react-router-dom';

const LAST_UPDATED = 'August 26, 2026';

const Section = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
    <div className="space-y-3 text-sm text-gray-700 leading-relaxed">{children}</div>
  </section>
);

const Privacy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-lg p-8 sm:p-10">
        <Link to="/" className="text-sm text-primary-600 hover:text-primary-700">&larr; Back to Race-OS</Link>

        <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-1">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {LAST_UPDATED}</p>

        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
          <strong>Note:</strong> Race OS is currently operated by an individual, not a registered
          company. This draft accurately describes what data Race OS actually collects and which third
          parties it shares data with as of {LAST_UPDATED}, but it has not been reviewed by a lawyer -
          have one review it before this is relied on for real users, particularly around
          financial-data regulations (e.g. GLBA) and any state or international privacy laws that
          apply to your users.
        </div>

        <Section title="1. Who We Are">
          <p>
            This Privacy Policy explains how Race OS ("we," "us," or "our") collects, uses, and shares
            information when you use Race OS (the "Service").
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p><strong>Account information.</strong> When you sign up, our authentication provider
            (Clerk) collects your name, email address, and password (or Google account information if
            you sign in with Google). We receive your name, email, and a Clerk-issued account
            identifier from them - we never see or store your password ourselves.</p>

          <p><strong>Bank and financial data.</strong> If you connect a bank account (via Plaid) or
            upload a bank statement (CSV), we store the resulting account and transaction data:
            institution name, account type, balances, and individual transactions (amount, date,
            description, merchant). Bank access tokens from Plaid are encrypted at rest before storage.
            We do not receive or store your online banking username or password - that's handled
            entirely by Plaid.</p>

          <p><strong>Creator platform data.</strong> If you connect YouTube, Twitch, or Patreon, we
            receive and store revenue, subscriber, and channel data from those platforms via their
            OAuth APIs, for the accounts you explicitly authorize.</p>

          <p><strong>Tax and business information you provide.</strong> Business name and type, filing
            status, state/region, and (if you choose to enter them) identifiers like an EIN, PAN, GST,
            or VAT number, and any manual tax-rate overrides you set.</p>

          <p><strong>Client and invoice data you create.</strong> Names, emails, and invoice details of
            your own clients that you enter into the Service.</p>

          <p><strong>Usage data.</strong> Standard technical data like IP address, browser type, and
            access timestamps, collected automatically for security and diagnostics.</p>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide the Service - track your income/expenses, generate invoices, and calculate tax estimates</li>
            <li>To sync data from bank accounts or creator platforms you've connected</li>
            <li>To send you account, security, and (if you opt in) reminder or summary emails</li>
            <li>To detect fraud, abuse, and security issues</li>
            <li>To improve the Service</li>
          </ul>
          <p>We do not sell your personal information to third parties.</p>
        </Section>

        <Section title="4. Who We Share Information With">
          <p>We share information with the following service providers, only as needed to operate the Service:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Clerk</strong> - authentication and account management</li>
            <li><strong>Plaid</strong> - bank account connections and transaction data</li>
            <li><strong>Google (YouTube), Twitch, and Patreon</strong> - only for the specific account you connect, and only the data those platforms' APIs expose</li>
            <li><strong>MongoDB Atlas</strong> - our database host, where your data is stored</li>
            <li><strong>Resend, SendGrid, or Gmail</strong> (whichever is active) - to deliver account, invoice, and notification emails</li>
          </ul>
          <p>
            We may also disclose information if required by law, subpoena, or legal process, or to
            protect the rights, property, or safety of Race OS, our users, or others.
          </p>
        </Section>

        <Section title="5. Data Security">
          <p>
            Bank access tokens are encrypted at rest. Passwords are never stored by us - they're
            managed entirely by Clerk. We use industry-standard practices to protect your data, but no
            system is 100% secure, and we can't guarantee absolute security.
          </p>
        </Section>

        <Section title="6. Data Retention and Deletion">
          <p>
            We retain your data for as long as your account is active, so the Service can function. If
            you want your account and data deleted, contact us at hello@raceos.me and we'll process
            your request within a reasonable time, except where we're required to retain certain
            records by law (for example, financial records subject to a legal retention requirement).
          </p>
        </Section>

        <Section title="7. Your Rights">
          <p>
            Depending on where you live, you may have rights to access, correct, export, or delete your
            personal information, and to opt out of non-essential emails (via the unsubscribe link or
            your notification settings). Contact us at hello@raceos.me to exercise these rights.
          </p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>Race-OS is not directed at children, and you must be at least 18 to use it. We do not knowingly collect information from children.</p>
        </Section>

        <Section title="9. International Users">
          <p>
            Race OS is operated from India. If you access the Service from another country, your
            information will be processed in India and in whichever countries our infrastructure and
            service providers (such as our database host and third-party integrations) operate in,
            which may have different data protection laws than your own.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. If we make material changes, we'll
            notify you before they take effect.
          </p>
        </Section>

        <Section title="11. Contact Us">
          <p>Questions about this Privacy Policy? Contact us at hello@raceos.me.</p>
        </Section>
      </div>
    </div>
  );
};

export default Privacy;
