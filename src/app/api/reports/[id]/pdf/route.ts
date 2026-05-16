/**
 * GET /api/reports/[id]/pdf — renderiza HTML pra impressão/PDF.
 *
 * Auth: usuário logado da org dona do report.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderReportHtml } from "@/lib/reports/pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Verifica acesso (RLS já garante org_id, mas double-check)
  const { data: report } = await supabase
    .from("reports")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!report) {
    return NextResponse.json({ error: "Report não encontrado" }, { status: 404 });
  }

  try {
    const html = await renderReportHtml(id);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao renderizar" },
      { status: 500 }
    );
  }
}
