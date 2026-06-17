/**
 * POST /api/posts/hero-image — gera a imagem hero de um post (gpt-image-1) e
 * salva no Storage. Roda em ~20s (cabe nos 60s do serverless). Chamado pelo
 * n8n no fim da geração (o n8n faz o texto, a Vercel faz a imagem).
 *
 * Auth: ?key=GOOGLE_ADS_SETUP_KEY. Body: { postId }.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateHeroImage, buildVisualPromptFromTitle } from "@/lib/ai/image-gen";
import { uploadHeroImage } from "@/lib/storage/post-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!process.env.GOOGLE_ADS_SETUP_KEY || key !== process.env.GOOGLE_ADS_SETUP_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const postId = body.postId || url.searchParams.get("postId");
  if (!postId) return NextResponse.json({ error: "sem postId" }, { status: 400 });

  const sb = createServiceClient();
  const { data: post } = await sb
    .from("posts")
    .select("id, site_id, title, og_image_url, sites(vertical)")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return NextResponse.json({ error: "post não encontrado" }, { status: 404 });
  if (post.og_image_url) return NextResponse.json({ ok: true, skipped: "já tem imagem" });

  try {
    const vertical = (post.sites as { vertical?: string } | null)?.vertical ?? undefined;
    const prompt = buildVisualPromptFromTitle((post.title as string) ?? "", vertical);
    const img = await generateHeroImage({ prompt, style: "photo", size: "1536x1024" });
    const up = await uploadHeroImage({
      postId,
      siteId: post.site_id as string,
      bytes: img.bytes,
      contentType: "image/png",
    });
    await sb.from("posts").update({ og_image_url: up.url }).eq("id", postId);
    return NextResponse.json({ ok: true, url: up.url });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "erro" },
      { status: 500 }
    );
  }
}
