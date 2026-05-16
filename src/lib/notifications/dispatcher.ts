/**
 * Dispatcher central de notificações.
 *
 * Centraliza:
 * - Verificação de preferências do usuário
 * - Quiet hours
 * - Envio em múltiplos canais (email, WhatsApp)
 * - Log em ddg_engine.notifications
 */
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import {
  emailPostPendingReview,
  emailPostPublished,
  emailMonthlyReport,
  emailAiVisibilityMilestone,
} from "@/lib/email/templates";
import { notifyPostPraAprovar, notifyPostPublicado, signApprovalToken } from "@/lib/whatsapp/notifications";

export type NotificationEvent =
  | "post_pending_review"
  | "post_published"
  | "monthly_report"
  | "ai_visibility_milestone"
  | "billing"
  | "technical_issue";

interface DispatchContext {
  orgId: string;
  siteId?: string;
  postId?: string;
  reportId?: string;
}

interface OrgWithPrefs {
  id: string;
  name: string;
  owner_user_id: string;
  contact_phone: string | null;
  contact_email_secondary: string | null;
  notification_prefs: any;
}

async function loadOrgAndOwner(orgId: string) {
  const supabase = createServiceClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();
  if (!org) return null;

  // Pega email do owner
  const { data: owner } = await supabase.auth.admin.getUserById(org.owner_user_id as string);

  return {
    org: org as unknown as OrgWithPrefs,
    ownerEmail: owner.user?.email ?? null,
    ownerName: (owner.user?.user_metadata?.name as string) || (org.name as string),
  };
}

function isQuietHour(prefs: any): boolean {
  const qh = prefs?.quiet_hours;
  if (!qh?.enabled) return false;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const cur = `${hh}:${mm}`;
  const start = qh.start ?? "22:00";
  const end = qh.end ?? "08:00";
  // Lida com janela cruzando meia-noite
  if (start < end) return cur >= start && cur < end;
  return cur >= start || cur < end;
}

async function logNotification(args: {
  organizationId: string;
  siteId?: string;
  postId?: string;
  eventType: string;
  channel: "email" | "whatsapp" | "in_app";
  status: "sent" | "failed" | "suppressed";
  recipient: string;
  subject?: string;
  externalId?: string;
  error?: string;
}) {
  const supabase = createServiceClient();
  await supabase.from("notifications").insert({
    organization_id: args.organizationId,
    site_id: args.siteId,
    post_id: args.postId,
    event_type: args.eventType,
    channel: args.channel,
    status: args.status,
    recipient: args.recipient,
    subject: args.subject,
    external_id: args.externalId,
    error: args.error,
    sent_at: args.status === "sent" ? new Date().toISOString() : null,
  });
}

