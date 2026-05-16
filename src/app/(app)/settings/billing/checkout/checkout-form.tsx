"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startCheckout, validateCouponAction } from "./actions";

interface Props {
  orgId: string;
  orgName: string;
  userEmail: string;
  userName: string;
  plan: string;
  cycle: "monthly" | "annual";
  value: number;
}

export function CheckoutForm({ orgId, orgName, userEmail, userName, plan, cycle, value }: Props) {
  const router = useRouter();
  const [method, setMethod] = useState<"PIX" | "CREDIT_CARD">("PIX");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [card, setCard] = useState({ number: "", holder: "", expiry: "", ccv: "" });
  const [postalCode, setPostalCode] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [coupon, setCoupon] = useState("");
  const [couponState, setCouponState] = useState<{ valid: boolean; discount?: number; finalValue?: number; message?: string } | null>(null);
  const [pending, start] = useTransition();

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

  return (
    <form onSubmit={handle} className="space-y-6 max-w-xl">
      <div className="space-y-2">
        <Label>Método de pagamento</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["PIX", "CREDIT_CARD"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={
                method === m
                  ? "border-2 border-primary bg-primary/5 rounded-md p-3 text-left"
                  : "border rounded-md p-3 text-left hover:bg-accent/40"
              }
              disabled={pending}
            >
              <div className="font-medium text-sm">{m === "PIX" ? "PIX recorrente" : "Cartão de crédito"}</div>
              <div className="text-xs text-muted-foreground">
                {m === "PIX" ? "Cobrança automática mensal via PIX" : "Cobrança automática no cartão"}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cpf">CPF/CNPJ</Label>
          <Input id="cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" required disabled={pending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" required disabled={pending} />
        </div>
      </div>

      {method === "CREDIT_CARD" && (
        <>
          <div className="space-y-3">
            <Label>Dados do cartão</Label>
            <Input
              placeholder="Número do cartão"
              value={card.number}
              onChange={(e) => setCard({ ...card, number: e.target.value })}
              required
              disabled={pending}
            />
            <Input
              placeholder="Nome impresso no cartão"
              value={card.holder}
              onChange={(e) => setCard({ ...card, holder: e.target.value })}
              required
              disabled={pending}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="MM/AAAA"
                value={card.expiry}
                onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                required
                disabled={pending}
              />
              <Input
                placeholder="CCV"
                value={card.ccv}
                onChange={(e) => setCard({ ...card, ccv: e.target.value })}
                required
                disabled={pending}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="CEP"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                required
                disabled={pending}
              />
              <Input
                placeholder="Número"
                value={addressNumber}
                onChange={(e) => setAddressNumber(e.target.value)}
                required
                disabled={pending}
              />
            </div>
          </div>
        </>
      )}

      {/* Cupom */}
      <div className="space-y-2">
        <Label htmlFor="coupon">Cupom de desconto (opcional)</Label>
        <div className="flex gap-2">
          <Input
            id="coupon"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            placeholder="BEMVINDO30"
            disabled={pending}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              start(async () => {
                const r = await validateCouponAction({ code: coupon, plan, baseValue: value });
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
              })
            }
            disabled={pending || !coupon.trim()}
          >
            Aplicar
          </Button>
        </div>
        {couponState?.valid && (
          <div className="text-sm rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3">
            <div className="font-medium text-emerald-700 dark:text-emerald-400">
              ✓ {couponState.message}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Desconto R$ {(couponState.discount ?? 0).toFixed(2)} ·
              Total <strong>R$ {(couponState.finalValue ?? value).toFixed(2)}</strong>
            </div>
          </div>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {method === "PIX"
          ? `Pagar R$ ${(couponState?.finalValue ?? value).toFixed(2).replace(".", ",")} via PIX`
          : `Assinar — R$ ${(couponState?.finalValue ?? value).toFixed(2).replace(".", ",")}/${cycle === "annual" ? "ano" : "mês"}`}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Cobrança processada via Asaas (regulamentado pelo BCB). Cancele quando quiser.
      </p>
    </form>
  );
}
