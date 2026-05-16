"use server";

import { revalidatePath } from "next/cache";
import { generatePost } from "@/lib/ai/generate";
import { getCurrentSite } from "@/lib/auth";

export async function generatePostAction(input: {
  type: "long_form" | "faq_page";
  topic?: string;
  targetKeyword?: string;
  targetQuestion?: string;
}) {
  const { site } = await getCurrentSite();
  if (!site) return { error: "Site não configurado" };

  try {
    const result = await generatePost({
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
