"use server";

import { revalidatePath } from "next/cache";
import { generatePost } from "@/lib/ai/generate";
import { generatePostMultiPass } from "@/lib/ai/multi-pass";
import { getCurrentSite } from "@/lib/auth";

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
  const { site, supabase } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  const { error } = await supabase
    .from("posts")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .eq("site_id", site.id);

  if (error) return { error: error.message };

  revalidatePath("/posts");
  revalidatePath(`/posts/${postId}`);
  return { success: true };
}

export async function rejectPostAction(postId: string) {
  const { site, supabase } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  const { error } = await supabase
    .from("posts")
    .update({ status: "archived" })
    .eq("id", postId)
    .eq("site_id", site.id);

  if (error) return { error: error.message };

  revalidatePath("/posts");
  revalidatePath(`/posts/${postId}`);
  return { success: true };
}
