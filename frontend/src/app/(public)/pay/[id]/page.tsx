import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSharedCart } from "@/services/sharedCartService";
import { PaySharedCartView } from "@/views/PaySharedCartView";

export const metadata: Metadata = {
  title: "Pay for an order",
  robots: { index: false, follow: false },
};

export default async function PaySharedCartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sharedCart = await getSharedCart(id);
  if (!sharedCart) notFound();

  return <PaySharedCartView sharedCart={sharedCart} />;
}
