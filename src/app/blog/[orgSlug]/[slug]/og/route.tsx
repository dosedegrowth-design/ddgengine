/**
 * Open Graph image dinâmico pra cada post.
 *
 * Usado em <meta property="og:image"> e Twitter cards.
 * Gerado on-demand via @vercel/og (Next.js Image Response).
 *
 * URL: /blog/[orgSlug]/[slug]/og
 * Dimensão: 1200x630 (padrão Open Graph)
 */
import { ImageResponse } from "next/og";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgSlug: string; slug: string }> }
) {
  const { orgSlug, slug } = await params;

  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("missing service key");
    }
    const supabase = createServiceClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("slug", orgSlug)
      .maybeSingle();
    if (!org) throw new Error("org");

    const { data: sites } = await supabase.from("sites").select("id").eq("organization_id", org.id);
    const ids = ((sites ?? []) as Array<{ id: string }>).map((s) => s.id);

    const { data: post } = await supabase
      .from("posts")
      .select("title, meta_description, type")
      .in("site_id", ids)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    const title = post?.title ?? "Blog";
    const description = post?.meta_description ?? "";
    const orgName = org.name as string;
    const typeLabel = post?.type === "long_form" ? "Artigo" : "FAQ";

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
            padding: "60px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                background: "#5e6ad2",
              }}
            />
            <div style={{ fontSize: 22, color: "#a3a3a3", fontWeight: 500 }}>
              {orgName}
            </div>
            <div style={{ marginLeft: "auto", fontSize: 18, color: "#737373" }}>
              {typeLabel}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                fontSize: 64,
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                maxWidth: "1000px",
              }}
            >
              {title.length > 110 ? title.slice(0, 110) + "..." : title}
            </div>
            {description && (
              <div
                style={{
                  fontSize: 24,
                  color: "#a3a3a3",
                  maxWidth: "1000px",
                  lineHeight: 1.4,
                }}
              >
                {description.length > 150 ? description.slice(0, 150) + "..." : description}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 18,
              color: "#525252",
            }}
          >
            <div>Powered by Conteudai</div>
            <div>conteudai.com.br</div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (_err) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0a",
            color: "#ffffff",
            fontSize: 80,
            fontWeight: 700,
          }}
        >
          Conteudai
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}
