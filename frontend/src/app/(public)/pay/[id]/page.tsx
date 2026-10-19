import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSharedCart } from "@/services/sharedCartService";
import { PaySharedCartView } from "@/views/PaySharedCartView";

export const metadata: Metadata = {
  title: "Pay for an order",
  robots: { index: false, follow: false },
};

// Reads the link fresh on every visit (searchParams makes it dynamic), so
// "already paid" shows right after bKash sends the payer back with ?status=.
export default async function PaySharedCartPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ id }, { status }] = await Promise.all([params, searchParams]);
  const sharedCart = await getSharedCart(id);
  if (!sharedCart) notFound();

  return <PaySharedCartView sharedCart={sharedCart} result={status} />;
}
