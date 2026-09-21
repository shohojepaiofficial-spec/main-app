"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, ShoppingCart, Menu, X } from "lucide-react";
import { FaFacebookF, FaInstagram, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { useAuthController } from "@/controllers/useAuthController";
import { useUIStore } from "@/controllers/useUIStore";
import { useCartStore } from "@/controllers/useCartStore";
import { useTranslations } from "@/controllers/useTranslations";
import { LanguageSwitcher } from "@/views/LanguageSwitcher";
import { Logo } from "@/views/Logo";
import { ProfileDropdown } from "@/views/ProfileDropdown";
import { PromoAnnouncementBar } from "@/views/PromoAnnouncementBar";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "@/lib/contact";
import { AppliedPromo } from "@/models";

const SCROLL_THRESHOLD = 80;

const NAV_LINKS = [
  { href: "/", key: "nav.home", label: "Home" },
  { href: "/shop", key: "nav.shop", label: "Shop" },
  { href: "/categories", key: "nav.categories", label: "Categories" },
  { href: "/about", key: "nav.about", label: "About" },
  { href: "/contact", key: "nav.contact", label: "Contact" },
];

const SOCIAL_LINKS = [
  { href: "https://facebook.com", label: "Facebook", Icon: FaFacebookF },
  { href: "https://instagram.com", label: "Instagram", Icon: FaInstagram },
  { href: "https://twitter.com", label: "Twitter", Icon: FaXTwitter },
  { href: "https://youtube.com", label: "YouTube", Icon: FaYoutube },
];

function TopBar() {
  return (
    <div className="flex items-center justify-between px-4 lg:px-8 py-1.5 text-xs bg-foreground text-background/80">
      <a href={`tel:${CONTACT_PHONE_TEL}`} className="flex items-center gap-1.5 hover:opacity-80">
        <Phone size={12} />
        <span className="hidden sm:inline">{CONTACT_PHONE_DISPLAY}</span>
      </a>
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <div className="hidden sm:flex items-center gap-3">
          {SOCIAL_LINKS.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="hover:opacity-80"
            >
              <Icon size={13} />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function CartButton() {
  const openCartModal = useUIStore((s) => s.openCartModal);
  const totalItems = useCartStore((s) => s.totalItems());

  return (
    <button
      onClick={openCartModal}
      aria-label="Open cart"
      className="relative p-2 text-foreground hover:opacity-70"
    >
      <ShoppingCart size={22} />
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
          {totalItems}
        </span>
      )}
    </button>
  );
}

function AuthArea() {
  const { isAuthenticated } = useAuthController();
  const openAuthModal = useUIStore((s) => s.openAuthModal);
  const { t } = useTranslations();

  if (isAuthenticated) return <ProfileDropdown />;

  return (
    <button
      onClick={() => openAuthModal("login")}
      className="text-sm font-normal border border-border text-foreground rounded-md px-3 py-1.5 hover:bg-background"
    >
      {t("nav.signIn", "Sign in")}
    </button>
  );
}

// A link is "active" on its own route and any nested route under it (e.g.
// "/shop" also covers "/shop/[id]"), except Home, which only matches "/"
// exactly — otherwise every route would count as a Home match.
function isNavLinkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar({ sitewidePromo }: { sitewidePromo?: AppliedPromo | null }) {
  const pathname = usePathname();
  const { t } = useTranslations();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Publish the navbar's real rendered height as a CSS variable so page
  // content (which starts right after the navbar, not underneath it — the
  // header floats via `fixed` and reserves no layout space on its own) knows
  // how much to pad itself by. See `PlaceholderPage`'s `offsetForFixedNavbar`.
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;

    const setHeightVar = () => {
      document.documentElement.style.setProperty("--navbar-height", `${el.offsetHeight}px`);
    };
    setHeightVar();

    const observer = new ResizeObserver(setHeightVar);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-30 backdrop-blur-md transition-shadow duration-300 border-b border-border shadow-md ${
        isScrolled ? "bg-nav-surface/98" : "bg-nav-surface/92"
      }`}
    >
      <div ref={barRef}>
        <PromoAnnouncementBar promo={sitewidePromo ?? null} />
        <TopBar />

        <nav className="flex items-center justify-between px-4 lg:px-8 py-3 gap-4">
          <Logo />

          <ul className="hidden md:flex items-center gap-6 text-sm font-normal text-foreground">
            {NAV_LINKS.map((link) => {
              const isActive = isNavLinkActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={isActive ? "text-primary font-medium" : "hover:text-primary"}
                  >
                    {t(link.key, link.label)}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-3 shrink-0">
            <CartButton />
            <AuthArea />
            <button
              className="md:hidden p-2 text-foreground"
              aria-label="Toggle menu"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </nav>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-surface px-4 py-3 flex flex-col gap-3">
          {NAV_LINKS.map((link) => {
            const isActive = isNavLinkActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={isActive ? "text-sm font-medium text-primary" : "text-sm font-normal text-foreground"}
              >
                {t(link.key, link.label)}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
