"use server";

/**
 * Server actions do painel admin de tickets.
 *
 * Todos os mutates passam pelo gate `requireAdmin()` e usam service client
 * pra contornar RLS (o admin precisa ver tickets de TODAS as orgs).
 *
 * Audit trail vai em `metadata.events` (jsonb array) — quem mudou o quê, quando.
 */
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { sendTicketStatusEmail } from "@/lib/notifications/ticket-status-emails";

const VALID_STATUSES = [
  "open",
  "in_progress",
  "waiting_client",
  "resolved",
  "cancelled",
] as const;

type TicketStatus = (typeof VALID_STATUSES)[number];

interface TicketEvent {
  type: "status_change" | "assigned" | "note_added" | "comment";
  by: string;
  at: string;
  payload: Record<string, unknown>;
}

interface TicketMetadata {
  [key: string]: unknown;
  events?: TicketEvent[];
  notes?: string;
}

function appendEvent(
  metadata: TicketMetadata | null | undefined,
  event: Omit<TicketEvent, "at">
): TicketMetadata {
  const md: TicketMetadata = metadata ?? {};
  const events = Array.isArray(md.events) ? [...md.events] : [];
  events.push({ ...event, at: new Date().toISOString() });
  return { ...md, events };
}

export async function updateTicketStatus(ticketId: string, status: string) {
  const { user } = await requireAdmin();

  if (!VALID_STATUSES.includes(status as TicketStatus)) {
    return { error: "Status inválido" };
  }

  const admin = createServiceClient();
  const { data: current, error: fetchErr } = await admin
    .from("support_tickets")
    .select(
      "metadata, status, type, contact_email, organization_id, site_id"
    )
    .eq("id", ticketId)
    .single();

  if (fetchErr || !current) return { error: "Ticket não encontrado" };

  const previousStatus = (current.status ?? "open") as string;
  if (previousStatus === status) {
    return { success: true, skipped: true };
  }

  const metadata = appendEvent(current.metadata as TicketMetadata, {
    type: "status_change",
    by: user.email ?? user.id,
    payload: { from: previousStatus, to: status },
  });

  const patch: Record<string, unknown> = {
    status,
    metadata,
    updated_at: new Date().toISOString(),
  };

  if (status === "resolved") {
    patch.resolved_at = new Date().toISOString();
  } else if (previousStatus === "resolved" && status !== "resolved") {
    patch.resolved_at = null;
  }

  const { error } = await admin
    .from("support_tickets")
    .update(patch)
    .eq("id", ticketId);

  if (error) return { error: error.message };

  // Fire-and-forget: notifica cliente da mudança de status
  void notifyClientOnStatusChange({
    ticketId,
    ticketType: current.type as string,
    fromStatus: previousStatus,
    toStatus: status,
    contactEmail: current.contact_email as string | null,
    organizationId: current.organization_id as string,
    siteId: current.site_id as string | null,
  });

  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
  return { success: true };
}

/**
 * Carrega org + site (pra domínio) e dispara email pro cliente.
 * Roda fora do path crítico — falha de email não derruba o update.
 */
async function notifyClientOnStatusChange(args: {
  ticketId: string;
  ticketType: string;
  fromStatus: string;
  toStatus: string;
  contactEmail: string | null;
  organizationId: string;
  siteId: string | null;
}): Promise<void> {
  if (!args.contactEmail) return;
  try {
    const admin = createServiceClient();
    const [{ data: org }, { data: site }] = await Promise.all([
      admin
        .from("organizations")
        .select("name")
        .eq("id", args.organizationId)
        .maybeSingle(),
      args.siteId
        ? admin
            .from("sites")
            .select("domain")
            .eq("id", args.siteId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    await sendTicketStatusEmail({
      toEmail: args.contactEmail,
      orgName: (org?.name as string | undefined) ?? "cliente",
      ticketId: args.ticketId,
      ticketType: args.ticketType,
      fromStatus: args.fromStatus,
      toStatus: args.toStatus,
      domain: (site?.domain as string | undefined) ?? undefined,
    });
  } catch (err) {
    console.warn(
      "[admin-ticket] notify falhou:",
      err instanceof Error ? err.message : err
    );
  }
}

export async function assignTicket(ticketId: string, assigneeEmail: string) {
  const { user } = await requireAdmin();

  const target = assigneeEmail.trim();
  // empty = unassign
  const value = target.length > 0 ? target.toLowerCase() : null;

  const admin = createServiceClient();
  const { data: current, error: fetchErr } = await admin
    .from("support_tickets")
    .select("metadata, assigned_to_email")
    .eq("id", ticketId)
    .single();

  if (fetchErr || !current) return { error: "Ticket não encontrado" };

  const metadata = appendEvent(current.metadata as TicketMetadata, {
    type: "assigned",
    by: user.email ?? user.id,
    payload: {
      from: current.assigned_to_email ?? null,
      to: value,
    },
  });

  const { error } = await admin
    .from("support_tickets")
    .update({
      assigned_to_email: value,
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) return { error: error.message };

  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
  return { success: true };
}

export async function addInternalNote(ticketId: string, note: string) {
  const { user } = await requireAdmin();

  const text = note.trim();
  if (!text) return { error: "Nota vazia" };

  const admin = createServiceClient();
  const { data: current, error: fetchErr } = await admin
    .from("support_tickets")
    .select("metadata")
    .eq("id", ticketId)
    .single();

  if (fetchErr || !current) return { error: "Ticket não encontrado" };

  const metadata = appendEvent(current.metadata as TicketMetadata, {
    type: "note_added",
    by: user.email ?? user.id,
    payload: { text },
  });

  const { error } = await admin
    .from("support_tickets")
    .update({
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/tickets/${ticketId}`);
  return { success: true };
}

export async function selfAssign(ticketId: string) {
  const { user } = await requireAdmin();
  return assignTicket(ticketId, user.email ?? "");
}
