import type { Metadata } from "next";
import Link from "next/link";
import { Truck } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/contact";
import { getStoreCity } from "@/services/configService";

export const metadata: Metadata = {
  title: "Shipping & Delivery",
  description:
    "We deliver across all of Bangladesh. See delivery timelines and how your delivery fee is estimated at checkout.",
};

export default async function ShippingPage() {
  const STORE_CITY = await getStoreCity();
  return (
    <main className="mx-auto max-w-3xl px-6 pb-16 pt-[calc(var(--navbar-height)+2rem)]">
      <div className="mb-6 flex items-center gap-3">
        <Truck size={24} className="text-primary" />
        <h1 className="text-2xl font-semibold">Shipping & Delivery</h1>
      </div>

      <div className="flex flex-col gap-6 text-sm text-muted">
        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Delivery zones</h2>
          <p>
            We deliver across all of Bangladesh — every zila and upazila, inside and outside{" "}
            {STORE_CITY}.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Delivery timelines</h2>
          <ul className="flex flex-col gap-1">
            <li>
              <strong className="text-foreground">Inside {STORE_CITY}:</strong> typically 1–2
              business days.
            </li>
            <li>
              <strong className="text-foreground">Outside {STORE_CITY}:</strong> typically 3–5
              business days, depending on the courier and your location.
            </li>
          </ul>
          <p className="mt-2">
            You can set your default delivery location under{" "}
            <Link href="/settings" className="text-primary underline">
              Settings
            </Link>{" "}
            so we know which zone applies to you.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Delivery fees</h2>
          <p>
            Your delivery fee is estimated at checkout from our courier&apos;s live rates for your
            zila and upazila and the weight of your order. You&apos;ll see the exact amount in the
            order summary before you place your order, and that&apos;s what you&apos;ll be charged.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Order tracking</h2>
          <p>
            Once you&apos;re signed in, visit your{" "}
            <Link href="/orders" className="text-primary underline">
              Orders
            </Link>{" "}
            page any time to see the current status of every order you&apos;ve placed.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Questions?</h2>
          <p>
            Reach out any time at{" "}
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
