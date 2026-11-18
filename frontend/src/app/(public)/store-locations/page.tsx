import type { Metadata } from "next";
import { getStoreLocations } from "@/services/storeLocationService";
import { StoreLocationsView } from "@/views/StoreLocationsView";

const title = "Our Stores";
const description = "Find our store locations, addresses and photos.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: { title, description, images: ["/og-image.png"] },
};

export default async function StoreLocationsPage() {
  const locations = await getStoreLocations();

  return (
    <main className="mx-auto max-w-5xl px-6 pb-16 pt-[calc(var(--navbar-height)+2rem)]">
      <h1 className="mb-6 text-2xl font-semibold">Our Stores</h1>
      <StoreLocationsView locations={locations} />
    </main>
  );
}
