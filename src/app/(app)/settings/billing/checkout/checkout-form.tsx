"use client";

/**
 * Form de checkout DDG-styled.
 *
 * Sem shadcn — usa só native inputs + Tailwind com tokens DDG (ddg-ink, lime,
 * stone, brutalist shadow). Mantém toda a lógica original: PIX vs Cartão,
 * dados do cartão condicionais, cupom validation, submit via server action.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CreditCard,
  Loader2,
  QrCode,
  Receipt,
  Sparkles,
  Tag,
} from "lucide-react";
import { startCheckout, validateCouponAction } from "./actions";

interface Props {
  orgId: string;
  userEmail: string;
  userName: string;
  plan: string;
  cycle: "monthly" | "annual";
  value: number;
}

const INPUT_CLS =
  "w-full text-sm bg-ddg-paper border-2 border-ddg-stone rounded-lg px-3 py-2.5 outline-none focus:border-ddg-ink transition-colors placeholder:text-ddg-muted/70 disabled:opacity-50";
const LABEL_CLS =
  "block text-[10px] font-mono uppercase tracking-widest text-ddg-muted mb-1.5";

function formatBRL(v: number): string {
  return v.toFixed(2).replace(".", ",");
}

export function CheckoutForm({
  orgId,
  userEmail,
  userName,
  plan,
  cycle,
  value,
}: Props) {
  const router = useRouter();
  const [method, setMethod] = useState<"PIX" | "CREDIT_CARD">("PIX");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [card, setCard] = useState({
    number: "",
    holder: "",
    expiry: "",
    ccv: "",
  });
  const [postalCode, setPostalCode] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [coupon, setCoupon] = useState("");
  const [couponState, setCouponState] = useState<{
    valid: boolean;
    discount?: number;
    finalValue?: number;
    message?: string;
  } | null>(null);
  const [pending, start] = useTransition();

  const finalValue = couponState?.finalValue ?? value;

  function handle(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const result = await startCheckout({
        orgId,
        plan,
        cycle,
        value,
        method,
        cpfCnpj: cpf,
        mobilePhone: phone,
        creditCard:
          method === "CREDIT_CARD"
            ? {
                holderName: card.holder,
                number: card.number,
                expiryMonth: card.expiry.split("/")[0]?.trim() ?? "",
                expiryYear: card.expiry.split("/")[1]?.trim() ?? "",
                ccv: card.ccv,
              }
            : undefined,
        creditCardHolderInfo:
          method === "CREDIT_CARD"
            ? {
                name: userName,
                email: userEmail,
                cpfCnpj: cpf,
                postalCode,
                addressNumber,
                phone,
              }
            : undefined,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Assinatura criada!");
      router.push("/settings/billing");
      router.refresh();
    });
  }

  function applyCoupon() {
    start(async () => {
      const r = await validateCouponAction({
        code: coupon,
        plan,
        baseValue: value,
      });
      if (!r.valid) {
        toast.error(r.reason ?? "Cupom inválido");
        setCouponState(null);
      } else {
        setCouponState({
          valid: true,
          discount: r.discount ?? 0,
          finalValue: r.finalValue ?? value,
          message: r.coupon?.description ?? "Cupom aplicado",
        });
        toast.success("Cupom aplicado");
      }
    });
  }

  return (
    <form onSubmit={handle} className="space-y-7">
      {/* ── Método de pagamento ── */}
      <fieldset className="space-y-3">
        <legend className={LABEL_CLS}>Método de pagamento</legend>
        <div className="grid grid-cols-2 gap-2">
          <MethodCard
            active={method === "PIX"}
            icon={QrCode}
            title="PIX recorrente"
            sub="Cobrança automática via PIX"
            disabled={pending}
            onClick={() => setMethod("PIX")}
          />
          <MethodCard
            active={method === "CREDIT_CARD"}
            icon={CreditCard}
            title="Cartão de crédito"
            sub="Cobrança automática no cartão"
            disabled={pending}
            onClick={() => setMethod("CREDIT_CARD")}
          />
        </div>
      </fieldset>

      {/* ── Identificação ── */}
      <fieldset className="space-y-3">
        <legend className={LABEL_CLS}>Identificação</legend>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="cpf" className={LABEL_CLS}>
              CPF / CNPJ
            </label>
            <input
              id="cpf"
              type="text"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              required
              disabled={pending}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label htmlFor="phone" className={LABEL_CLS}>
              WhatsApp / Telefone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              required
              disabled={pending}
              className={INPUT_CLS}
            />
          </div>
        </div>
        <p className="text-xs text-ddg-muted">
          Usado pra emitir nota fiscal e contato em caso de cobrança falhar.
        </p>
      </fieldset>

      {/* ── Cartão (condicional) ── */}
      {method === "CREDIT_CARD" && (
        <fieldset className="space-y-3 rounded-xl border-2 border-ddg-stone bg-ddg-cream/30 p-4">
          <legend className={LABEL_CLS + " px-1"}>Dados do cartão</legend>
          <input
            type="text"
            placeholder="Número do cartão"
            value={card.number}
            onChange={(e) => setCard({ ...card, number: e.target.value })}
            required
            disabled={pending}
            autoComplete="cc-number"
            className={INPUT_CLS}
          />
          <input
            type="text"
            placeholder="Nome impresso no cartão"
            value={card.holder}
            onChange={(e) => setCard({ ...card, holder: e.target.value })}
            required
            disabled={pending}
            autoComplete="cc-name"
            className={INPUT_CLS}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="MM/AAAA"
              value={card.expiry}
              onChange={(e) => setCard({ ...card, expiry: e.target.value })}
              required
              disabled={pending}
              autoComplete="cc-exp"
              className={INPUT_CLS}
            />
            <input
              type="text"
              placeholder="CCV"
              value={card.ccv}
              onChange={(e) => setCard({ ...card, ccv: e.target.value })}
              required
              disabled={pending}
              autoComplete="cc-csc"
              className={INPUT_CLS}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-ddg-stone">
            <input
              type="text"
              placeholder="CEP"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              required
              disabled={pending}
              className={INPUT_CLS}
            />
            <input
              type="text"
              placeholder="Número"
              value={addressNumber}
              onChange={(e) => setAddressNumber(e.target.value)}
              required
              disabled={pending}
              className={INPUT_CLS}
            />
          </div>
        </fieldset>
      )}

      {/* ── Cupom ── */}
      <fieldset className="space-y-2">
        <label htmlFor="coupon" className={LABEL_CLS}>
          Cupom de desconto (opcional)
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ddg-muted pointer-events-none" />
            <input
              id="coupon"
              type="text"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              placeholder="BEMVINDO30"
              disabled={pending}
              className={INPUT_CLS + " pl-9"}
            />
          </div>
          <button
            type="button"
            onClick={applyCoupon}
            disabled={pending || !coupon.trim()}
            className="px-4 py-2.5 rounded-lg border-2 border-ddg-ink text-ddg-ink font-bold text-xs uppercase tracking-widest hover:bg-ddg-ink hover:text-ddg-paper transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Aplicar
          </button>
        </div>
        {couponState?.valid && (
          <div className="rounded-lg border-2 border-ddg-lime bg-ddg-lime/10 p-3 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-ddg-lime-deep shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-ddg-ink">
                {couponState.message}
              </div>
              <div className="text-xs text-ddg-muted mt-0.5">
                Desconto: −R$ {formatBRL(couponState.discount ?? 0)} · Total: R$
                <strong className="text-ddg-ink">
                  {" "}
                  {formatBRL(couponState.finalValue ?? value)}
                </strong>
              </div>
            </div>
          </div>
        )}
      </fieldset>

      {/* ── Summary inline (visível em mobile, redundante em desktop) ── */}
      <div className="lg:hidden rounded-xl border-2 border-ddg-ink bg-ddg-cream/40 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-ddg-muted">
          <Receipt className="w-4 h-4" />
          <span className="text-[10px] font-mono uppercase tracking-widest">
            Total
          </span>
        </div>
        <div className="text-xl font-black text-ddg-ink">
          R$ {formatBRL(finalValue)}
          <span className="text-[10px] font-mono text-ddg-muted ml-1">
            /{cycle === "annual" ? "ano" : "mês"}
          </span>
        </div>
      </div>

      {/* ── CTA ── */}
      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg bg-ddg-lime text-ddg-ink font-black text-base border-2 border-ddg-ink shadow-[4px_4px_0_var(--ddg-ink)] hover:shadow-[6px_6px_0_var(--ddg-ink)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processando…
          </>
        ) : method === "PIX" ? (
          <>
            <QrCode className="w-4 h-4" />
            Pagar R$ {formatBRL(finalValue)} via PIX
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            Assinar — R$ {formatBRL(finalValue)}/
            {cycle === "annual" ? "ano" : "mês"}
          </>
        )}
      </button>

      <p className="text-[11px] text-ddg-muted text-center leading-relaxed">
        Cobrança processada via <strong className="text-ddg-ink">Asaas</strong>{" "}
        (regulamentado pelo BCB). Cancele quando quiser pelo painel.
      </p>
    </form>
  );
}

function MethodCard({
  active,
  icon: Icon,
  title,
  sub,
  disabled,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`text-left p-3 rounded-xl border-2 transition-all disabled:opacity-50 ${
        active
          ? "border-ddg-ink bg-ddg-lime/15 shadow-[3px_3px_0_var(--ddg-ink)]"
          : "border-ddg-stone bg-ddg-paper hover:border-ddg-ink/40 hover:bg-ddg-cream/40"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon
          className={`w-4 h-4 ${active ? "text-ddg-ink" : "text-ddg-muted"}`}
        />
        <span
          className={`text-sm font-bold ${
            active ? "text-ddg-ink" : "text-ddg-ink/80"
          }`}
        >
          {title}
        </span>
      </div>
      <p className="text-[11px] text-ddg-muted leading-snug">{sub}</p>
    </button>
  );
}
