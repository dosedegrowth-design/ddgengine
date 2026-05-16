/**
 * Webhook receiver pro WhatsApp Cloud API.
 *
 * - GET: verificação inicial (Meta valida URL com challenge)
 * - POST: recebe eventos (mensagens, status, button responses)
 *
 * Eventos importantes:
 * - Status updates (sent, delivered, read, failed)
 * - User replies (text)
 * - Quick reply button clicks (APROVAR:postId, DESCARTAR:postId)
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/whatsapp/cloud-api";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode") ?? "";
  const token = searchParams.get("hub.verify_token") ?? "";
  const challenge = searchParams.get("hub.challenge") ?? "";

  const result = verifyWebhook(mode, token, challenge);
  if (result) {
    return new NextResponse(result, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { db: { schema: "ddg_engine" }, auth: { persistSession: false } }
  );

  try {
    const entries = body?.entry ?? [];
    for (const entry of entries) {
      const changes = entry.changes ?? [];
      for (const change of changes) {
        const value = change.value ?? {};

        // 1. Status updates (sent, delivered, read, failed)
        const statuses = value.statuses ?? [];
        for (const s of statuses) {
          await supabase
            .from("whatsapp_messages")
            .update({ status: s.status })
            .eq("wa_message_id", s.id);
        }

        // 2. Mensagens recebidas
        const messages = value.messages ?? [];
        for (const msg of messages) {
          const from = msg.from;
          let responseText = "";
          let actionPayload: string | null = null;

          if (msg.type === "text") {
            responseText = msg.text?.body ?? "";
          } else if (msg.type === "button") {
            // Quick reply tem payload
            actionPayload = msg.button?.payload ?? null;
            responseText = msg.button?.text ?? "";
          } else if (msg.type === "interactive") {
            const reply = msg.interactive?.button_reply ?? msg.interactive?.list_reply;
            actionPayload = reply?.id ?? null;
            responseText = reply?.title ?? "";
          }

          // Log inbound
          await supabase.from("whatsapp_messages").insert({
            organization_id: null,
            phone: from,
            direction: "inbound",
            message_type: msg.type,
            payload: msg,
            wa_message_id: msg.id,
            user_response: responseText,
            responded_at: new Date().toISOString(),
          });

          // Processar ação se for APROVAR/DESCARTAR
          if (actionPayload) {
            await processButtonAction(supabase, actionPayload, from);
          }
        }
      }
    }
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

async function processButtonAction(
  supabase: any,
  payload: string,
  fromPhone: string
) {
  const [action, postId] = payload.split(":");
  if (!postId) return;

  if (action === "APROVAR") {
    await supabase
      .from("posts")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        approval_method: "whatsapp",
      })
      .eq("id", postId);

    // Audit log
    const { data: post } = await supabase
      .from("posts")
      .select("site_id, sites(organization_id)")
      .eq("id", postId)
      .single();
    if (post && (post as any).sites) {
      await supabase.from("audit_log").insert({
        organization_id: (post as any).sites.organization_id,
        site_id: post.site_id,
        event_type: "post_approved_whatsapp",
        event_data: { post_id: postId, phone: fromPhone },
      });
    }
  } else if (action === "DESCARTAR") {
    await supabase
      .from("posts")
      .update({ status: "archived", approval_method: "whatsapp" })
      .eq("id", postId);
  }
}
