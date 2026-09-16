import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";
import { FaFacebookF, FaInstagram, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { CONTACT_ADDRESS, CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "@/lib/contact";
import { Logo } from "@/views/Logo";
import { SITE_NAME } from "@/lib/seo";

const SHOP_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/categories", label: "Categories" },
];

const COMPANY_LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/shipping", label: "Shipping & Delivery" },
  { href: "/returns", label: "Returns & Exchanges" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

const SOCIAL_LINKS = [
  { href: "https://facebook.com", label: "Facebook", Icon: FaFacebookF },
  { href: "https://instagram.com", label: "Instagram", Icon: FaInstagram },
  { href: "https://twitter.com", label: "Twitter", Icon: FaXTwitter },
  { href: "https://youtube.com", label: "YouTube", Icon: FaYoutube },
];

export function Footer() {
  return (
    <footer className="bg-foreground text-background/80 mt-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8 py-10 grid grid-cols-2 gap-8 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <Logo wordmarkClassName="text-background" />
          <p className="mt-2 text-sm">Quality products, fast shipping, and a storefront you can trust.</p>
          <div className="flex items-center gap-3 mt-4">
            {SOCIAL_LINKS.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="hover:text-background"
              >
                <Icon size={15} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-background mb-3">Shop</p>
          <ul className="flex flex-col gap-2 text-sm">
            {SHOP_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-background">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-background mb-3">Company</p>
          <ul className="flex flex-col gap-2 text-sm">
            {COMPANY_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-background">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-background mb-3">Contact</p>
          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex items-center gap-2">
              <Phone size={14} className="shrink-0" />
              <a href={`tel:${CONTACT_PHONE_TEL}`} className="hover:text-background">
                {CONTACT_PHONE_DISPLAY}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={14} className="shrink-0" />
              <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-background">
                {CONTACT_EMAIL}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin size={14} className="shrink-0" />
              <span>{CONTACT_ADDRESS}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-background/10 px-4 lg:px-8 py-4 text-xs text-center">
        &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
