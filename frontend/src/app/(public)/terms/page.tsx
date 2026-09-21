import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { SITE_NAME } from "@/lib/seo";
import { CONTACT_EMAIL } from "@/lib/contact";
import { getStoreCity } from "@/services/configService";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms that apply when you shop at ${SITE_NAME}.`,
};

const LAST_UPDATED = "September 15, 2026";

export default async function TermsPage() {
  const STORE_CITY = await getStoreCity();
  return (
    <main className="mx-auto max-w-3xl px-6 pb-16 pt-[calc(var(--navbar-height)+2rem)]">
      <div className="mb-2 flex items-center gap-3">
        <FileText size={24} className="text-primary" />
        <h1 className="text-2xl font-semibold">Terms of Service</h1>
      </div>
      <p className="mb-6 text-xs text-muted">Last updated: {LAST_UPDATED}</p>

      <div className="flex flex-col gap-6 text-sm text-muted">
        <section>
          <p>
            These terms apply whenever you browse or buy from {SITE_NAME}. By using the site or
            placing an order, you agree to them. If you don&apos;t agree, please don&apos;t use
            the site.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Accounts</h2>
          <p>
            You&apos;re responsible for keeping your password confidential and for anything that
            happens under your account. Tell us right away if you think someone else has access
            to it. You must provide accurate information when creating an account or placing an
            order — an incorrect delivery address or phone number can prevent your order from
            being delivered.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Orders and payment</h2>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>
              You can pay with <strong className="text-foreground">Cash on Delivery</strong> (in cash
              when your order arrives) or <strong className="text-foreground">bKash</strong> (charged
              instantly at checkout). A bKash payment that fails or is cancelled isn&apos;t charged,
              and the order it was for is cancelled automatically.
            </li>
            <li>
              Placing an order is an offer to buy — we confirm it by accepting and preparing your
              order. We may decline or cancel an order (for example, if an item turns out to be
              out of stock) and will let you know if that happens.
            </li>
            <li>Prices, product availability, and delivery fees can change without notice, but the price you were charged when your order was placed won&apos;t change.</li>
            <li>Promo codes are subject to their own listed terms (validity period, minimum spend, eligible products) and can be withdrawn at any time.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Delivery, returns, and exchanges</h2>
          <p>
            See our{" "}
            <Link href="/shipping" className="text-primary underline">
              Shipping &amp; Delivery
            </Link>{" "}
            and{" "}
            <Link href="/returns" className="text-primary underline">
              Returns &amp; Exchanges
            </Link>{" "}
            pages for delivery timelines and how to return or exchange an item — both are part of
            these terms.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Reviews and other content you submit</h2>
          <p>
            Reviews should reflect your genuine experience with a product. We may remove a review
            that&apos;s abusive, spam, or unrelated to the product. Don&apos;t post anything
            illegal, misleading, or infringing on someone else&apos;s rights.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Acceptable use</h2>
          <p>
            Don&apos;t misuse the site — that includes attempting to disrupt it, scraping it at
            scale, submitting false information, or using it for any unlawful purpose. We may
            suspend or close an account that does.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Intellectual property</h2>
          <p>
            Product descriptions, images, and the site&apos;s own design and branding belong to{" "}
            {SITE_NAME} or its licensors. You&apos;re welcome to browse and share links to it, but
            not to copy or reuse our content commercially without permission.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Limitation of liability</h2>
          <p>
            We work to keep product and pricing information accurate, but mistakes can happen. To
            the extent permitted by law, {SITE_NAME} isn&apos;t liable for indirect or
            consequential losses arising from your use of the site; our liability for any order is
            limited to the amount you paid for it.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Governing law</h2>
          <p>These terms are governed by the laws of Bangladesh, where {SITE_NAME} operates (based in {STORE_CITY}).</p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Changes to these terms</h2>
          <p>
            If these terms change materially, we&apos;ll update the date at the top of this page.
            Continuing to use the site after a change means you accept the updated terms.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Contact us</h2>
          <p>
            Questions about these terms? Reach us at{" "}
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
