/**
 * Notificações WhatsApp pra fluxos do produto.
 * Cada função sabe qual template usar.
 *
 * Templates Meta (precisam ser criados e aprovados antes):
 * - ddg_post_aprovar       (utility, 3 botões: aprovar/editar/descartar)
 * - ddg_post_publicado     (utility, sem botões)
 * - ddg_relatorio_mensal   (marketing, com botão "ver relatório")
 * - ddg_marco_alcancado    (marketing, sem botões)
 * - ddg_problema_tecnico   (utility, sem botões)
 */
import { sendTemplate } from "./cloud-api";
import { createServiceClient } from "@/lib/supabase/server";
import { randomBytes, createHmac } from "crypto";

export async function notifyPostPraAprovar(args: {
  orgId: string;
  siteId: string;
  postId: string;
  phone: string;
  postTitle: string;
  postType: "long_form" | "faq_page";
  approveUrl: string;
  editUrl: string;
}) {
  const supabase = createServiceClient();

  const components = [
    {
      type: "body" as const,
      parameters: [
        { type: "text" as const, text: args.postTitle.slice(0, 60) },
        { type: "text" as const, text: args.postType === "long_form" ? "artigo longo" : "FAQ" },
      ],
    },
    {
      type: "button" as const,
      sub_type: "quick_reply" as const,
      index: 0,
      parameters: [{ type: "payload" as const, payload: `APROVAR:${args.postId}` }],
    },
    {
      type: "button" as const,
      sub_type: "url" as const,
      index: 1,
      parameters: [{ type: "text" as const, text: args.editUrl }],
    },
    {
      type: "button" as const,
      sub_type: "quick_reply" as const,
      index: 2,
      parameters: [{ type: "payload" as const, payload: `DESCARTAR:${args.postId}` }],
    },
  ];

  try {
    const { wa_message_id } = await sendTemplate({
      to: args.phone,
      templateName: "ddg_post_aprovar",
      components,
    });

    await supabase.from("whatsapp_messages").insert({
      organization_id: args.orgId,
      site_id: args.siteId,
      post_id: args.postId,
      phone: args.phone,
      direction: "outbound",
      template_name: "ddg_post_aprovar",
      message_type: "template",
      payload: { components, post_title: args.postTitle },
      wa_message_id,
      status: "sent",
    });

    return { success: true, wa_message_id };
  } catch (err) {
    await supabase.from("whatsapp_messages").insert({
      organization_id: args.orgId,
      site_id: args.siteId,
      post_id: args.postId,
      phone: args.phone,
      direction: "outbound",
      template_name: "ddg_post_aprovar",
      message_type: "template",
      payload: { components, error: err instanceof Error ? err.message : "unknown" },
      status: "failed",
    });
    throw err;
  }
}

export async function notifyPostPublicado(args: {
  orgId: string;
  siteId: string;
  postId: string;
  phone: string;
  postTitle: string;
  postUrl: string;
}) {
  const supabase = createServiceClient();

  const components = [
    {
      type: "body" as const,
      parameters: [
        { type: "text" as const, text: args.postTitle.slice(0, 60) },
        { type: "text" as const, text: args.postUrl },
      ],
    },
  ];

  const { wa_message_id } = await sendTemplate({
    to: args.phone,
    templateName: "ddg_post_publicado",
    components,
  });

  await supabase.from("whatsapp_messages").insert({
    organization_id: args.orgId,
    site_id: args.siteId,
    post_id: args.postId,
    phone: args.phone,
    direction: "outbound",
    template_name: "ddg_post_publicado",
    message_type: "template",
    wa_message_id,
    status: "sent",
  });
}

/**
 * Gera token assinado pra link de edição (sem precisar de login).
 */
export function signApprovalToken(postId: string): string {
  const secret = process.env.APPROVAL_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "fallback-secret";
  const nonce = randomBytes(8).toString("hex");
  const payload = `${postId}:${nonce}:${Date.now()}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex").slice(0, 16);
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyApprovalToken(token: string, maxAgeMs = 7 * 24 * 60 * 60 * 1000): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const [postId, nonce, ts, sig] = decoded.split(":");
    if (!postId || !sig) return null;

    const age = Date.now() - parseInt(ts, 10);
    if (age > maxAgeMs) return null;

    const secret = process.env.APPROVAL_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "fallback-secret";
    const payload = `${postId}:${nonce}:${ts}`;
    const expectedSig = createHmac("sha256", secret).update(payload).digest("hex").slice(0, 16);

    if (sig !== expectedSig) return null;
    return postId;
  } catch {
    return null;
  }
}
