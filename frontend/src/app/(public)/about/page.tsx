import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";
import {
  CONTACT_ADDRESS,
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
} from "@/lib/contact";
import { toJsonLdScript } from "@/lib/jsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

const title = "About Us";
const description =
  "Shohoje Pai is an online shop based in Sylhet that delivers across Bangladesh, with cash on delivery, order tracking and 7-day returns.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  // Falls back to the site's default OG image (not inherited automatically
  // from layout.tsx — see the shop/[id] product page for why).
  openGraph: {
    title,
    description,
    url: "/about",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: { title, description, images: ["/og-image.png"] },
};

// The Organization itself is declared once, on the homepage; this only marks
// the page as the one about it.
const aboutPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: `${title} | ${SITE_NAME}`,
  description,
  url: `${SITE_URL}/about`,
  mainEntity: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}/about` },
  ],
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-16 pt-[calc(var(--navbar-height)+2rem)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLdScript(aboutPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLdScript(breadcrumbJsonLd) }}
      />

      <div className="mb-6 flex items-center gap-3">
        <Store size={24} className="text-primary" />
        <h1 className="text-2xl font-semibold">About {SITE_NAME}</h1>
      </div>

      <div className="flex flex-col gap-6 text-sm text-muted">
        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Who we are</h2>
          <p>
            {SITE_NAME} is an online shop based in Sylhet, Bangladesh. The name is Bangla for
            &ldquo;get it easily&rdquo;, and that is the idea behind the store: pick what you
            like, order in a couple of minutes, and have it brought to your door.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">How shopping with us works</h2>
          <ul className="flex flex-col gap-1">
            <li>
              <strong className="text-foreground">Delivery across Bangladesh.</strong> We send
              orders to every zila by courier. See{" "}
              <Link href="/shipping" className="text-primary underline">
                Shipping &amp; Delivery
              </Link>{" "}
              for timelines and fees.
            </li>
            <li>
              <strong className="text-foreground">Cash on delivery.</strong> Pay when your order
              arrives. The delivery fee is shown at checkout before you place the order.
            </li>
            <li>
              <strong className="text-foreground">Order updates.</strong> We email you as your
              order is confirmed, shipped and delivered, and you can follow it any time under{" "}
              <Link href="/orders" className="text-primary underline">
                My Orders
              </Link>
              .
            </li>
            <li>
              <strong className="text-foreground">7-day returns.</strong> If something isn&apos;t
              right, you can return or exchange it within 7 days of delivery. Details are on our{" "}
              <Link href="/returns" className="text-primary underline">
                Returns &amp; Exchanges
              </Link>{" "}
              page.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Where to find us</h2>
          <address className="not-italic">{CONTACT_ADDRESS}</address>
          <p className="mt-2">
            Call{" "}
            <a href={`tel:${CONTACT_PHONE_TEL}`} className="text-primary underline">
              {CONTACT_PHONE_DISPLAY}
            </a>
            , email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">
              {CONTACT_EMAIL}
            </a>
            , or use our{" "}
            <Link href="/contact" className="text-primary underline">
              Contact page
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Start shopping</h2>
          <p>
            Browse everything in the{" "}
            <Link href="/shop" className="text-primary underline">
              Shop
            </Link>{" "}
            or look through our{" "}
            <Link href="/categories" className="text-primary underline">
              Categories
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
