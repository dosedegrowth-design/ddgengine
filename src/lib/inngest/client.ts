/**
 * Inngest client — orquestrador de jobs durables.
 *
 * Eventos:
 * - ddg/visibility.run         — dispara tracking semanal pra 1 site
 * - ddg/visibility.run-all     — fanout pra todos sites ativos
 * - ddg/worker.deploy          — deploy de Worker Cloudflare
 * - ddg/worker.healthcheck-all — verifica saúde dos Workers
 * - ddg/metrics.sync           — sync GSC + GA4 pra 1 site
 * - ddg/metrics.sync-all       — fanout
 * - ddg/report.monthly         — gera relatório mensal
 * - ddg/report.monthly-all     — fanout
 * - ddg/post.generate          — geração assíncrona de post
 * - ddg/briefing.embed         — processa embeddings do briefing
 */
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "ddg-engine",
});

export type DDGEvent =
  | { name: "ddg/visibility.run"; data: { site_id: string } }
  | { name: "ddg/visibility.run-all"; data: { trigger: string } }
  | { name: "ddg/worker.deploy"; data: { site_id: string } }
  | { name: "ddg/worker.healthcheck-all"; data: { trigger: string } }
  | { name: "ddg/metrics.sync"; data: { site_id: string; period_days?: number } }
  | { name: "ddg/metrics.sync-all"; data: { trigger: string } }
  | { name: "ddg/report.monthly"; data: { site_id: string; period_start: string } }
  | { name: "ddg/report.monthly-all"; data: { trigger: string } }
  | {
      name: "ddg/post.generate";
      data: {
        site_id: string;
        type: "long_form" | "faq_page";
        topic?: string;
        target_keyword?: string;
        target_question?: string;
        mode?: "single_pass" | "multi_pass";
      };
    }
  | { name: "ddg/briefing.embed"; data: { briefing_id: string } };

/**
 * Helper tipado pra disparar eventos.
 */
export async function emit(event: DDGEvent) {
  return inngest.send(event);
}
