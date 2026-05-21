export const dynamic = "force-static";

import type { Metadata } from "next";
import Link from "next/link";

import { CONTACT_EMAIL } from "@/lib/links";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms for using Slash Cash open-source software, the slash.cash website, and local-first finance tools.",
};

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-20 pt-28 md:pt-36">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-neutral-400">
        Legal
      </p>
      <h1 className="mt-3 text-[2.4rem] font-bold tracking-tight text-neutral-900">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-neutral-500">Last updated: May 21, 2026</p>

      <div className="mt-8 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
        <strong>Not financial advice.</strong> Slash Cash helps you organize and
        review personal spending. It does not provide investment, tax, or legal
        advice. You are responsible for your own financial decisions.
      </div>

      <article className="prose prose-neutral mt-10 max-w-none prose-headings:tracking-tight prose-a:text-sky-800">
        <h2>1. Agreement</h2>
        <p>
          By using slash.cash, installing the <code>slashcash</code> CLI, or
          running the local dashboard, you agree to these Terms. If you do not
          agree, do not use the software.
        </p>
        <p>You must be at least 18 years old to use Slash Cash.</p>

        <h2>2. What Slash Cash is</h2>
        <p>
          Slash Cash is local-first personal finance software: a CLI, local
          SQLite ledger, read-only connectors (including Gmail over IMAP with an
          app password you generate), and optional assistant features you
          configure.
        </p>
        <ul>
          <li>
            <strong>Email ingestion:</strong> Read-only access to finance-related
            messages you approve. Slash Cash cannot send email or modify your
            inbox.
          </li>
          <li>
            <strong>No money movement:</strong> The product does not execute
            payments, trades, or transfers.
          </li>
          <li>
            <strong>Open source:</strong> Core code is published under the
            license in the repository. Paid tiers described on the website are
            roadmap items unless explicitly available at purchase.
          </li>
        </ul>

        <h2>3. Your responsibilities</h2>
        <ul>
          <li>Keep your device, database file, and connector credentials secure.</li>
          <li>Use app passwords and read-only access patterns as documented.</li>
          <li>Verify categorization and suggestions before acting on them.</li>
          <li>Comply with applicable law and third-party terms (Google, banks, etc.).</li>
        </ul>

        <h2>4. Disclaimer of warranties</h2>
        <p>
          THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY
          KIND. We do not guarantee uninterrupted operation, perfect
          categorization, or fitness for a particular purpose.
        </p>

        <h2>5. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, Slash Cash and its contributors
          are not liable for indirect, incidental, or consequential damages
          arising from use of the software, including financial decisions you
          make based on dashboards or agent output.
        </p>

        <h2>6. Third-party services</h2>
        <p>
          Gmail, npm, optional AI providers, and your operating system are
          third-party services. We are not responsible for their availability,
          policies, or outages.
        </p>

        <h2>7. Changes</h2>
        <p>
          We may update these Terms. Continued use after the &quot;Last
          updated&quot; date constitutes acceptance of the revised Terms.
        </p>

        <h2>8. Contact</h2>
        <p>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </article>

      <p className="mt-12 text-sm text-neutral-500">
        See also{" "}
        <Link href="/privacy" className="font-medium text-sky-800 hover:underline">
          Privacy Policy
        </Link>
        {" · "}
        <Link href="/" className="font-medium text-sky-800 hover:underline">
          Home
        </Link>
      </p>
    </div>
  );
}
