/**
 * POST /api/transcribe — Whisper áudio → texto
 *
 * Body: multipart/form-data com campo "audio" (File/Blob)
 * Resposta: { text, duration_sec, language }
 *
 * Requer autenticação. Cliente upload o áudio direto (não via Supabase storage)
 * pra reduzir 1 hop; quem quiser salvar o áudio depois usa /api/briefing/save.
 */
import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/ai/whisper";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Parse multipart
    const formData = await req.formData();
    const audio = formData.get("audio");
    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json(
        { error: "Campo 'audio' obrigatório (multipart/form-data)" },
        { status: 400 }
      );
    }

    const filename =
      audio instanceof File ? audio.name : `audio-${Date.now()}.webm`;
    const result = await transcribeAudio(audio, filename);

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[/api/transcribe]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
