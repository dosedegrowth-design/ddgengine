"use server";

import { getCurrentSite } from "@/lib/auth";
import {
  generateNewsletter,
  generateLinkedInPost,
  generateTwitterThread,
  generateInstagramCarousel,
  generateLeadMagnet,
  translatePost,
} from "@/lib/ai/repurpose";

type Format = "newsletter" | "linkedin" | "twitter" | "instagram" | "lead_magnet" | "en" | "es";

export async function repurposeAction(args: { postId: string; format: Format }) {
  const { site, supabase } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  // Verifica acesso
  const { data: post } = await supabase
    .from("posts")
    .select("id")
    .eq("id", args.postId)
    .eq("site_id", site.id)
    .maybeSingle();
  if (!post) return { error: "Post não encontrado" };

  try {
    switch (args.format) {
      case "newsletter":
        return await generateNewsletter(args.postId);
      case "linkedin":
        return await generateLinkedInPost(args.postId);
      case "twitter":
        return await generateTwitterThread(args.postId);
      case "instagram":
        return await generateInstagramCarousel(args.postId);
      case "lead_magnet":
        return await generateLeadMagnet(args.postId);
      case "en":
      case "es":
        return await translatePost(args.postId, args.format);
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao gerar" };
  }
}
