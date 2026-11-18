import { Navbar } from "@/views/Navbar";
import { Footer } from "@/views/Footer";
import { AuthModal } from "@/views/AuthModal";
import { CartModal } from "@/views/CartModal";
import { getActivePromoCodes } from "@/services/promoService";
import { getPublicPopup } from "@/services/popupService";
import { getSocialLinks, getContactInfo } from "@/services/siteSettingsService";
import { SitePopup } from "@/views/SitePopup";

// Our API calls go through axios, which Next can't see, so any page here
// without a request-time API (the homepage, /categories, ...) was prerendered
// once at build time and kept showing deploy-day products, banners and promos
// until the next deploy. Re-rendering at most once a minute keeps those pages
// static (fast, crawlable) while admin changes show up within ~60 seconds.
// The lowest value in a route wins, so this covers every page under this layout.
export const revalidate = 60;

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [activePromos, popup, social, contact] = await Promise.all([
    getActivePromoCodes(), getPublicPopup(), getSocialLinks(), getContactInfo(),
  ]);
  const sitewidePromo = activePromos.find((p) => p.scope === "all") ?? null;

  return (
    <>
      <Navbar sitewidePromo={sitewidePromo} social={social} contact={contact} />
      {children}
      <Footer social={social} contact={contact} />
      <AuthModal />
      <CartModal />
      <SitePopup popup={popup} />
    </>
  );
}
