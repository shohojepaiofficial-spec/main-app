import type { Metadata } from "next";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Returns & Exchanges",
  description: "Our return and exchange policy.",
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
          <p>
            Contact us with your order number and the reason for the return, either through our{" "}
            <Link href="/contact" className="text-primary underline">
              Contact page
            </Link>{" "}
            or by emailing{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">
              {CONTACT_EMAIL}
            </a>
            . We&apos;ll walk you through the next steps.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Refunds</h2>
          <p>
            Once we&apos;ve received and inspected the returned item, we&apos;ll notify you of the
            approval status. Approved refunds are processed back to your original payment method.
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
            Want a different size or color instead? Let us know when you start your return — we&apos;ll
            do our best to arrange a direct exchange, subject to stock availability.
          </p>
        </section>
      </div>
    </main>
  );
}