// ============================================================
// Dispatch: POST PENDING REVIEW
// ============================================================
export async function dispatchPostPendingReview(ctx: DispatchContext) {
  if (!ctx.postId) return;
  const data = await loadOrgAndOwner(ctx.orgId);
  if (!data || !data.ownerEmail) return;

  const supabase = createServiceClient();
  const { data: post } = await supabase
    .from("posts")
    .select("title, type, slug, content_markdown, sites(organizations(slug))")
    .eq("id", ctx.postId)
    .single();
  if (!post) return;

  const prefs = data.org.notification_prefs ?? {};
  const eventEnabled = prefs.events?.post_pending_review !== false;
  if (!eventEnabled) return;
  if (isQuietHour(prefs)) {
    await logNotification({
      organizationId: ctx.orgId,
      postId: ctx.postId,
      eventType: "post_pending_review",
      channel: "email",
      status: "suppressed",
      recipient: data.ownerEmail,
      error: "quiet_hours",
    });
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.ddgengine.com.br";
  const token = signApprovalToken(ctx.postId);
  const approveUrl = `${appUrl}/aprovar/${token}`;
  const reviewUrl = `${appUrl}/posts/${ctx.postId}`;
  const wordCount = post.content_markdown
    ? post.content_markdown.split(/\s+/).filter(Boolean).length
    : 0;

  // ===== Email =====
  if (prefs.channels?.email !== false) {
    try {
      const template = emailPostPendingReview({
        userName: data.ownerName,
        postTitle: post.title as string,
        postType: post.type as "long_form" | "faq_page",
        wordCount,
        approveUrl,
        reviewUrl,
      });
      const result = await sendEmail({
        to: data.ownerEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
      await logNotification({
        organizationId: ctx.orgId,
        postId: ctx.postId,
        eventType: "post_pending_review",
        channel: "email",
        status: "sent",
        recipient: data.ownerEmail,
        subject: template.subject,
        externalId: result.id,
      });
    } catch (err) {
      await logNotification({
        organizationId: ctx.orgId,
        postId: ctx.postId,
        eventType: "post_pending_review",
        channel: "email",
        status: "failed",
        recipient: data.ownerEmail,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  // ===== WhatsApp =====
  if (prefs.channels?.whatsapp === true && data.org.contact_phone) {
    try {
      const result = await notifyPostPraAprovar({
        orgId: ctx.orgId,
        siteId: ctx.siteId ?? "",
        postId: ctx.postId,
        phone: data.org.contact_phone,
        postTitle: post.title as string,
        postType: post.type as "long_form" | "faq_page",
        approveUrl,
        editUrl: reviewUrl,
      });
      await logNotification({
        organizationId: ctx.orgId,
        postId: ctx.postId,
        eventType: "post_pending_review",
        channel: "whatsapp",
        status: "sent",
        recipient: data.org.contact_phone,
        externalId: result.wa_message_id,
      });
    } catch (err) {
      await logNotification({
        organizationId: ctx.orgId,
        postId: ctx.postId,
        eventType: "post_pending_review",
        channel: "whatsapp",
        status: "failed",
        recipient: data.org.contact_phone,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }
}

// ============================================================
// Dispatch: POST PUBLISHED
// ============================================================
export async function dispatchPostPublished(ctx: DispatchContext) {
  if (!ctx.postId) return;
  const data = await loadOrgAndOwner(ctx.orgId);
  if (!data || !data.ownerEmail) return;

  const supabase = createServiceClient();
  const { data: post } = await supabase
    .from("posts")
    .select("title, slug, sites(organizations(slug))")
    .eq("id", ctx.postId)
    .single();
  if (!post) return;

  const prefs = data.org.notification_prefs ?? {};
  if (prefs.events?.post_published === false) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.ddgengine.com.br";
  const orgSlug = ((post as any).sites?.organizations?.slug ?? "blog") as string;
  const postUrl = `${appUrl}/blog/${orgSlug}/${post.slug}`;

  if (prefs.channels?.email !== false) {
    try {
      const template = emailPostPublished({
        userName: data.ownerName,
        postTitle: post.title as string,
        postUrl,
      });
      const result = await sendEmail({
        to: data.ownerEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
      await logNotification({
        organizationId: ctx.orgId,
        postId: ctx.postId,
        eventType: "post_published",
        channel: "email",
        status: "sent",
        recipient: data.ownerEmail,
        subject: template.subject,
        externalId: result.id,
      });
    } catch (err) {
      await logNotification({
        organizationId: ctx.orgId,
        postId: ctx.postId,
        eventType: "post_published",
        channel: "email",
        status: "failed",
        recipient: data.ownerEmail,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  if (prefs.channels?.whatsapp === true && data.org.contact_phone) {
    try {
      await notifyPostPublicado({
        orgId: ctx.orgId,
        siteId: ctx.siteId ?? "",
        postId: ctx.postId,
        phone: data.org.contact_phone,
        postTitle: post.title as string,
        postUrl,
      });
    } catch {
      // já loga dentro da função
    }
  }
}

// ============================================================
// Dispatch: MONTHLY REPORT
// ============================================================
export async function dispatchMonthlyReport(ctx: DispatchContext & { reportId: string }) {
  const data = await loadOrgAndOwner(ctx.orgId);
  if (!data || !data.ownerEmail) return;

  const supabase = createServiceClient();
  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("id", ctx.reportId)
    .single();
  if (!report) return;

  const prefs = data.org.notification_prefs ?? {};
  if (prefs.events?.monthly_report === false) return;
  if (prefs.channels?.email === false) return;

  const start = new Date(report.period_start as string);
  const monthLabel = start.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const metrics = (report.metrics as any) ?? {};

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.ddgengine.com.br";

  try {
    const template = emailMonthlyReport({
      userName: data.ownerName,
      monthLabel,
      summary: (report.summary as string) ?? "",
      pageviews: metrics.pageviews ?? 0,
      deltaPageviews: metrics.delta_pageviews ?? 0,
      aiCitations: metrics.ai_citations ?? 0,
      postsPublished: 0, // TODO: contar pelo period
      recommendations: (report.recommendations as string[]) ?? [],
      reportUrl: `${appUrl}/metrics?report=${ctx.reportId}`,
    });
    const result = await sendEmail({
      to: data.ownerEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    await logNotification({
      organizationId: ctx.orgId,
      siteId: ctx.siteId,
      eventType: "monthly_report",
      channel: "email",
      status: "sent",
      recipient: data.ownerEmail,
      subject: template.subject,
      externalId: result.id,
    });
  } catch (err) {
    await logNotification({
      organizationId: ctx.orgId,
      siteId: ctx.siteId,
      eventType: "monthly_report",
      channel: "email",
      status: "failed",
      recipient: data.ownerEmail,
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}
