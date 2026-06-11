/**
 * Banner que aparece no topo do dashboard enquanto o cliente ainda
 * não ativou a integração de domínio.
 *
 * Estados visuais:
 *   preview       → amarelo "modo preview · conecte seu domínio"
 *   zone_created  → azul "DNS aguardando troca de nameservers"
 *   verifying     → azul "verificando propagação DNS"
 *   error         → vermelho "erro na integração — abrir suporte"
 *   active        → não renderiza nada
 */
import Link from "next/link";
import { AlertCircle, ArrowRight, Clock, Globe, Sparkles } from "lucide-react";

interface Props {
  state: string;
  domain: string;
}

export function IntegrationBanner({ state, domain }: Props) {
  if (state === "active") return null;

  if (state === "error") {
    return (
      <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-red-900">
              Erro na integração do seu site
            </div>
            <p className="text-sm text-red-800 mt-1 leading-relaxed">
              A conexão com {domain} encontrou um problema. Veja os detalhes e retome o setup.
            </p>
          </div>
        </div>
        <Link
          href="/settings/integration"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900 text-white text-sm font-bold hover:bg-red-950 transition-colors"
        >
          Ver detalhes
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (state === "concierge_requested") {
    return (
      <div className="rounded-2xl border-2 border-ddg-lime bg-ddg-lime/15 p-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-ddg-lime-deep shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-ddg-ink">
              Equipe DDG configurando seu blog
            </div>
            <p className="text-sm text-ddg-muted mt-1 leading-relaxed">
              Recebemos seu pedido pra integrar {domain}. Prazo: 24h úteis.
              Você vai receber um email quando estiver no ar.
            </p>
          </div>
        </div>
        <Link
          href="/settings/integration"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-ddg-ink text-ddg-ink text-sm font-bold hover:bg-ddg-ink hover:text-ddg-paper transition-colors"
        >
          Ver status
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (state === "cname_pending" || state === "verifying") {
    return (
      <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-blue-900">
              {state === "cname_pending"
                ? "Aguardando você adicionar o CNAME"
                : "Verificando o CNAME…"}
            </div>
            <p className="text-sm text-blue-800 mt-1 leading-relaxed">
              {state === "cname_pending"
                ? `Finaliza o passo 2 no seu registrador pra ativar blog.${domain}`
                : `Estamos checando se o CNAME de blog.${domain} já propagou. Geralmente leva de 5 a 30 min.`}
            </p>
          </div>
        </div>
        <Link
          href="/settings/integration"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 text-white text-sm font-bold hover:bg-blue-950 transition-colors"
        >
          Continuar setup
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // preview (default)
  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <Globe className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-sm text-amber-900">
            Seu blog está em modo preview
          </div>
          <p className="text-sm text-amber-800 mt-1 leading-relaxed">
            Tudo funciona, mas no nosso domínio. Conecta {domain} pra publicar em{" "}
            <strong>blog.{domain}</strong> — leva ~5min (1 registro CNAME) e a gente te guia.
          </p>
        </div>
      </div>
      <Link
        href="/settings/integration"
        className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all"
      >
        Conectar agora
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
