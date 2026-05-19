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
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  MessageCircle,
  Clock,
} from "lucide-react";
import { IntegrationWizard } from "./wizard";
import { ConciergeButton } from "./concierge-button";

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

      {/* Wizard interativo — escondido se cliente pediu concierge */}
      {state !== "concierge_requested" && (
        <IntegrationWizard
          siteId={site.id}
          domain={site.domain ?? ""}
          state={state}
          nameservers={nameservers}
        />
      )}

      {/* Concierge: oferece "configurar pra mim" quando ainda não pediu.
          Quando já pediu, mostra status do ticket. */}
      <ConciergeOrStatusSection
        siteId={site.id}
        domain={site.domain ?? ""}
        state={state}
      />

      {/* FAQ rápido */}
      <FAQ />
    </div>
  );
}

function ConciergeOrStatusSection({
  siteId,
  domain,
  state,
}: {
  siteId: string;
  domain: string;
  state: string;
}) {
  const supportPhone =
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "5511999999999";

  // Cliente já pediu concierge — mostra status
  if (state === "concierge_requested") {
    const waMsg = encodeURIComponent(
      `Oi! Pedi pra equipe DDG configurar a integração de ${domain}. Algum status?`
    );
    const waUrl = `https://wa.me/${supportPhone}?text=${waMsg}`;
    return (
      <div className="rounded-2xl border-2 border-ddg-ink bg-ddg-lime/15 p-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-ddg-lime border-2 border-ddg-ink">
            <Clock className="w-5 h-5 text-ddg-ink" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-base text-ddg-ink mb-0.5">
              Equipe DDG está configurando pra você
            </h3>
            <p className="text-sm text-ddg-muted leading-relaxed mb-3">
              Recebemos seu pedido. Prazo: <strong className="text-ddg-ink">24h úteis</strong>.
              Você vai receber um email quando o blog estiver no ar em{" "}
              <strong className="text-ddg-ink">{domain}/blog</strong>.
            </p>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-ddg-ink text-ddg-ink font-medium text-sm hover:bg-ddg-ink hover:text-ddg-paper transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> Falar com a equipe no WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Active — não precisa mostrar nada
  if (state === "active") return null;

  // Estados onde faz sentido oferecer ajuda (preview/zone_created/verifying/error)
  return <ConciergeButton siteId={siteId} domain={domain} state={state} />;
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
