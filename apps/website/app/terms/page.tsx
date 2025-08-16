export const dynamic = 'force-static';

import type { Metadata } from "next"
import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using Slash.cash AI finance services. Learn about user obligations, service limitations, and legal agreements.",
  keywords: ["terms of service", "legal agreement", "AI finance", "service conditions", "user obligations"],
}

export default function TermsOfServicePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">Legal</Badge>
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-lg text-muted-foreground">
            Agreement between you and Slash.cash for use of our AI finance services
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: January 1, 2025
          </p>
        </div>

        <div className="bg-muted/30 p-4 rounded-lg mb-8">
          <p className="text-sm">
            <strong>Important:</strong> By using Slash.cash, you agree to these terms. Please read them carefully before using our service.
          </p>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none px-2 py-4 md:px-8 md:py-8">
          <section className="mb-10">
            <h2 className="mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>These Terms of Service ("Terms") govern your use of the Slash.cash website and services ("Service") operated by Slash.cash ("us", "we", or "our"). By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these terms, then you may not access the Service.</p>
            <p>You must be at least 18 years old to use this Service. By using the Service, you represent and warrant that you are at least 18 years old.</p>
          </section>

          <section className="mb-10">
            <h2 className="mt-8 mb-4">2. Description of Service</h2>
            <p>Slash.cash is an AI-powered personal finance assistant that tracks expenses automatically.</p>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">2.1 Core Functionality</h3>
              <ul className="ml-6 list-disc">
                <li><strong>Email Processing:</strong> We access your Gmail account to identify and process financial transaction emails</li>
                <li><strong>Expense Tracking:</strong> Automatically categorize and track spending from email receipts and notifications</li>
                <li><strong>AI Analytics:</strong> Provide insights, trends, and personalized financial recommendations</li>
                <li><strong>Data Visualization:</strong> Create charts, graphs, and reports of your financial data</li>
                <li><strong>Query Interface:</strong> Enable natural language questions about your financial patterns</li>
              </ul>
            </section>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">2.2 Current Scope</h3>
              <p>We currently focus on Swiggy transaction analysis and are expanding to include other financial service providers, banks, UPI platforms, and subscription services. Our service processes email-based financial information only and does not directly access your bank accounts or financial institutions.</p>
            </section>
          </section>

          <section className="mb-10">
            <h2 className="mt-8 mb-4">3. User Obligations and Responsibilities</h2>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">3.1 Account Responsibility</h3>
              <ul className="ml-6 list-disc">
                <li>You are responsible for maintaining the security of your account and password</li>
                <li>You must provide accurate and complete information when creating your account</li>
                <li>You must promptly update your account information if it changes</li>
                <li>You are responsible for all activities that occur under your account</li>
              </ul>
            </section>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">3.2 Acceptable Use</h3>
              <ul className="ml-6 list-disc">
                <li>Use the Service only for lawful purposes and in accordance with these Terms</li>
                <li>Do not attempt to interfere with, disrupt, or hack our systems</li>
                <li>Do not use the Service to process or track expenses that are not your own</li>
                <li>Do not share your account credentials with others</li>
                <li>Do not attempt to reverse engineer or extract our algorithms</li>
              </ul>
            </section>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">3.3 Gmail Authorization</h3>
              <p>By connecting your Gmail account, you authorize us to access and process emails related to financial transactions. You can revoke this authorization at any time through your Google Account settings, though this will limit our ability to provide the Service.</p>
            </section>
          </section>

          <section className="mb-10">
            <h2 className="mt-8 mb-4">4. Intellectual Property and Trademarks</h2>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">4.1 Our Intellectual Property</h3>
              <ul className="ml-6 list-disc">
                <li>The Service, including its design, functionality, and AI algorithms, is owned by Slash.cash</li>
                <li>All content, trademarks, and intellectual property rights are protected by applicable laws</li>
                <li>You may not copy, modify, distribute, or create derivative works of our Service</li>
              </ul>
            </section>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">4.2 Third-Party Trademarks</h3>
              <p>We use company names and trademarks (such as "Swiggy", bank names, and other financial service providers) solely for identification and categorization purposes. We are not affiliated with, endorsed by, or sponsored by these companies unless explicitly stated. All trademarks are the property of their respective owners.</p>
            </section>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">4.3 Your Data</h3>
              <p>You retain ownership of your personal and financial data. By using our Service, you grant us a limited license to process your data as described in our Privacy Policy for the purpose of providing the Service.</p>
            </section>
          </section>

          <section className="mb-10">
            <h2 className="mt-8 mb-4">5. Disclaimers and Limitations</h2>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">5.1 Service Availability</h3>
              <ul className="ml-6 list-disc">
                <li>We strive for 99.9% uptime but cannot guarantee uninterrupted service</li>
                <li>Scheduled maintenance may temporarily affect service availability</li>
                <li>We are not responsible for downtime caused by third-party services (Gmail, internet connectivity, etc.)</li>
              </ul>
            </section>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">5.2 Data Accuracy</h3>
              <p>While we use advanced AI to process and categorize your financial data, we cannot guarantee 100% accuracy. You should review and verify all categorizations and insights provided by our Service. We are not responsible for financial decisions made based on our analysis.</p>
            </section>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">5.3 Financial Advice Disclaimer</h3>
              <p>Our Service provides informational insights and analytics only. We do not provide financial advice, investment recommendations, or tax guidance. You should consult with qualified financial professionals for personalized advice.</p>
            </section>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">5.4 Third-Party Services</h3>
              <p>Our Service depends on third-party services (Gmail API, AI providers, cloud infrastructure). We are not responsible for any issues, downtime, or data loss caused by these third-party services.</p>
            </section>
          </section>

          <section className="mb-10">
            <h2 className="mt-8 mb-4">6. Limitation of Liability</h2>
            <div className="bg-muted/50 p-4 rounded-lg my-4">
              <p className="text-sm font-medium mb-2">IMPORTANT LEGAL NOTICE:</p>
              <p className="text-sm">TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SLASH.CASH SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOOD-WILL, OR OTHER INTANGIBLE LOSSES.</p>
            </div>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">6.1 Maximum Liability</h3>
              <p>In no event shall our total liability to you for all damages exceed the amount you paid us for the Service in the 12 months preceding the incident giving rise to liability. If you have not paid us any fees, our maximum liability is $100 USD.</p>
            </section>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">6.2 Exclusions</h3>
              <ul className="ml-6 list-disc">
                <li>We are not liable for financial losses or poor financial decisions</li>
                <li>We are not responsible for data breaches of third-party services</li>
                <li>We are not liable for tax implications of your financial activities</li>
                <li>We are not responsible for disputes with merchants or financial institutions</li>
              </ul>
            </section>
          </section>

          <section className="mb-10">
            <h2 className="mt-8 mb-4">7. Privacy and Data Protection</h2>
            <p>Your privacy is important to us. Our collection, use, and protection of your information is governed by our Privacy Policy, which is incorporated into these Terms by reference.</p>
            <p>Key points:</p>
            <ul className="ml-6 list-disc">
              <li>We only access financial transaction emails, not personal correspondence</li>
              <li>Your data is encrypted and stored securely</li>
              <li>We do not sell your data to third parties</li>
              <li>You can request data deletion at any time</li>
            </ul>
            <p>For complete details, please read our <Link href="/privacy" className="underline hover:text-primary">Privacy Policy</Link>.</p>
          </section>

          <section className="mb-10">
            <h2 className="mt-8 mb-4">8. Termination</h2>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">8.1 Termination by You</h3>
              <ul className="ml-6 list-disc">
                <li>You may terminate your account at any time through your account settings</li>
                <li>You can revoke Gmail access through your Google Account settings</li>
                <li>You may request complete data deletion within 30 days of termination</li>
              </ul>
            </section>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">8.2 Termination by Us</h3>
              <p>We may terminate or suspend your account immediately if you violate these Terms, engage in illegal activities, or if we reasonably believe continued service would harm us or other users. We will provide notice when possible, but immediate termination may be necessary in serious cases.</p>
            </section>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">8.3 Effect of Termination</h3>
              <ul className="ml-6 list-disc">
                <li>Your right to use the Service will cease immediately</li>
                <li>We will begin the process of deleting your data within 30 days</li>
                <li>Sections of these Terms that by their nature should survive termination will remain in effect</li>
              </ul>
            </section>
          </section>

          <section className="mb-10">
            <h2 className="mt-8 mb-4">9. Dispute Resolution</h2>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">9.1 Governing Law</h3>
              <p>These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.</p>
            </section>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">9.2 Dispute Resolution Process</h3>
              <ol className="ml-6 list-decimal">
                <li><strong>Informal Resolution:</strong> Contact us first at legal@slash.cash to attempt informal resolution</li>
                <li><strong>Mediation:</strong> If informal resolution fails, disputes will be submitted to binding mediation</li>
                <li><strong>Arbitration:</strong> Unresolved disputes will be settled through binding arbitration</li>
                <li><strong>Class Action Waiver:</strong> You agree not to participate in class action lawsuits</li>
              </ol>
            </section>
            <section className="mt-6 mb-6">
              <h3 className="mt-6 mb-2">9.3 Jurisdiction</h3>
              <p>Any legal action or proceeding arising under these Terms will be brought exclusively in the courts of [Your Jurisdiction], and you consent to the personal jurisdiction of such courts.</p>
            </section>
          </section>

          <section className="mb-10">
            <h2 className="mt-8 mb-4">10. Updates and Modifications</h2>
            <p>We reserve the right to modify these Terms at any time. We will notify you of any changes by:</p>
            <ul className="ml-6 list-disc">
              <li>Posting the updated Terms on this page</li>
              <li>Updating the "Last updated" date</li>
              <li>Sending email notification for material changes</li>
              <li>Providing in-app notifications when you next access the Service</li>
            </ul>
            <p>Your continued use of the Service after any modification indicates your acceptance of the updated Terms.</p>
          </section>

          <section className="mb-10">
            <h2 className="mt-8 mb-4">11. Contact Information</h2>
            <p>For questions about these Terms, please contact us:</p>
            <ul className="ml-6">
              <li><strong>Email:</strong> contact@slash.cash</li>
            </ul>
          </section>
        </div>

        <Separator className="my-8" />
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Questions about these terms? Read our <Link href="/privacy" className="underline hover:text-primary">Privacy Policy</Link> or contact our legal team.
          </p>
          <Link href="/" className="text-primary hover:underline font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
} 