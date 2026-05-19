"use client";

import { useState } from "react";
import { Sparkles, MessageCircle } from "lucide-react";
import { ConciergeModal } from "./concierge-modal";

interface Props {
  siteId: string;
  domain: string;
  state: string;
}

export function ConciergeButton({ siteId, domain, state }: Props) {
  const [open, setOpen] = useState(false);
  const supportPhone =
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "5511989885531";

  const stateLabel: Record<string, string> = {
    preview: "ainda não comecei",
    zone_created: "preciso trocar nameservers",
    verifying: "esperando propagação DNS",
    error: "deu erro",
  };
  const waMsg = encodeURIComponent(
    `Oi! Preciso de ajuda pra conectar meu domínio ${domain}. Estado atual: ${stateLabel[state] ?? state}.`
  );
  const waUrl = `https://wa.me/${supportPhone}?text=${waMsg}`;

  return (
    <>
      <section className="rounded-2xl border-2 border-ddg-ink bg-ddg-lime/10 p-5 md:p-6">
        <div className="ddg-bracket mb-3">PREFERE QUE A GENTE FAÇA?</div>
        <h3 className="font-black text-lg md:text-xl text-ddg-ink mb-2 leading-tight">
          Nós configuramos a integração pra você
        </h3>
        <p className="text-sm text-ddg-muted leading-relaxed mb-4 max-w-xl">
          Sem precisar trocar nameserver nenhum. Você só compartilha o acesso
          do seu registrador via WhatsApp e o time DDG cuida do resto em até
          24h úteis. <strong className="text-ddg-ink">Grátis durante o beta.</strong>
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Configurar pra mim
          </button>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-ddg-ink text-ddg-ink font-medium text-sm hover:bg-ddg-ink hover:text-ddg-paper transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Só tirar uma dúvida
          </a>
        </div>
      </section>

      {open && (
        <ConciergeModal
          siteId={siteId}
          domain={domain}
          defaultEmail=""
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
