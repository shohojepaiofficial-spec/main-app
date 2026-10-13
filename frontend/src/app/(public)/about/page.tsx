import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";
import {
  CONTACT_ADDRESS,
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
} from "@/lib/contact";
import { T } from "@/components/ui/T";
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
        <h1 className="text-2xl font-semibold">
          <T k="about.heading" vars={{ name: SITE_NAME }}>
            {"About {name}"}
          </T>
        </h1>
      </div>

      <div className="flex flex-col gap-6 text-sm text-muted">
        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">
            <T k="about.who.title">Who we are</T>
          </h2>
          <p>
            <T k="about.who.body" vars={{ name: SITE_NAME }}>
              {"{name} is an online shop based in Sylhet, Bangladesh. The name is Bangla for “get it easily”, and that is the idea behind the store: pick what you like, order in a couple of minutes, and have it brought to your door."}
            </T>
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">
            <T k="about.how.title">How shopping with us works</T>
          </h2>
          <ul className="flex flex-col gap-1">
            <li>
              <strong className="text-foreground">
                <T k="about.how.delivery.title">Delivery across Bangladesh.</T>
              </strong>{" "}
              <T k="about.how.delivery.body">We send orders to every zila by courier.</T>{" "}
              <Link href="/shipping" className="text-primary underline">
                <T k="about.how.delivery.link">See delivery times and fees</T>
              </Link>
            </li>
            <li>
              <strong className="text-foreground">
                <T k="about.how.cod.title">Cash on delivery.</T>
              </strong>{" "}
              <T k="about.how.cod.body">
                {"Pay when your order arrives. The delivery fee is shown at checkout before you place the order."}
              </T>
            </li>
            <li>
              <strong className="text-foreground">
                <T k="about.how.updates.title">Order updates.</T>
              </strong>{" "}
              <T k="about.how.updates.body">
                {"We email you as your order is confirmed, shipped and delivered."}
              </T>{" "}
              <Link href="/orders" className="text-primary underline">
                <T k="about.how.updates.link">Follow it under My Orders</T>
              </Link>
            </li>
            <li>
              <strong className="text-foreground">
                <T k="about.how.returns.title">7-day returns.</T>
              </strong>{" "}
              <T k="about.how.returns.body">
                {"If something isn't right, you can return or exchange it within 7 days of delivery."}
              </T>{" "}
              <Link href="/returns" className="text-primary underline">
                <T k="about.how.returns.link">Read the returns policy</T>
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">
            <T k="about.find.title">Where to find us</T>
          </h2>
          <address className="not-italic">{CONTACT_ADDRESS}</address>
          <ul className="mt-2 flex flex-col gap-1">
            <li>
              <T k="about.find.phone">Phone</T>:{" "}
              <a href={`tel:${CONTACT_PHONE_TEL}`} className="text-primary underline">
                {CONTACT_PHONE_DISPLAY}
              </a>
            </li>
            <li>
              <T k="about.find.email">Email</T>:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">
                {CONTACT_EMAIL}
              </a>
            </li>
            <li>
              <Link href="/contact" className="text-primary underline">
                <T k="about.find.contactLink">Send us a message</T>
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">
            <T k="about.start.title">Start shopping</T>
          </h2>
          <ul className="flex flex-col gap-1">
            <li>
              <Link href="/shop" className="text-primary underline">
                <T k="about.start.shop">Browse the shop</T>
              </Link>
            </li>
            <li>
              <Link href="/categories" className="text-primary underline">
                <T k="about.start.categories">Look through categories</T>
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
