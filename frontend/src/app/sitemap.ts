import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { getProducts } from "@/services/productService";

const PUBLIC_ROUTES = [
  "",
  "/shop",
  "/categories",
  "/about",
  "/contact",
  "/shipping",
  "/returns",
  "/privacy",
  "/terms",
];

async function getAllProductIds(): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await getProducts({ page, limit: 48 });
    ids.push(...result.items.map((p) => p._id));
    totalPages = result.totalPages;
    page++;
  } while (page <= totalPages);
  return ids;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const productIds = await getAllProductIds().catch(() => []);
  const productEntries: MetadataRoute.Sitemap = productIds.map((id) => ({
    url: `${SITE_URL}/shop/${id}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...productEntries];
}
