import type { Metadata } from "next";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/contact";

const title = "Returns & Exchanges";
const description =
  "Return or exchange unused items within 7 days of delivery. Start a request from My Orders and get refunded by bKash, cash or bank transfer.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/returns" },
  // Not inherited from layout.tsx — see the shop/[id] product page for why.
  openGraph: {
    title,
    description,
    url: "/returns",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: { title, description, images: ["/og-image.png"] },
};

export default function ReturnsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-16 pt-[calc(var(--navbar-height)+2rem)]">
      <div className="mb-6 flex items-center gap-3">
        <RotateCcw size={24} className="text-primary" />
        <h1 className="text-2xl font-semibold">Returns & Exchanges</h1>
      </div>

      <div className="flex flex-col gap-6 text-sm text-muted">
        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Return window</h2>
          <p>
            Most items can be returned or exchanged within <strong className="text-foreground">7
            days</strong> of delivery, as long as they&apos;re unused, unworn, and in their
            original packaging.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">How to start a return</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Sign in and open{" "}
              <Link href="/orders" className="text-primary underline">
                My Orders
              </Link>
              .
            </li>
            <li>
              On a delivered order, choose <strong className="text-foreground">Return or exchange</strong>,
              pick the items and tell us why.
            </li>
            <li>
              We&apos;ll review it and email you. Once approved, we&apos;ll arrange for the item to come
              back to us.
            </li>
          </ol>
          <p className="mt-2">
            Can&apos;t sign in, or ordered by phone? Reach us through the{" "}
            <Link href="/contact" className="text-primary underline">
              Contact page
            </Link>{" "}
            or at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">
              {CONTACT_EMAIL}
            </a>{" "}
            with your order number, and we&apos;ll start it for you.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Refunds</h2>
          <p>
            Once we&apos;ve received and checked the item, we send your refund. Orders paid with bKash
            are refunded to the same bKash account. Cash on Delivery orders are refunded by bKash, cash or
            bank transfer, whichever suits you. You&apos;ll see the refund amount and date under the order
            in My Orders.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Non-returnable items</h2>
          <p>
            Items marked as final sale, or items that show signs of use, damage, or missing
            original packaging, aren&apos;t eligible for return.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Exchanges</h2>
          <p>
            Want a different size or colour instead? Choose <strong className="text-foreground">Exchange</strong>{" "}
            when you start your request and tell us what you&apos;d like. We&apos;ll send the replacement
            once your item is back with us, subject to stock.
          </p>
        </section>
      </div>
    </main>
  );
}
