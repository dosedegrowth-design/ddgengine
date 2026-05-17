"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveNotificationPrefs } from "./actions";

interface Prefs {
  channels: { email: boolean; whatsapp: boolean };
  events: Record<string, boolean>;
  quiet_hours: { enabled: boolean; start: string; end: string };
}

const EVENT_LABELS: Record<string, { label: string; desc: string }> = {
  post_pending_review: { label: "Post aguardando aprovação", desc: "Quando um post fica pra você revisar" },
  post_published: { label: "Post publicado", desc: "Quando um post entra no ar" },
  monthly_report: { label: "Relatório mensal", desc: "PDF executivo + recomendações no dia 1" },
  ai_visibility_milestone: { label: "Milestone de IA", desc: "Quando bate marcos de citação em IA" },
  billing: { label: "Cobrança e pagamento", desc: "Recibos, falhas, próximas cobranças" },
  technical_issue: { label: "Problema técnico", desc: "Integração com problema, falha de sincronização, etc" },
};

export function NotificationPrefsForm({
  orgId,
  phone: initialPhone,
  prefs: initialPrefs,
}: {
  orgId: string;
  phone: string;
  prefs: Prefs;
}) {
  const [phone, setPhone] = useState(initialPhone);
  const [prefs, setPrefs] = useState(initialPrefs);
  const [pending, start] = useTransition();

  function toggleEvent(key: string) {
    setPrefs({ ...prefs, events: { ...prefs.events, [key]: !prefs.events[key] } });
  }

  function toggleChannel(key: "email" | "whatsapp") {
    setPrefs({ ...prefs, channels: { ...prefs.channels, [key]: !prefs.channels[key] } });
  }

  function handleSave() {
    start(async () => {
      const r = await saveNotificationPrefs(orgId, { phone, prefs });
      if ("error" in r && r.error) toast.error(r.error);
      else toast.success("Preferências salvas");
    });
  }

  return (
    <div className="space-y-8">
      {/* Phone */}
      <section>
        <h3 className="text-sm font-medium mb-3">Telefone (WhatsApp)</h3>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(11) 99999-9999"
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Usado pra receber posts pra aprovar com 1 clique. Apenas Pro+.
        </p>
      </section>

      {/* Channels */}
      <section>
        <h3 className="text-sm font-medium mb-3">Canais</h3>
        <div className="space-y-2">
          <Toggle
            label="Email"
            checked={prefs.channels.email}
            onChange={() => toggleChannel("email")}
            disabled={pending}
          />
          <Toggle
            label="WhatsApp"
            checked={prefs.channels.whatsapp}
            onChange={() => toggleChannel("whatsapp")}
            disabled={pending || !phone}
            hint={!phone ? "Configure o telefone primeiro" : undefined}
          />
        </div>
      </section>

      {/* Events */}
      <section>
        <h3 className="text-sm font-medium mb-3">Eventos</h3>
        <div className="space-y-2">
          {Object.entries(EVENT_LABELS).map(([key, info]) => (
            <Toggle
              key={key}
              label={info.label}
              hint={info.desc}
              checked={prefs.events[key] ?? true}
              onChange={() => toggleEvent(key)}
              disabled={pending}
            />
          ))}
        </div>
      </section>

      {/* Quiet hours */}
      <section>
        <h3 className="text-sm font-medium mb-3">Modo silencioso</h3>
        <Toggle
          label="Não enviar entre horários"
          checked={prefs.quiet_hours.enabled}
          onChange={() => setPrefs({ ...prefs, quiet_hours: { ...prefs.quiet_hours, enabled: !prefs.quiet_hours.enabled } })}
          disabled={pending}
        />
        {prefs.quiet_hours.enabled && (
          <div className="grid grid-cols-2 gap-3 mt-3 max-w-xs">
            <div>
              <Label className="text-xs">Início</Label>
              <Input
                type="time"
                value={prefs.quiet_hours.start}
                onChange={(e) => setPrefs({ ...prefs, quiet_hours: { ...prefs.quiet_hours, start: e.target.value } })}
                disabled={pending}
              />
            </div>
            <div>
              <Label className="text-xs">Fim</Label>
              <Input
                type="time"
                value={prefs.quiet_hours.end}
                onChange={(e) => setPrefs({ ...prefs, quiet_hours: { ...prefs.quiet_hours, end: e.target.value } })}
                disabled={pending}
              />
            </div>
          </div>
        )}
      </section>

      <Button onClick={handleSave} disabled={pending}>
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Salvar preferências
      </Button>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={
        "flex items-center justify-between gap-3 p-3 rounded-md border cursor-pointer hover:bg-accent/30 transition-colors " +
        (disabled ? "opacity-50 cursor-not-allowed" : "")
      }
    >
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 accent-foreground"
      />
    </label>
  );
}
