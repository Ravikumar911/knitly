export const dynamic = 'force-static';

import type { Metadata } from "next"
import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Slash.cash collects, uses, and protects your personal and financial information. Learn about our email access, data security, and your privacy rights.",
  keywords: ["privacy policy", "data protection", "email access", "financial data", "GDPR", "data security"],
}

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">Legal</Badge>
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-lg text-muted-foreground">
            How we collect, use, and protect your information
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: January 1, 2025
          </p>
        </div>

        <article className="prose prose-gray dark:prose-invert max-w-none px-2 py-4 md:px-8 md:py-8">
          <section id="information-collection" className="mb-10">
            <h2 className="mt-8 mb-4">1. Information We Collect</h2>
            <p>We collect information to provide and improve our AI-powered financial tracking services.</p>
            <section id="email-data" className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">1.1 Email Data</h3>
              <ul className="ml-6 list-disc">
                <li><strong>Financial Transaction Emails Only:</strong> We access and process only emails related to financial transactions (bank statements, payment confirmations, receipts, subscription notifications, <abbr title="et cetera">etc.</abbr>)</li>
                <li><strong>OAuth 2.0 Authorization:</strong> We use secure Google OAuth 2.0 to access your Gmail with explicit permission</li>
                <li><strong>Automated Filtering:</strong> Our <abbr title="Artificial Intelligence">AI</abbr> systems automatically identify and process only finance-related emails</li>
                <li><strong>No Personal Correspondence:</strong> We do <em>not</em> access, read, or store personal emails, private correspondence, or non-financial communications</li>
              </ul>
            </section>
            <section id="transaction-data" className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">1.2 Transaction Data</h3>
              <ul className="ml-6 list-disc">
                <li>Transaction amounts, dates, and merchant information</li>
                <li>Payment methods and account identifiers (last 4 digits only)</li>
                <li>Spending categories and transaction descriptions</li>
                <li>Delivery addresses and order details from service providers like Swiggy</li>
              </ul>
            </section>
            <section id="account-information" className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">1.3 Account Information</h3>
              <ul className="ml-6 list-disc">
                <li>Email address and basic profile information from Google OAuth</li>
                <li>User preferences and settings within our application</li>
                <li>Usage analytics and feature interaction data</li>
              </ul>
            </section>
          </section>

          <section id="use-of-information" className="mb-10">
            <h2 className="mt-8 mb-4">2. How We Use Your Information</h2>
            <p>We use your data solely to provide financial insights and services.</p>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">2.1 Core Services</h3>
              <ul className="ml-6 list-disc">
                <li><strong>Expense Tracking:</strong> Automatically categorize and track your spending across all connected accounts</li>
                <li><strong>AI Analytics:</strong> Generate insights, trends, and spending patterns using machine learning algorithms</li>
                <li><strong>Financial Insights:</strong> Provide personalized recommendations and financial health analysis</li>
                <li><strong>Query Processing:</strong> Enable natural language questions about your financial data</li>
              </ul>
            </section>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">2.2 Service Improvement</h3>
              <ul className="ml-6 list-disc">
                <li>Improve AI accuracy and transaction categorization</li>
                <li>Develop new features and enhance user experience</li>
                <li>Troubleshoot issues and provide customer support</li>
              </ul>
            </section>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">2.3 We Do NOT</h3>
              <ul className="ml-6 list-disc">
                <li>Sell your personal or financial data to third parties</li>
                <li>Use your data for advertising or marketing to external parties</li>
                <li>Share transaction details with merchants or financial institutions</li>
                <li>Access your actual bank accounts or make transactions on your behalf</li>
              </ul>
            </section>
          </section>

          <section id="data-storage-security" className="mb-10">
            <h2 className="mt-8 mb-4">3. Data Storage and Security</h2>
            <p>How we protect and store your sensitive financial information.</p>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">3.1 Security Measures</h3>
              <ul className="ml-6 list-disc">
                <li><strong>Encryption:</strong> All data is encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
                <li><strong>Access Controls:</strong> Strict access controls limit data access to authorized personnel only</li>
                <li><strong>Regular Audits:</strong> Security audits and vulnerability assessments conducted regularly</li>
                <li><strong>Infrastructure:</strong> Data stored on secure cloud infrastructure with enterprise-grade security</li>
              </ul>
            </section>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">3.2 Data Retention</h3>
              <ul className="ml-6 list-disc">
                <li>Transaction data retained for as long as your account is active</li>
                <li>Email content processed in real-time and not permanently stored</li>
                <li>Account deletion results in permanent data removal within 30 days</li>
                <li>Backup data purged according to our data retention schedule</li>
              </ul>
            </section>
          </section>

          <section id="third-party" className="mb-10">
            <h2 className="mt-8 mb-4">4. Third-Party Services and Trademarks</h2>
            <p>Our relationship with external services and use of company names.</p>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">4.1 Service Integration</h3>
              <ul className="ml-6 list-disc">
                <li>We process transactions from various services including Swiggy, banks, UPI platforms, and other financial service providers</li>
                <li>We are not affiliated with, endorsed by, or sponsored by these companies</li>
                <li>Company names and trademarks are used solely for identification and categorization purposes</li>
                <li>We do not have direct integration with these services' APIs unless explicitly stated</li>
              </ul>
            </section>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">4.2 AI and Machine Learning</h3>
              <ul className="ml-6 list-disc">
                <li>We use third-party AI services to process and analyze financial data</li>
                <li>Your data may be processed by AI providers under strict data processing agreements</li>
                <li>All AI processing maintains the same privacy and security standards</li>
              </ul>
            </section>
          </section>

          <section id="user-rights" className="mb-10">
            <h2 className="mt-8 mb-4">5. Your Rights and Choices</h2>
            <p>Control over your data and privacy settings.</p>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">5.1 Data Rights</h3>
              <dl className="ml-6">
                <dt className="font-semibold">Access</dt>
                <dd className="mb-2">Request copies of your stored data</dd>
                <dt className="font-semibold">Correction</dt>
                <dd className="mb-2">Update or correct inaccurate information</dd>
                <dt className="font-semibold">Deletion</dt>
                <dd className="mb-2">Request permanent deletion of your account and data</dd>
                <dt className="font-semibold">Portability</dt>
                <dd className="mb-2">Export your data in a machine-readable format</dd>
                <dt className="font-semibold">Restriction</dt>
                <dd>Limit how we process your data</dd>
              </dl>
            </section>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">5.2 Gmail Access Control</h3>
              <ul className="ml-6 list-disc">
                <li>You can revoke Gmail access at any time through your Google Account settings</li>
                <li>Revoking access will stop new email processing but won't delete existing data</li>
                <li>You can request complete data deletion separately</li>
              </ul>
            </section>
          </section>

          <section id="international-data" className="mb-10">
            <h2 className="mt-8 mb-4">6. International Data Transfers</h2>
            <p>How we handle data across borders and jurisdictions.</p>
            <p>Your data may be processed and stored in countries other than your own. We ensure appropriate safeguards are in place for international transfers, including:</p>
            <ul className="ml-6 list-disc">
              <li>Standard Contractual Clauses (SCCs) for data transfers</li>
              <li>Adequacy decisions by relevant data protection authorities</li>
              <li>Appropriate technical and organizational security measures</li>
            </ul>
          </section>

          <section id="children" className="mb-10">
            <h2 className="mt-8 mb-4">7. Children's Privacy</h2>
            <p>Our services are not intended for users under 18.</p>
            <p>Our service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.</p>
          </section>

          <section id="changes" className="mb-10">
            <h2 className="mt-8 mb-4">8. Changes to This Privacy Policy</h2>
            <p>How we communicate updates to our privacy practices.</p>
            <p>We may update this Privacy Policy from time to time. We will notify you of any changes by:</p>
            <ul className="ml-6 list-disc">
              <li>Posting the new Privacy Policy on this page</li>
              <li>Updating the "Last updated" date</li>
              <li>Sending email notification for material changes</li>
              <li>Providing in-app notifications where appropriate</li>
            </ul>
          </section>

          <section id="contact" className="mb-10">
            <h2 className="mt-8 mb-4">9. Contact Information</h2>
            <p>How to reach us regarding privacy concerns or data requests.</p>
            <address className="not-italic ml-2">
              <ul className="ml-6">
                <li><strong>Email:</strong> <a href="mailto:contact@slash.cash">contact@slash.cash</a></li>
              </ul>
            </address>
            <p>We will respond to your inquiry within 30 days of receipt.</p>
          </section>
        </article>

        <Separator className="my-8" />
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Need more information? Check out our <Link href="/terms" className="underline hover:text-primary">Terms of Service</Link> or contact our support team.
          </p>
          <Link href="/" className="text-primary hover:underline font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
} 