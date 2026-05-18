/**
 * /settings/integration — wizard de conexão de domínio.
 *
 * Passos:
 *  1. Confirmar domínio
 *  2. (DDG cria zona Cloudflare na conta master + mostra os 2 nameservers)
 *  3. Cliente troca nameservers no registrador
 *  4. DDG verifica propagação → cria Worker → ativo
 *
 * UI guiada com cards numerados, copy clara, tutoriais visuais.
 * Estado vem de sites.integration_state.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSite } from "@/lib/auth";
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  Copy,
  Clock,
  HelpCircle,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { IntegrationWizard } from "./wizard";

export default async function IntegrationPage() {
  const { site } = await getCurrentSite();
  if (!site) redirect("/onboarding");

  const state = (site.integration_state as string) ?? "preview";
  const nameservers = (site.cloudflare_nameservers as string[] | null) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="ddg-bracket mb-1">INTEGRAÇÃO</div>
        <h2 className="ddg-display text-2xl text-ddg-ink">
          Conecte seu domínio
        </h2>
        <p className="text-sm text-ddg-muted mt-1 max-w-xl leading-relaxed">
          Em ~10 minutos seu blog passa a aparecer em{" "}
          <strong className="text-ddg-ink">{site.domain}/blog</strong> em vez do
          nosso domínio. Acompanha os 3 passos abaixo.
        </p>
      </div>

      {/* Status atual em destaque */}
      <StatusBlock state={state} domain={site.domain ?? ""} />

      {/* Wizard interativo */}
      <IntegrationWizard
        siteId={site.id}
        domain={site.domain ?? ""}
        state={state}
        nameservers={nameservers}
      />

      {/* Suporte ao vivo */}
      <WhatsAppSupportBox domain={site.domain ?? ""} state={state} />

      {/* FAQ rápido */}
      <FAQ />
    </div>
  );
}

/**
 * Card de suporte ao vivo. Botão pré-formatado WhatsApp com domain
 * + estado atual, pra equipe DDG já chegar com contexto.
 */
function WhatsAppSupportBox({ domain, state }: { domain: string; state: string }) {
  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "5511999999999";
  const stateLabel: Record<string, string> = {
    preview: "ainda não comecei",
    zone_created: "preciso trocar nameservers",
    verifying: "esperando propagação DNS",
    error: "deu erro",
    active: "tudo ativo",
  };
  const message = encodeURIComponent(
    `Oi! Preciso de ajuda pra conectar meu domínio ${domain} no DDG Engine. Estado atual: ${stateLabel[state] ?? state}.`
  );
  const url = `https://wa.me/${supportPhone}?text=${message}`;

  return (
    <div className="rounded-2xl border-2 border-ddg-ink bg-ddg-lime/10 p-5">
      <div className="flex items-start gap-3">
        <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-ddg-lime border-2 border-ddg-ink">
          <MessageCircle className="w-5 h-5 text-ddg-ink" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm text-ddg-ink mb-0.5">
            Travou em algum passo? Chama a gente no WhatsApp
          </h3>
          <p className="text-xs text-ddg-muted leading-relaxed mb-3">
            Time DDG configura junto com você em ~15 min — gratuito em todos
            os planos enquanto estamos em beta.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ddg-ink text-ddg-paper font-bold text-sm hover:bg-ddg-graphite transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> Falar com a equipe DDG
          </a>
        </div>
      </div>
    </div>
  );
}

function StatusBlock({ state, domain }: { state: string; domain: string }) {
  if (state === "active") {
    return (
      <div className="rounded-2xl border-2 border-ddg-lime bg-ddg-lime/15 p-5 flex items-center gap-3">
        <CheckCircle2 className="w-6 h-6 text-ddg-lime-deep shrink-0" />
        <div>
          <div className="font-bold text-ddg-ink">
            Conexão ativa em {domain}/blog
          </div>
          <p className="text-sm text-ddg-muted mt-0.5">
            Seu blog está publicado no seu domínio. Posts novos aparecem
            automaticamente.
          </p>
        </div>
      </div>
    );
  }
  return null;
}

function FAQ() {
  const items: Array<{ q: string; a: string }> = [
    {
      q: "Vou perder meu site atual?",
      a: "Não. Só estamos servindo o caminho /blog do seu domínio. Tudo o que está em outros caminhos (página inicial, contato, etc) continua funcionando exatamente como está hoje.",
    },
    {
      q: "Quanto tempo demora pra ativar?",
      a: "Depois que você troca os nameservers no registrador (Registro.br, GoDaddy, etc.), a propagação DNS leva entre 10 minutos e 6 horas. A gente verifica automaticamente e te avisa.",
    },
    {
      q: "E se eu cancelar minha assinatura?",
      a: "Se você cancelar, removemos o Worker e o blog sai do ar. Seus posts ficam guardados aqui por 90 dias caso queira voltar. O resto do seu site não é afetado.",
    },
    {
      q: "Preciso saber programação?",
      a: "Não. A gente guia você passo-a-passo. O único momento técnico é trocar os 'nameservers' no painel do seu registrador de domínio — que é só copiar e colar 2 valores que damos pra você.",
    },
  ];

  return (
    <div className="rounded-2xl border-2 border-ddg-stone bg-ddg-paper p-5">
      <div className="ddg-bracket mb-3">DÚVIDAS COMUNS</div>
      <div className="space-y-1">
        {items.map((it, i) => (
          <details
            key={i}
            className="group rounded-lg border border-transparent hover:border-ddg-stone transition-colors"
          >
            <summary className="flex items-center gap-2 cursor-pointer list-none p-3 text-sm text-ddg-ink">
              <ChevronRight className="w-4 h-4 text-ddg-muted group-open:rotate-90 transition-transform" />
              <span className="font-medium">{it.q}</span>
            </summary>
            <p className="px-3 pb-3 pl-9 text-sm text-ddg-muted leading-relaxed">
              {it.a}
            </p>
          </details>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-ddg-stone">
        <Link
          href="mailto:suporte@dosedegrowth.com.br?subject=Ajuda%20com%20integração%20de%20domínio"
          className="inline-flex items-center gap-1.5 text-sm text-ddg-ink hover:text-ddg-lime-deep transition-colors"
        >
          <HelpCircle className="w-4 h-4" /> Travou? Fala com a gente direto
        </Link>
      </div>
    </div>
  );
}
