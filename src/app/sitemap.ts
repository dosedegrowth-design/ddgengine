import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Públicas estáticas
  const staticUrls: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), priority: 1.0 },
    { url: `${baseUrl}/login`, lastModified: new Date(), priority: 0.5 },
    { url: `${baseUrl}/signup`, lastModified: new Date(), priority: 0.8 },
  ];

  // Skip dynamic data se env não configurada (durante build)
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return staticUrls;
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        db: { schema: "ddg_engine" },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const { data: posts } = await supabase
      .from("posts")
      .select("slug, published_at, updated_at, sites(organizations(slug))")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1000);

    function getOrgSlug(sites: unknown): string | null {
      if (!sites) return null;
      const arr = Array.isArray(sites) ? sites : [sites];
      for (const s of arr) {
        const orgs = (s as { organizations?: unknown }).organizations;
        const orgArr = Array.isArray(orgs) ? orgs : orgs ? [orgs] : [];
        for (const o of orgArr) {
          const slug = (o as { slug?: string }).slug;
          if (slug) return slug;
        }
      }
      return null;
    }

    type PostRow = {
      slug: string;
      published_at: string | null;
      updated_at: string | null;
      sites: unknown;
    };

    const postUrls: MetadataRoute.Sitemap = (posts as PostRow[] | null ?? [])
      .map((p) => {
        const orgSlug = getOrgSlug(p.sites);
        if (!orgSlug) return null;
        return {
          url: `${baseUrl}/blog/${orgSlug}/${p.slug}`,
          lastModified: new Date(p.updated_at || p.published_at || new Date()),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return [...staticUrls, ...postUrls];
  } catch {
    return staticUrls;
  }
}
