/**
 * Upload e gerenciamento de imagens hero dos posts no Supabase Storage.
 *
 * Bucket: post-images (público)
 * Path:   {site_id}/{post_id}.png
 *
 * URL final: https://{ref}.supabase.co/storage/v1/object/public/post-images/{site_id}/{post_id}.png
 */
import { createServiceClient } from "@/lib/supabase/server";

const BUCKET = "post-images";

export interface UploadHeroResult {
  url: string;
  path: string;
}

export async function uploadHeroImage(args: {
  postId: string;
  siteId: string;
  bytes: Buffer;
  contentType?: string;
}): Promise<UploadHeroResult> {
  const supabase = createServiceClient();
  const ext = (args.contentType ?? "image/png").split("/")[1] ?? "png";
  const path = `${args.siteId}/${args.postId}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, args.bytes, {
      contentType: args.contentType ?? "image/png",
      upsert: true, // regerar imagem sobrescreve
    });

  if (error) {
    throw new Error(`Falha no upload da imagem: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    url: publicUrlData.publicUrl,
    path,
  };
}
