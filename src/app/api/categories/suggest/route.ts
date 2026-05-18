/**
 * POST /api/categories/suggest
 *
 * Chama suggestCategories(refined_brief) e retorna 5 categorias.
 * Usado pelo step de categorias no onboarding.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestCategories } from "@/lib/blog/suggest-categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("org_memberships")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    if (!membership) {
      return NextResponse.json({ error: "Sem organização" }, { status: 400 });
    }

    const { data: briefing } = await supabase
      .from("briefings")
      .select("refined_brief")
      .eq("organization_id", membership.organization_id)
      .maybeSingle();

    const brief = briefing?.refined_brief ?? {};
    const categories = await suggestCategories(brief as Record<string, unknown>);

    return NextResponse.json({ categories });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao sugerir categorias";
    console.error("[/api/categories/suggest]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
