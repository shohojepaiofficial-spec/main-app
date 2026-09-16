import type { Metadata } from "next";
import { UnsubscribeView } from "@/views/UnsubscribeView";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ uid?: string; token?: string }>;
}) {
  const { uid, token } = await searchParams;
  return <UnsubscribeView uid={uid ?? null} token={token ?? null} />;
}
