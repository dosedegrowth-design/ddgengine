"use server";

import { revalidatePath } from "next/cache";
import { generatePost } from "@/lib/ai/generate";
import { generatePostMultiPass } from "@/lib/ai/multi-pass";
import { getCurrentSite } from "@/lib/auth";
import { dispatchPostPublished } from "@/lib/notifications/dispatcher";

export async function generatePostAction(input: {
  type: "long_form" | "faq_page";
  topic?: string;
  targetKeyword?: string;
  targetQuestion?: string;
  mode?: "single_pass" | "multi_pass";
}) {
  const { site } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  const mode = input.mode ?? "multi_pass"; // default = multi-pass (qualidade)

  try {
    const result =
      mode === "multi_pass"
        ? await generatePostMultiPass({
            siteId: site.id,
            type: input.type,
            topic: input.topic,
            targetKeyword: input.targetKeyword,
            targetQuestion: input.targetQuestion,
          })
        : await generatePost({
            siteId: site.id,
            type: input.type,
            topic: input.topic,
            targetKeyword: input.targetKeyword,
            targetQuestion: input.targetQuestion,
          });

    revalidatePath("/posts");
    revalidatePath("/dashboard");

    return { success: true, post: result };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro ao gerar post",
    };
  }
}

export async function approvePostAction(postId: string) {
  const { site, supabase, org } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  const { error } = await supabase
    .from("posts")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      approval_method: "manual_dashboard",
    })
    .eq("id", postId)
    .eq("site_id", site.id);

  if (error) return { error: error.message };

  // Fire-and-forget notification
  void dispatchPostPublished({ orgId: org.id, siteId: site.id, postId });

  revalidatePath("/posts");
  revalidatePath("/inbox");
  revalidatePath(`/posts/${postId}`);
  return { success: true };
}

export async function deletePostAction(postId: string) {
  const { site, supabase } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  // Só permite deletar posts em status NÃO publicado (falhou, draft, generating, archived)
  const { data: post } = await supabase
    .from("posts")
    .select("status")
    .eq("id", postId)
    .eq("site_id", site.id)
    .maybeSingle();
  if (!post) return { error: "Post não encontrado" };
  if (post.status === "published") {
    return { error: "Não dá pra apagar post já publicado. Arquive primeiro." };
  }

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("site_id", site.id);

  if (error) return { error: error.message };

  revalidatePath("/posts");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function rejectPostAction(postId: string) {
  const { site, supabase } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  const { error } = await supabase
    .from("posts")
    .update({ status: "archived", approval_method: "manual_dashboard" })
    .eq("id", postId)
    .eq("site_id", site.id);

  if (error) return { error: error.message };

  revalidatePath("/posts");
  revalidatePath("/inbox");
  revalidatePath(`/posts/${postId}`);
  return { success: true };
}

export async function savePostEdits(
  postId: string,
  edits: { title?: string; meta_description?: string; content_markdown?: string }
) {
  const { site, supabase } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  const update: Record<string, unknown> = {};
  if (edits.title !== undefined) update.title = edits.title;
  if (edits.meta_description !== undefined) update.meta_description = edits.meta_description;
  if (edits.content_markdown !== undefined) update.content_markdown = edits.content_markdown;

  const { error } = await supabase
    .from("posts")
    .update(update)
    .eq("id", postId)
    .eq("site_id", site.id);

  if (error) return { error: error.message };

  revalidatePath("/posts");
  revalidatePath(`/posts/${postId}`);
  return { success: true };
}
