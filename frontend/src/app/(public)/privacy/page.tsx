import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SITE_NAME } from "@/lib/seo";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE_NAME} collects, uses, and protects your information.`,
};

const LAST_UPDATED = "September 15, 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-16 pt-[calc(var(--navbar-height)+2rem)]">
      <div className="mb-2 flex items-center gap-3">
        <ShieldCheck size={24} className="text-primary" />
        <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      </div>
      <p className="mb-6 text-xs text-muted">Last updated: {LAST_UPDATED}</p>

      <div className="flex flex-col gap-6 text-sm text-muted">
        <section>
          <p>
            This policy explains what information {SITE_NAME} collects when you use our site,
            why we collect it, and the choices you have. Creating an account, placing an order,
            or contacting us means you&apos;ve read and agree to this policy.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Information we collect</h2>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>
              <strong className="text-foreground">Account information:</strong> your name, email
              address, and password (or, if you sign in with Google, the basic profile information
              it shares with us).
            </li>
            <li>
              <strong className="text-foreground">Order information:</strong> your phone number,
              delivery address, and what you&apos;ve ordered — needed to actually deliver it and, for
              a bKash order, to start and confirm that payment.
            </li>
            <li>
              <strong className="text-foreground">Communications:</strong> anything you send us
              through the Contact page, along with your name and email so we can reply.
            </li>
            <li>
              <strong className="text-foreground">Usage information:</strong> pages you visit and
              products you click on, tied to a random identifier stored in your browser rather
              than your identity, so we can understand how the store is used overall. See
              &quot;Cookies and local storage&quot; below.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">How we use it</h2>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>To create and manage your account, and to process and deliver your orders.</li>
            <li>To respond to messages you send us.</li>
            <li>
              To send you promotional emails or SMS messages — <strong className="text-foreground">
              only if you&apos;ve explicitly opted in</strong> to that in Settings or at checkout.
              Every marketing email includes a one-click unsubscribe link, and you can turn either
              channel off any time from Settings.
            </li>
            <li>To understand overall traffic and improve the store.</li>
            <li>To detect and prevent abuse of the site (for example, rate-limiting repeated requests).</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Cookies and local storage</h2>
          <p>
            We use your browser&apos;s local storage (not third-party tracking cookies) to keep you
            signed in, remember your cart and language preference, and generate an anonymous
            visitor identifier for traffic analytics. You can clear this at any time through your
            browser&apos;s settings, though doing so will sign you out and clear your cart.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Who we share it with</h2>
          <p>
            We don&apos;t sell your information. It&apos;s shared only where necessary to run the
            store: with Google if you choose to sign in that way, with bKash to process a bKash
            payment (your phone number and the order amount, not your bKash PIN — that&apos;s
            entered directly on bKash&apos;s own page, never ours), with our email/SMS providers to
            deliver messages you&apos;ve opted into, and with couriers to the extent needed to
            deliver your order. We never process or store any payment card or bKash PIN details
            ourselves.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">How long we keep it</h2>
          <p>
            Account and order records are kept for as long as your account exists, since your
            Orders page relies on them. Anonymous traffic/analytics records are automatically
            deleted after 180 days. If you&apos;d like your account and its data deleted sooner,
            contact us using the details below.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Your choices</h2>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>
              Update your profile, delivery address, and marketing preferences any time from{" "}
              <Link href="/settings" className="text-primary underline">
                Settings
              </Link>
              .
            </li>
            <li>Unsubscribe from marketing emails via the link at the bottom of any campaign email, or from Settings.</li>
            <li>Ask us to access, correct, or delete your account information by contacting us.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Children&apos;s privacy</h2>
          <p>This site is not directed at children, and we don&apos;t knowingly collect information from anyone under 13.</p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Changes to this policy</h2>
          <p>
            If this policy changes materially, we&apos;ll update the date at the top of this page.
            Continuing to use the site after a change means you accept the updated policy.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Contact us</h2>
          <p>
            Questions about this policy or your data? Reach us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">
              {CONTACT_EMAIL}
            </a>{" "}
            or via our{" "}
            <Link href="/contact" className="text-primary underline">
              Contact page
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
