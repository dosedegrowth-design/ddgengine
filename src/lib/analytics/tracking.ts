/**
 * Tracking de conversão centralizado.
 *
 * Integra: Meta Pixel, Google Analytics 4, PostHog, Conversion API server-side.
 * Eventos padronizados (consistentes entre client e server).
 */

export type ConversionEvent =
  | "PageView"
  | "ViewContent"
  | "Lead"          // landing → trial signup
  | "CompleteRegistration"  // signup completo
  | "StartTrial"    // trial 14d ativado
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "Subscribe"     // assinatura paga
  | "Purchase"      // upgrade
  | "Contact";

export interface TrackEventInput {
  event: ConversionEvent;
  value?: number;
  currency?: string;
  contentName?: string;
  contentCategory?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Client-side: dispara evento em todos pixels carregados.
 * Usado em components "use client".
 */
export function trackEvent(input: TrackEventInput) {
  if (typeof window === "undefined") return;

  // Meta Pixel
  if ((window as any).fbq) {
    (window as any).fbq("track", input.event, {
      value: input.value,
      currency: input.currency ?? "BRL",
      content_name: input.contentName,
      content_category: input.contentCategory,
    });
  }

  // Google Analytics 4
  if ((window as any).gtag) {
    (window as any).gtag("event", input.event.toLowerCase(), {
      value: input.value,
      currency: input.currency ?? "BRL",
      content_name: input.contentName,
      content_category: input.contentCategory,
      ...input.metadata,
    });
  }

  // PostHog
  if ((window as any).posthog) {
    (window as any).posthog.capture(input.event, {
      value: input.value,
      currency: input.currency,
      content_name: input.contentName,
      ...input.metadata,
    });
  }

  // Console log em dev
  if (process.env.NODE_ENV === "development") {
    console.log("[track]", input.event, input);
  }
}

/**
 * Server-side: usar Conversions API (Meta CAPI) pra eventos críticos
 * (Subscribe, Purchase). Quando user converte via webhook backend.
 */
export async function trackServerEvent(input: TrackEventInput & {
  email?: string;
  externalId?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  // Meta CAPI (Conversions API)
  if (process.env.META_PIXEL_ID && process.env.META_CAPI_TOKEN && input.email) {
    try {
      const hashedEmail = await sha256Hash(input.email.toLowerCase().trim());
      await fetch(
        `https://graph.facebook.com/v21.0/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_CAPI_TOKEN}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: [
              {
                event_name: input.event,
                event_time: Math.floor(Date.now() / 1000),
                action_source: "website",
                user_data: {
                  em: [hashedEmail],
                  external_id: input.externalId ? [input.externalId] : undefined,
                  client_ip_address: input.ipAddress,
                  client_user_agent: input.userAgent,
                },
                custom_data: {
                  value: input.value,
                  currency: input.currency ?? "BRL",
                  content_name: input.contentName,
                },
              },
            ],
          }),
        }
      );
    } catch (err) {
      console.error("Meta CAPI error:", err);
    }
  }

  // GA4 Measurement Protocol (server-side)
  if (process.env.GA4_MEASUREMENT_ID && process.env.GA4_API_SECRET) {
    try {
      await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA4_MEASUREMENT_ID}&api_secret=${process.env.GA4_API_SECRET}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: input.externalId ?? "anon",
            events: [
              {
                name: input.event.toLowerCase(),
                params: {
                  value: input.value,
                  currency: input.currency ?? "BRL",
                  ...input.metadata,
                },
              },
            ],
          }),
        }
      );
    } catch (err) {
      console.error("GA4 server error:", err);
    }
  }
}

async function sha256Hash(text: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(text).digest("hex");
}
