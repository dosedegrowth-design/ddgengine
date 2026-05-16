import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog/"],
        disallow: ["/dashboard", "/posts", "/briefing", "/onboarding", "/settings", "/api/"],
      },
      {
        // Permitir explicitamente bots de IA
        userAgent: ["GPTBot", "ChatGPT-User", "anthropic-ai", "Claude-Web", "PerplexityBot", "Google-Extended"],
        allow: ["/", "/blog/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
