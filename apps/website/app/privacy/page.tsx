export const dynamic = "force-static";

import type { Metadata } from "next";
import Link from "next/link";

import { CONTACT_EMAIL } from "@/lib/links";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Slash Cash handles data: local-first SQLite on your device, read-only IMAP connectors, optional assistant providers you configure.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-20 pt-28 md:pt-36">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-neutral-400">
        Legal
      </p>
      <h1 className="mt-3 text-[2.4rem] font-bold tracking-tight text-neutral-900">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-neutral-500">Last updated: May 21, 2026</p>

      <article className="prose prose-neutral mt-10 max-w-none prose-headings:tracking-tight prose-a:text-sky-800">
        <p>
          Slash Cash (<strong>slash.cash</strong>) is a local-first personal
          finance product. The open-source <code>slashcash</code> CLI and local
          dashboard run on your machine. This policy describes what data is
          involved and where it lives.
        </p>

        <h2>1. What we collect</h2>
        <h3>1.1 On your device (primary)</h3>
        <ul>
          <li>
            <strong>Transaction ledger:</strong> Structured spend data in a
            local SQLite database (default under your home directory).
          </li>
          <li>
            <strong>Connector credentials:</strong> Gmail IMAP app passwords
            stored locally (for example macOS Keychain or a local credentials
            file when Keychain is unavailable).
          </li>
          <li>
            <strong>Email-derived data:</strong> Finance-related messages are
            read over read-only IMAP, parsed on your device, and converted into
            transactions. We do not operate a hosted copy of your inbox.
          </li>
          <li>
            <strong>Attachments:</strong> PDFs and similar files saved locally
            when you enable attachment storage.
          </li>
        </ul>
        <h3>1.2 On this website</h3>
        <p>
          The marketing site at slash.cash is static. We do not ask you to sign
          in or upload financial files through the website. Standard server or
          CDN logs (if any) may include IP address and browser type — the same
          as any public website.
        </p>
        <h3>1.3 Optional assistant</h3>
        <p>
          If you configure an assistant provider (for example a local Ollama
          instance or a cloud API you supply), prompts may be sent to that
          provider under <em>your</em> configuration. Ingestion and
          categorization do not require any model.
        </p>

        <h2>2. How we use information</h2>
        <ul>
          <li>Categorize spends, detect leaks, score money health, and prepare weekly review on your device.</li>
          <li>Improve the open-source product when you choose to share feedback or issues publicly.</li>
        </ul>
        <p>
          <strong>We do not:</strong> sell your financial data, run ads against
          your transaction graph, move money on your behalf, or require uploading
          your ledger to a Slash Cash cloud.
        </p>

        <h2>2.1 No Slash Cash cloud ledger</h2>
        <p>
          There is no Slash Cash–hosted database of your transactions today. If
          we ever offer optional hosted features, they will be opt-in and
          described separately before you enable them.
        </p>

        <h2>3. Security</h2>
        <p>
          You control the machine and filesystem. Use disk encryption, strong
          device passwords, and careful backup of your SQLite file. Connector
          credentials should be treated like any other app password.
        </p>

        <h2>4. Third-party names</h2>
        <p>
          We reference merchants and services (Swiggy, banks, UPI apps, etc.)
          only to describe ingestion and categorization. We are not affiliated
          with or endorsed by those companies unless we state otherwise.
        </p>

        <h2>5. Your choices</h2>
        <ul>
          <li>Delete your local database file at any time.</li>
          <li>Revoke or rotate your Gmail app password in Google Account settings.</li>
          <li>Export or back up SQLite using standard tools — you own the file.</li>
        </ul>

        <h2>6. Children</h2>
        <p>Slash Cash is not intended for users under 18.</p>

        <h2>7. Changes</h2>
        <p>
          We may update this page. Material changes will be reflected in the
          &quot;Last updated&quot; date above.
        </p>

        <h2>8. Contact</h2>
        <p>
          Questions:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </article>

      <p className="mt-12 text-sm text-neutral-500">
        See also{" "}
        <Link href="/terms" className="font-medium text-sky-800 hover:underline">
          Terms of Service
        </Link>
        {" · "}
        <Link href="/" className="font-medium text-sky-800 hover:underline">
          Home
        </Link>
      </p>
    </div>
  );
}
