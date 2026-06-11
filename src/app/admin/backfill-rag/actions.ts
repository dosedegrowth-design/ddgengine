"use server";

/**
 * Backfill RAG — roda processBriefingEmbeddings nos briefings que ficaram
 * com embedding_status='pending' ou 'failed' (legado pré-fix do save).
 *
 * Acesso: requireAdmin. Usa service client pra contornar RLS.
 */
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { processBriefingEmbeddings } from "@/lib/rag/brand";

export interface BackfillResult {
  total: number;
  succeeded: Array<{ briefing_id: string; site_id: string | null; org_name: string | null }>;
  failed: Array<{ briefing_id: string; error: string }>;
  duration_ms: number;
}

export async function runBackfillRag(): Promise<
  | (BackfillResult & { error?: never })
  | { error: string }
> {
  await requireAdmin();

  const start = Date.now();
  const admin = createServiceClient();

  // Pega briefings completos que ainda não rodaram (ou falharam)
  const { data: pending, error: queryErr } = await admin
    .from("briefings")
    .select("id, site_id, organization_id, embedding_status, completion_status")
    .eq("completion_status", "completed")
    .in("embedding_status", ["pending", "failed", "processing"])
    .order("created_at", { ascending: true })
    .limit(50);

  if (queryErr) return { error: queryErr.message };

  const targets = (pending ?? []) as Array<{
    id: string;
    site_id: string | null;
    organization_id: string;
    embedding_status: string;
  }>;

  if (targets.length === 0) {
    return {
      total: 0,
      succeeded: [],
      failed: [],
      duration_ms: Date.now() - start,
    };
  }

  // Pega nomes das orgs em batch (pra UI)
  const orgIds = Array.from(new Set(targets.map((t) => t.organization_id)));
  const { data: orgs } = await admin
    .from("organizations")
    .select("id, name")
    .in("id", orgIds);
  const orgById = new Map(
    ((orgs ?? []) as Array<{ id: string; name: string }>).map((o) => [o.id, o.name])
  );

  const succeeded: BackfillResult["succeeded"] = [];
  const failed: BackfillResult["failed"] = [];

  // Sequencial pra não estourar rate limit do OpenAI embeddings
  for (const t of targets) {
    try {
      await processBriefingEmbeddings(t.id);
      succeeded.push({
        briefing_id: t.id,
        site_id: t.site_id,
        org_name: orgById.get(t.organization_id) ?? null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failed.push({ briefing_id: t.id, error: msg });
    }
  }

  revalidatePath("/admin/backfill-rag");
  return {
    total: targets.length,
    succeeded,
    failed,
    duration_ms: Date.now() - start,
  };
}

/**
 * Re-roda 1 briefing específico (botão "tentar de novo" por linha).
 */
export async function retryBriefingRag(briefingId: string) {
  await requireAdmin();

  if (!/^[0-9a-f-]{36}$/i.test(briefingId)) {
    return { error: "ID inválido" };
  }

  try {
    await processBriefingEmbeddings(briefingId);
    revalidatePath("/admin/backfill-rag");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}
