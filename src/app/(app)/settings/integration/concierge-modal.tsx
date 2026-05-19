"use client";

/**
 * Modal "Configurar pra mim" — cliente pede pra equipe DDG cuidar
 * da integração de domínio.
 *
 * Form: email + WhatsApp + mensagem opcional.
 * Submit → requestConciergeAction → ticket criado + 2 emails (time + cliente).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, MessageCircle, Loader2, ArrowRight } from "lucide-react";
import { requestConciergeAction } from "./actions";

interface Props {
  siteId: string;
  domain: string;
  defaultEmail: string;
  onClose: () => void;
}

export function ConciergeModal({ siteId, domain, defaultEmail, onClose }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email obrigatório");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      toast.error("WhatsApp inválido");
      return;
    }
    start(async () => {
      const r = await requestConciergeAction(siteId, {
        contactEmail: email.trim(),
        contactPhone: phone,
        message: message.trim() || undefined,
      });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Pedido enviado! A equipe DDG vai te chamar.");
      onClose();
      router.refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ddg-ink/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-2xl border-2 border-ddg-ink bg-ddg-paper shadow-[6px_6px_0_var(--ddg-ink)]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 md:p-6 border-b-2 border-ddg-ink">
          <div className="flex items-start gap-3 min-w-0">
            <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-ddg-lime border-2 border-ddg-ink">
              <MessageCircle className="w-5 h-5 text-ddg-ink" strokeWidth={2.5} />
            </div>
            <div>
              <div className="ddg-bracket mb-1">CONCIERGE · TIME DDG CONFIGURA</div>
              <h2 className="font-black text-lg md:text-xl text-ddg-ink leading-tight">
                Nós cuidamos da integração pra você
              </h2>
              <p className="text-xs text-ddg-muted mt-1">
                Em até 24h úteis seu blog estará em <strong>{domain}/blog</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="shrink-0 p-1.5 rounded-md border-2 border-ddg-ink hover:bg-ddg-ink hover:text-ddg-paper transition-colors disabled:opacity-40"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-4">
          <div>
            <label htmlFor="cge-email" className="ddg-bracket text-ddg-muted block mb-2">
              Email pra contato *
            </label>
            <input
              id="cge-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={pending}
              className="w-full h-11 px-3 rounded-lg border-2 border-ddg-ink bg-ddg-paper text-ddg-ink placeholder:text-ddg-muted/60 focus:bg-ddg-cream focus:outline-none text-sm disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="cge-phone" className="ddg-bracket text-ddg-muted block mb-2">
              WhatsApp *
            </label>
            <input
              id="cge-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="11999999999"
              required
              disabled={pending}
              className="w-full h-11 px-3 rounded-lg border-2 border-ddg-ink bg-ddg-paper text-ddg-ink placeholder:text-ddg-muted/60 focus:bg-ddg-cream focus:outline-none text-sm disabled:opacity-50"
            />
            <p className="text-xs text-ddg-muted mt-1.5">
              A equipe vai te chamar pra confirmar dados do registrador.
            </p>
          </div>

          <div>
            <label htmlFor="cge-msg" className="ddg-bracket text-ddg-muted block mb-2">
              Algo importante que devemos saber? (opcional)
            </label>
            <textarea
              id="cge-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: comprei o domínio na GoDaddy. Tenho email no domínio que não pode quebrar."
              disabled={pending}
              rows={3}
              className="w-full p-3 rounded-lg border-2 border-ddg-ink bg-ddg-paper text-ddg-ink placeholder:text-ddg-muted/60 focus:bg-ddg-cream focus:outline-none text-sm resize-none disabled:opacity-50"
            />
          </div>

          {/* O que esperar */}
          <div className="rounded-lg border-2 border-dashed border-ddg-stone bg-ddg-cream/40 p-4">
            <div className="ddg-bracket mb-2">PRÓXIMOS PASSOS</div>
            <ol className="text-xs text-ddg-ink space-y-1.5 list-decimal list-inside">
              <li>Você envia o pedido aqui (agora)</li>
              <li>Equipe DDG chama no WhatsApp pra confirmar acesso ao registrador</li>
              <li>Configuramos NS + verificamos propagação DNS</li>
              <li>Email "Seu blog tá no ar em {domain}/blog" 🎉</li>
            </ol>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="text-xs font-mono uppercase tracking-widest text-ddg-muted hover:text-ddg-ink transition-colors disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[3px_3px_0_var(--ddg-ink)] hover:shadow-[5px_5px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
            >
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Enviando…
                </>
              ) : (
                <>
                  Enviar pedido
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
