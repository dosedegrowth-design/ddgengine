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
import { AlertCircle, ArrowRight, Clock, Globe } from "lucide-react";

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

  if (state === "zone_created" || state === "verifying") {
    return (
      <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-blue-900">
              {state === "zone_created"
                ? "Aguardando você trocar os nameservers"
                : "Verificando propagação DNS…"}
            </div>
            <p className="text-sm text-blue-800 mt-1 leading-relaxed">
              {state === "zone_created"
                ? `Finaliza o passo 2 no seu registrador de domínio pra ativar ${domain}/blog`
                : `Estamos checando se o DNS de ${domain} já propagou. Pode levar até 6h.`}
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
            <strong>{domain}/blog</strong> — leva ~10min e a gente te guia passo-a-passo.
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
