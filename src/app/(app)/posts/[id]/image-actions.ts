"use server";

/**
 * Upload manual de imagem hero pelo cliente.
 *
 * Validações:
 * - Tipos: image/webp, image/png, image/jpeg
 * - Tamanho: max 10MB
 * - Post precisa pertencer ao site do user (auth via getCurrentSite)
 *
 * Substitui qualquer og_image_url anterior (upsert no bucket).
 */
import { revalidatePath } from "next/cache";
import { getCurrentSite } from "@/lib/auth";
import { uploadHeroImage } from "@/lib/storage/post-images";

const ALLOWED_TYPES = new Set(["image/webp", "image/png", "image/jpeg", "image/jpg"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export async function uploadCustomHeroImage(
  postId: string,
  formData: FormData
): Promise<{ success: true; url: string } | { error: string }> {
  const { site, supabase } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  // Confere que o post pertence ao site do user
  const { data: post } = await supabase
    .from("posts")
    .select("id, status")
    .eq("id", postId)
    .eq("site_id", site.id)
    .maybeSingle();
  if (!post) return { error: "Post não encontrado" };

  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) {
    return { error: "Selecione uma imagem" };
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Formato inválido. Use JPG, PNG ou WEBP." };
  }

  if (file.size > MAX_BYTES) {
    return { error: "Imagem muito grande. Máximo 10MB." };
  }

  let buffer: Buffer;
  try {
    const arrayBuf = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuf);
  } catch {
    return { error: "Falha ao ler o arquivo. Tente novamente." };
  }

  try {
    const uploaded = await uploadHeroImage({
      postId,
      siteId: site.id,
      bytes: buffer,
      contentType: file.type,
    });

    const { error: updErr } = await supabase
      .from("posts")
      .update({ og_image_url: uploaded.url })
      .eq("id", postId);
    if (updErr) return { error: updErr.message };

    revalidatePath(`/posts/${postId}`);
    revalidatePath("/posts");
    revalidatePath("/dashboard");

    return { success: true, url: uploaded.url };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Erro ao salvar imagem. Tente novamente.",
    };
  }
}
