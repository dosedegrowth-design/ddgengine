/**
 * POST /api/briefing/refine — Claude organiza respostas brutas em RefinedBrief
 *
 * Body JSON: { raw_answers: RawAnswers }
 * Resposta: { refined: RefinedBrief }
 *
 * Não persiste — só processa. Persistência vai pelo /api/briefing/save
 * depois do usuário aprovar a versão refinada.
 */
import { NextRequest, NextResponse } from "next/server";
import { refineBriefing } from "@/lib/briefing/refine";
import { createClient } from "@/lib/supabase/server";
import type { RawAnswers } from "@/lib/briefing/questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = (await req.json()) as { raw_answers?: RawAnswers };
    if (!body.raw_answers || typeof body.raw_answers !== "object") {
      return NextResponse.json(
        { error: "Campo 'raw_answers' obrigatório (objeto)" },
        { status: 400 }
      );
    }

    const refined = await refineBriefing(body.raw_answers);
    return NextResponse.json({ refined });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[/api/briefing/refine]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
