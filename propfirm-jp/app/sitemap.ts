import type { MetadataRoute } from "next";
import { getFirms } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const firms = await getFirms();
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/simulator`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/changes`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    ...firms.map((f) => ({
      url: `${SITE_URL}/firms/${f.slug}`,
      lastModified: f.lastVerifiedAt ? new Date(f.lastVerifiedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/disclosure`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
