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
import {
  sendTicketStatusEmail,
  sendTicketStatusToTeam,
} from "@/lib/notifications/ticket-status-emails";

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
      "metadata, status, type, contact_email, contact_phone, organization_id, site_id"
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

  // Fire-and-forget: notifica cliente + time da mudança de status
  void notifyOnStatusChange({
    ticketId,
    ticketType: current.type as string,
    fromStatus: previousStatus,
    toStatus: status,
    contactEmail: current.contact_email as string | null,
    contactPhone: current.contact_phone as string | null,
    organizationId: current.organization_id as string,
    siteId: current.site_id as string | null,
    actor: user.email ?? user.id,
  });

  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
  return { success: true };
}

/**
 * Carrega contexto (org + site) e dispara em paralelo:
 *  - email curativo pro CLIENTE (quando há contact_email)
 *  - log compacto pro TIME DDG (sempre)
 * Roda fora do path crítico — falha de email não derruba o update.
 */
async function notifyOnStatusChange(args: {
  ticketId: string;
  ticketType: string;
  fromStatus: string;
  toStatus: string;
  contactEmail: string | null;
  contactPhone: string | null;
  organizationId: string;
  siteId: string | null;
  actor: string;
}): Promise<void> {
  try {
    const { orgName, domain } = await loadTicketContext(
      args.organizationId,
      args.siteId
    );

    const promises: Promise<unknown>[] = [];

    if (args.contactEmail) {
      promises.push(
        sendTicketStatusEmail({
          toEmail: args.contactEmail,
          orgName,
          ticketId: args.ticketId,
          ticketType: args.ticketType,
          fromStatus: args.fromStatus,
          toStatus: args.toStatus,
          domain,
        })
      );
    }

    promises.push(
      sendTicketStatusToTeam({
        event: "status_change",
        ticketId: args.ticketId,
        ticketType: args.ticketType,
        orgName,
        domain,
        fromStatus: args.fromStatus,
        toStatus: args.toStatus,
        actor: args.actor,
        contactEmail: args.contactEmail,
        contactPhone: args.contactPhone,
      })
    );

    await Promise.all(promises);
  } catch (err) {
    console.warn(
      "[admin-ticket] notify status falhou:",
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Carrega org.name + site.domain (quando houver) pra contextualizar emails.
 */
async function loadTicketContext(
  organizationId: string,
  siteId: string | null
): Promise<{ orgName: string; domain: string | undefined }> {
  const admin = createServiceClient();
  const [{ data: org }, { data: site }] = await Promise.all([
    admin
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .maybeSingle(),
    siteId
      ? admin.from("sites").select("domain").eq("id", siteId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    orgName: (org?.name as string | undefined) ?? "cliente",
    domain: (site?.domain as string | undefined) ?? undefined,
  };
}

export async function assignTicket(ticketId: string, assigneeEmail: string) {
  const { user } = await requireAdmin();

  const target = assigneeEmail.trim();
  // empty = unassign
  const value = target.length > 0 ? target.toLowerCase() : null;

  const admin = createServiceClient();
  const { data: current, error: fetchErr } = await admin
    .from("support_tickets")
    .select(
      "metadata, assigned_to_email, type, organization_id, site_id, contact_email, contact_phone"
    )
    .eq("id", ticketId)
    .single();

  if (fetchErr || !current) return { error: "Ticket não encontrado" };

  const previousAssignee = (current.assigned_to_email as string | null) ?? null;
  if (previousAssignee === value) {
    return { success: true, skipped: true };
  }

  const metadata = appendEvent(current.metadata as TicketMetadata, {
    type: "assigned",
    by: user.email ?? user.id,
    payload: {
      from: previousAssignee,
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

  // Fire-and-forget: log pro time DDG
  void notifyOnAssign({
    ticketId,
    ticketType: current.type as string,
    organizationId: current.organization_id as string,
    siteId: current.site_id as string | null,
    contactEmail: current.contact_email as string | null,
    contactPhone: current.contact_phone as string | null,
    fromAssignee: previousAssignee,
    toAssignee: value,
    actor: user.email ?? user.id,
  });

  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
  return { success: true };
}

async function notifyOnAssign(args: {
  ticketId: string;
  ticketType: string;
  organizationId: string;
  siteId: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  fromAssignee: string | null;
  toAssignee: string | null;
  actor: string;
}): Promise<void> {
  try {
    const { orgName, domain } = await loadTicketContext(
      args.organizationId,
      args.siteId
    );
    await sendTicketStatusToTeam({
      event: "assigned",
      ticketId: args.ticketId,
      ticketType: args.ticketType,
      orgName,
      domain,
      fromAssignee: args.fromAssignee,
      toAssignee: args.toAssignee,
      actor: args.actor,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
    });
  } catch (err) {
    console.warn(
      "[admin-ticket] notify assign falhou:",
      err instanceof Error ? err.message : err
    );
  }
}

export async function addInternalNote(ticketId: string, note: string) {
  const { user } = await requireAdmin();

  const text = note.trim();
  if (!text) return { error: "Nota vazia" };

  const admin = createServiceClient();
  const { data: current, error: fetchErr } = await admin
    .from("support_tickets")
    .select(
      "metadata, type, organization_id, site_id, contact_email, contact_phone"
    )
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

  // Fire-and-forget: log pro time DDG
  void notifyOnNote({
    ticketId,
    ticketType: current.type as string,
    organizationId: current.organization_id as string,
    siteId: current.site_id as string | null,
    contactEmail: current.contact_email as string | null,
    contactPhone: current.contact_phone as string | null,
    noteText: text,
    actor: user.email ?? user.id,
  });

  revalidatePath(`/admin/tickets/${ticketId}`);
  return { success: true };
}

async function notifyOnNote(args: {
  ticketId: string;
  ticketType: string;
  organizationId: string;
  siteId: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  noteText: string;
  actor: string;
}): Promise<void> {
  try {
    const { orgName, domain } = await loadTicketContext(
      args.organizationId,
      args.siteId
    );
    await sendTicketStatusToTeam({
      event: "note_added",
      ticketId: args.ticketId,
      ticketType: args.ticketType,
      orgName,
      domain,
      noteText: args.noteText,
      actor: args.actor,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
    });
  } catch (err) {
    console.warn(
      "[admin-ticket] notify note falhou:",
      err instanceof Error ? err.message : err
    );
  }
}

export async function selfAssign(ticketId: string) {
  const { user } = await requireAdmin();
  return assignTicket(ticketId, user.email ?? "");
}
