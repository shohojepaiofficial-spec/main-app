import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";
import { FaFacebookF, FaInstagram } from "react-icons/fa6";
import { Logo } from "@/views/Logo";
import { SITE_NAME } from "@/lib/seo";
import { T } from "@/components/ui/T";
import { toTelLink } from "@/lib/phone";
import { SiteContactInfo, SiteSocialLinks } from "@/models";

const SHOP_LINKS = [
  { href: "/shop", key: "nav.shop", label: "Shop" },
  { href: "/categories", key: "nav.categories", label: "Categories" },
];

const COMPANY_LINKS = [
  { href: "/about", key: "nav.about", label: "About" },
  { href: "/store-locations", key: "nav.storeLocations", label: "Our Stores" },
  { href: "/contact", key: "nav.contact", label: "Contact" },
  { href: "/shipping", key: "footer.shipping", label: "Shipping & Delivery" },
  { href: "/returns", key: "footer.returns", label: "Returns & Exchanges" },
  { href: "/privacy", key: "footer.privacy", label: "Privacy Policy" },
  { href: "/terms", key: "footer.terms", label: "Terms of Service" },
];

export function Footer({ social, contact }: { social: SiteSocialLinks; contact: SiteContactInfo }) {
  const socialLinks = [
    { href: social.facebookUrl, label: "Facebook", Icon: FaFacebookF },
    { href: social.instagramUrl, label: "Instagram", Icon: FaInstagram },
  ].filter((link) => link.href);

  return (
    <footer className="bg-foreground text-background/80 mt-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8 py-10 grid grid-cols-2 gap-8 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <Logo wordmarkClassName="text-background" onDarkBackground />
          <p className="mt-2 text-sm">
            <T k="footer.blurb">Quality products, fast shipping, and a storefront you can trust.</T>
          </p>
          <div className="flex items-center gap-3 mt-4">
            {socialLinks.map(({ href, label, Icon }) => (
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
          <p className="text-sm font-semibold text-background mb-3">
            <T k="footer.shop">Shop</T>
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            {SHOP_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-background">
                  <T k={link.key}>{link.label}</T>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-background mb-3">
            <T k="footer.company">Company</T>
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            {COMPANY_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-background">
                  <T k={link.key}>{link.label}</T>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-background mb-3">
            <T k="nav.contact">Contact</T>
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex items-center gap-2">
              <Phone size={14} className="shrink-0" />
              <a href={toTelLink(contact.phone)} className="hover:text-background">
                {contact.phone}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={14} className="shrink-0" />
              <a href={`mailto:${contact.email}`} className="hover:text-background">
                {contact.email}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin size={14} className="shrink-0" />
              <span>{contact.address}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-background/10 px-4 lg:px-8 py-4 text-xs text-center">
        &copy; {new Date().getFullYear()} {SITE_NAME}. <T k="footer.allRightsReserved">All rights reserved.</T>
      </div>
    </footer>
  );
}
