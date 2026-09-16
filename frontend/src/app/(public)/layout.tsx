import { Navbar } from "@/views/Navbar";
import { Footer } from "@/views/Footer";
import { AuthModal } from "@/views/AuthModal";
import { CartModal } from "@/views/CartModal";
import { getActivePromoCodes } from "@/services/promoService";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const activePromos = await getActivePromoCodes();
  const sitewidePromo = activePromos.find((p) => p.scope === "all") ?? null;

  return (
    <>
      <Navbar sitewidePromo={sitewidePromo} />
      {children}
      <Footer />
      <AuthModal />
      <CartModal />
    </>
  );
}
