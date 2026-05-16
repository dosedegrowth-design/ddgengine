"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { processBriefingEmbeddings } from "@/lib/rag/brand";

export type BriefingPayload = {
  business_description?: string;
  audience_type?: string;
  region?: string;
  services?: { name: string }[];
  ticket_range?: string;
  competitors?: { url: string }[];
  differentiator?: string;
  tone_formal?: number;
  tone_casual?: number;
  tone_technical?: number;
  tone_didactic?: number;
  sample_texts?: string;
  loved_words?: string[];
  forbidden_words?: string[];
  faq_questions?: { question: string }[];
  target_keywords?: string[];
  required_disclaimers?: string;
  approval_mode?: "auto" | "whatsapp" | "email";
  publish_day_of_week?: number;
  publish_hour?: number;
  completion_percent?: number;
};

export async function saveBriefing(siteId: string, data: BriefingPayload) {
  const supabase = await createClient();

  // Verifica acesso
  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("id", siteId)
    .single();

  if (!site) return { error: "Site não encontrado" };

  // Upsert briefing
  const { data: existing } = await supabase
    .from("briefings")
    .select("id")
    .eq("site_id", siteId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("briefings")
      .update(data)
      .eq("id", existing.id);
    if (error) return { error: error.message };
    return { id: existing.id };
  } else {
    const { data: created, error } = await supabase
      .from("briefings")
      .insert({ site_id: siteId, ...data })
      .select("id")
      .single();
    if (error) return { error: error.message };
    return { id: created.id };
  }
}

export async function submitBriefing(siteId: string) {
  const supabase = await createClient();

  const { data: briefing, error } = await supabase
    .from("briefings")
    .select("id, completion_percent")
    .eq("site_id", siteId)
    .maybeSingle();

  if (error || !briefing) return { error: "Briefing não encontrado" };

  // Marca como completo
  await supabase
    .from("briefings")
    .update({ completion_percent: 100, embedding_status: "pending" })
    .eq("id", briefing.id);

  // Processa embeddings em background (mas await aqui no MVP)
  try {
    const result = await processBriefingEmbeddings(briefing.id);
    revalidatePath("/briefing");
    revalidatePath("/dashboard");
    return { success: true, embeddings: result.inserted };
  } catch (err) {
    console.error("Erro ao processar embeddings:", err);
    return {
      error: err instanceof Error ? err.message : "Erro ao processar voz da marca",
    };
  }
}
