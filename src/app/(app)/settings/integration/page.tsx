/**
 * /settings/integration — wizard de conexão de domínio (subdomínio + CNAME).
 *
 * Passos:
 *  1. Iniciar (registra blog.{dominio} na Vercel + emite SSL)
 *  2. Cliente adiciona 1 registro CNAME no registrador
 *  3. Verifica propagação → ativo
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

const CNAME_TARGET = process.env.BLOG_CNAME_TARGET ?? "cname.conteudai.com.br";

export default async function IntegrationPage() {
  const { site } = await getCurrentSite();
  if (!site) redirect("/onboarding");

  const state = (site.integration_state as string) ?? "preview";
  const apex = (site.domain as string | null)?.replace(/^www\./, "") ?? "";
  const cnameName = (site.subdomain as string | null) ?? "blog";
  const blogHost = (site.blog_host as string | null) ?? `${cnameName}.${apex}`;
  const cnameTarget = (site.cname_target as string | null) ?? CNAME_TARGET;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="ddg-bracket mb-1">INTEGRAÇÃO</div>
        <h2 className="ddg-display text-2xl text-ddg-ink">
          Conecte seu domínio
        </h2>
        <p className="text-sm text-ddg-muted mt-1 max-w-xl leading-relaxed">
          Em ~5 minutos seu blog fica no ar em{" "}
          <strong className="text-ddg-ink">{blogHost}</strong>. Você só adiciona{" "}
          <strong className="text-ddg-ink">1 registro CNAME</strong> — sem trocar
          nameserver, sem tocar no seu site.
        </p>
      </div>

      {/* Status atual em destaque */}
      <StatusBlock state={state} blogHost={blogHost} />

      {/* Wizard interativo — escondido se cliente pediu concierge */}
      {state !== "concierge_requested" && (
        <IntegrationWizard
          siteId={site.id}
          domain={apex}
          state={state}
          blogHost={blogHost}
          cnameName={cnameName}
          cnameTarget={cnameTarget}
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
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "5511989885531";

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
              <strong className="text-ddg-ink">blog.{domain}</strong>.
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

function StatusBlock({ state, blogHost }: { state: string; blogHost: string }) {
  if (state === "active") {
    return (
      <div className="rounded-2xl border-2 border-ddg-lime bg-ddg-lime/15 p-5 flex items-center gap-3">
        <CheckCircle2 className="w-6 h-6 text-ddg-lime-deep shrink-0" />
        <div>
          <div className="font-bold text-ddg-ink">
            Conexão ativa em {blogHost}
          </div>
          <p className="text-sm text-ddg-muted mt-0.5">
            Seu blog está no ar no seu domínio. Posts novos aparecem
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
      a: "Não. Seu blog fica num subdomínio separado (blog.seusite.com.br). Você só adiciona 1 registro CNAME — o site principal, o www e o seu email continuam funcionando exatamente como estão.",
    },
    {
      q: "Quanto tempo demora pra ativar?",
      a: "Depois que você adiciona o CNAME no seu registrador (Registro.br, Hostinger, GoDaddy, etc.), a propagação leva geralmente de 5 a 30 minutos. A gente verifica automaticamente e te avisa por email.",
    },
    {
      q: "Isso afeta meu email?",
      a: "Não. Adicionar um CNAME pro subdomínio 'blog' não toca nos registros MX do seu email. Tudo continua igual — a gente só ADICIONA um endereço novo, nunca substitui nada.",
    },
    {
      q: "E se eu cancelar minha assinatura?",
      a: "Se você cancelar, o blog sai do ar e você pode remover o CNAME quando quiser. Seus posts ficam guardados aqui por 90 dias caso queira voltar. O resto do seu site não é afetado.",
    },
    {
      q: "Preciso saber programação?",
      a: "Não. A gente guia você passo-a-passo. O único momento técnico é adicionar 1 registro CNAME no painel do seu registrador — que é só copiar e colar 2 valores que damos pra você.",
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
