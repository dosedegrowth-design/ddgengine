"use server";

/**
 * Server actions PÚBLICAS do ticket — sem auth.
 *
 * Cliente acessa via UUID do ticket (RFC 4122 v4 = ~122 bits, unguessable).
 * Pode ler status + histórico (sem notas internas) e adicionar comentário.
 */
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { sendClientCommentToTeam } from "@/lib/notifications/ticket-status-emails";

interface TicketEvent {
  type: "status_change" | "assigned" | "note_added" | "client_comment";
  by: string;
  at: string;
  payload: Record<string, unknown>;
}

interface TicketMetadata {
  [key: string]: unknown;
  events?: TicketEvent[];
}

const MAX_COMMENT_LENGTH = 2000;

export async function addClientComment(ticketId: string, comment: string) {
  const text = comment.trim();
  if (!text) return { error: "Comentário vazio" };
  if (text.length > MAX_COMMENT_LENGTH) {
    return { error: `Comentário muito longo (máx ${MAX_COMMENT_LENGTH} caracteres)` };
  }

  // UUID validation (evita query com strings malformadas)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId)) {
    return { error: "Ticket inválido" };
  }

  const admin = createServiceClient();
  const { data: current, error: fetchErr } = await admin
    .from("support_tickets")
    .select(
      "metadata, type, status, contact_email, contact_phone, organization_id, site_id"
    )
    .eq("id", ticketId)
    .maybeSingle();

  if (fetchErr || !current) return { error: "Ticket não encontrado" };

  // Tickets fechados não aceitam novo comentário
  if (current.status === "resolved" || current.status === "cancelled") {
    return {
      error: "Esse ticket já foi finalizado. Se precisar de algo, abre um novo pedido.",
    };
  }

  const metadata = current.metadata as TicketMetadata | null;
  const events = Array.isArray(metadata?.events) ? [...(metadata?.events ?? [])] : [];
  events.push({
    type: "client_comment",
    by: (current.contact_email as string | null) ?? "cliente",
    at: new Date().toISOString(),
    payload: { text },
  });

  const { error } = await admin
    .from("support_tickets")
    .update({
      metadata: { ...(metadata ?? {}), events },
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) return { error: error.message };

  // Notifica time DDG fire-and-forget
  void (async () => {
    try {
      const [{ data: org }, { data: site }] = await Promise.all([
        admin
          .from("organizations")
          .select("name")
          .eq("id", current.organization_id)
          .maybeSingle(),
        current.site_id
          ? admin
              .from("sites")
              .select("domain")
              .eq("id", current.site_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      await sendClientCommentToTeam({
        ticketId,
        ticketType: current.type as string,
        orgName: (org?.name as string | undefined) ?? "cliente",
        domain: (site?.domain as string | undefined) ?? undefined,
        contactEmail: current.contact_email as string | null,
        contactPhone: current.contact_phone as string | null,
        commentText: text,
      });
    } catch (err) {
      console.warn(
        "[public-ticket] notify comment falhou:",
        err instanceof Error ? err.message : err
      );
    }
  })();

  revalidatePath(`/tickets/${ticketId}`);
  return { success: true };
}
