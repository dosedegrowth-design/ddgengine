"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { saveBriefing, submitBriefing, type BriefingPayload } from "@/app/(app)/briefing/actions";

interface BriefingWizardProps {
  siteId: string;
  initialData: Record<string, unknown> | null;
}

const STEPS = [
  { id: 1, title: "Sobre o negócio", desc: "O básico do que sua empresa faz" },
  { id: 2, title: "Produtos e concorrência", desc: "Como você se diferencia" },
  { id: 3, title: "Voz da marca", desc: "Como você fala — a IA aprende com isso" },
  { id: 4, title: "Conteúdo", desc: "Perguntas e palavras-chave" },
  { id: 5, title: "Publicação", desc: "Como vamos publicar" },
];

export function BriefingWizard({ siteId, initialData }: BriefingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BriefingPayload>(toPayload(initialData));
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // Autosave debounced
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await saveBriefing(siteId, {
        ...data,
        completion_percent: Math.round((step / STEPS.length) * 100),
      });
      setSaving(false);
    }, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data, siteId, step]);

  function update<K extends keyof BriefingPayload>(key: K, value: BriefingPayload[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function handleFinish() {
    startTransition(async () => {
      await saveBriefing(siteId, { ...data, completion_percent: 100 });
      const result = await submitBriefing(siteId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`Briefing salvo! ${result.embeddings ?? 0} pedaços de voz aprendidos.`);
      router.push("/dashboard");
    });
  }

  return (
    <div className="space-y-6">
      <ProgressBar current={step} total={STEPS.length} saving={saving} />

      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit mb-2">
            Passo {step} de {STEPS.length}
          </Badge>
          <CardTitle>{STEPS[step - 1].title}</CardTitle>
          <CardDescription>{STEPS[step - 1].desc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && <Step1 data={data} update={update} />}
          {step === 2 && <Step2 data={data} update={update} />}
          {step === 3 && <Step3 data={data} update={update} />}
          {step === 4 && <Step4 data={data} update={update} />}
          {step === 5 && <Step5 data={data} update={update} />}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1 || isPending}
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        {step < STEPS.length ? (
          <Button onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}>
            Próximo <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleFinish} disabled={isPending}>
            {isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Salvando voz da marca...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Finalizar e treinar IA</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ current, total, saving }: { current: number; total: number; saving: boolean }) {
  const pct = (current / total) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {current} de {total}
        </span>
        <span className="text-muted-foreground">
          {saving ? "Salvando..." : "Tudo salvo ✓"}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ============ STEPS ============

function Step1({
  data,
  update,
}: {
  data: BriefingPayload;
  update: <K extends keyof BriefingPayload>(k: K, v: BriefingPayload[K]) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="biz">Em 1-2 frases, o que sua empresa faz?</Label>
        <textarea
          id="biz"
          className="w-full min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={data.business_description ?? ""}
          onChange={(e) => update("business_description", e.target.value)}
          placeholder="Ex: Somos uma clínica veterinária especializada em dermatologia de cães e gatos em São Paulo. Atendemos casos complexos que outros vets não resolvem."
        />
      </div>

      <div className="space-y-2">
        <Label>Tipo de cliente</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: "b2b", l: "B2B" },
            { v: "b2c", l: "B2C" },
            { v: "both", l: "Ambos" },
          ].map(({ v, l }) => (
            <button
              key={v}
              type="button"
              className={
                data.audience_type === v
                  ? "border-2 border-primary bg-primary/5 rounded-md py-2 text-sm font-medium"
                  : "border rounded-md py-2 text-sm hover:bg-accent/40"
              }
              onClick={() => update("audience_type", v)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="region">Cidade ou região que você atende</Label>
        <Input
          id="region"
          value={data.region ?? ""}
          onChange={(e) => update("region", e.target.value)}
          placeholder="Ex: São Paulo capital, ou Brasil todo"
        />
      </div>
    </>
  );
}

function Step2({
  data,
  update,
}: {
  data: BriefingPayload;
  update: <K extends keyof BriefingPayload>(k: K, v: BriefingPayload[K]) => void;
}) {
  const services = data.services ?? [{ name: "" }, { name: "" }, { name: "" }];
  const competitors = data.competitors ?? [{ url: "" }, { url: "" }, { url: "" }];

  return (
    <>
      <div className="space-y-2">
        <Label>Top 3 serviços ou produtos</Label>
        {services.map((s, i) => (
          <Input
            key={i}
            value={s.name}
            onChange={(e) => {
              const arr = [...services];
              arr[i] = { name: e.target.value };
              update("services", arr);
            }}
            placeholder={`Serviço ${i + 1}`}
          />
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ticket">Ticket médio (faixa)</Label>
        <Input
          id="ticket"
          value={data.ticket_range ?? ""}
          onChange={(e) => update("ticket_range", e.target.value)}
          placeholder="Ex: R$ 200 - R$ 500 por consulta"
        />
      </div>

      <div className="space-y-2">
        <Label>3 concorrentes diretos (URLs)</Label>
        {competitors.map((c, i) => (
          <Input
            key={i}
            value={c.url}
            onChange={(e) => {
              const arr = [...competitors];
              arr[i] = { url: e.target.value };
              update("competitors", arr);
            }}
            placeholder="https://concorrente.com.br"
          />
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="diff">O que te diferencia deles?</Label>
        <textarea
          id="diff"
          className="w-full min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={data.differentiator ?? ""}
          onChange={(e) => update("differentiator", e.target.value)}
          placeholder="Ex: Único na região com dermatologista veterinário com 15+ anos de experiência. Atendimento humanizado."
        />
      </div>
    </>
  );
}

function Step3({
  data,
  update,
}: {
  data: BriefingPayload;
  update: <K extends keyof BriefingPayload>(k: K, v: BriefingPayload[K]) => void;
}) {
  return (
    <>
      <div className="space-y-3">
        <Label>Tom de voz (1 = nada, 5 = muito)</Label>
        {(
          [
            { key: "tone_formal", label: "Formal" },
            { key: "tone_casual", label: "Casual" },
            { key: "tone_technical", label: "Técnico" },
            { key: "tone_didactic", label: "Didático" },
          ] as const
        ).map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>{label}</span>
              <span className="font-medium tabular-nums">{data[key] ?? 3}</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={(data[key] as number) ?? 3}
              onChange={(e) => update(key, parseInt(e.target.value, 10))}
              className="w-full accent-foreground"
            />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="sample">Cole 2-3 textos seus existentes (mínimo 500 palavras)</Label>
        <textarea
          id="sample"
          className="w-full min-h-40 rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
          value={data.sample_texts ?? ""}
          onChange={(e) => update("sample_texts", e.target.value)}
          placeholder="Cole textos do seu site, posts antigos, emails. Quanto mais e mais diverso, melhor a IA aprende sua voz."
        />
        <p className="text-xs text-muted-foreground">
          {(data.sample_texts ?? "").trim().split(/\s+/).filter(Boolean).length} palavras
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="loved">Palavras que VOCÊ AMA usar</Label>
          <Input
            id="loved"
            value={(data.loved_words ?? []).join(", ")}
            onChange={(e) => update("loved_words", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            placeholder="amorzinho, peludinho, família"
          />
          <p className="text-xs text-muted-foreground">Separe por vírgula</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="forbidden">Palavras PROIBIDAS</Label>
          <Input
            id="forbidden"
            value={(data.forbidden_words ?? []).join(", ")}
            onChange={(e) => update("forbidden_words", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            placeholder="bicho, animal de estimação"
          />
          <p className="text-xs text-muted-foreground">Separe por vírgula</p>
        </div>
      </div>
    </>
  );
}

function Step4({
  data,
  update,
}: {
  data: BriefingPayload;
  update: <K extends keyof BriefingPayload>(k: K, v: BriefingPayload[K]) => void;
}) {
  const faqs = data.faq_questions ?? [
    { question: "" },
    { question: "" },
    { question: "" },
    { question: "" },
    { question: "" },
  ];

  return (
    <>
      <div className="space-y-2">
        <Label>As 5 perguntas que clientes mais te fazem</Label>
        {faqs.map((q, i) => (
          <Input
            key={i}
            value={q.question}
            onChange={(e) => {
              const arr = [...faqs];
              arr[i] = { question: e.target.value };
              update("faq_questions", arr);
            }}
            placeholder={`Pergunta ${i + 1}`}
          />
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="keywords">Palavras-chave alvo (até 10)</Label>
        <textarea
          id="keywords"
          className="w-full min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={(data.target_keywords ?? []).join("\n")}
          onChange={(e) => update("target_keywords", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
          placeholder="dermatologista veterinário SP&#10;dermatite atópica cachorro&#10;alergia de pele em cães"
        />
        <p className="text-xs text-muted-foreground">Uma por linha</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="disclaimers">Disclaimer obrigatório?</Label>
        <textarea
          id="disclaimers"
          className="w-full min-h-16 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={data.required_disclaimers ?? ""}
          onChange={(e) => update("required_disclaimers", e.target.value)}
          placeholder="Ex: Sempre indicar 'consulte um veterinário' antes de qualquer recomendação"
        />
      </div>
    </>
  );
}

function Step5({
  data,
  update,
}: {
  data: BriefingPayload;
  update: <K extends keyof BriefingPayload>(k: K, v: BriefingPayload[K]) => void;
}) {
  return (
    <>
      <div className="space-y-3">
        <Label>Modo de publicação</Label>
        <div className="grid gap-2">
          {(
            [
              { v: "auto", l: "Auto", d: "Publica direto, sem revisão. Você só recebe notificação." },
              { v: "whatsapp", l: "Aprovação por WhatsApp", d: "Você recebe cada post pra aprovar (1 clique)." },
              { v: "email", l: "Aprovação por email", d: "Você recebe email com preview antes de publicar." },
            ] as const
          ).map(({ v, l, d }) => (
            <button
              key={v}
              type="button"
              className={
                data.approval_mode === v
                  ? "border-2 border-primary bg-primary/5 rounded-md p-3 text-left"
                  : "border rounded-md p-3 text-left hover:bg-accent/40"
              }
              onClick={() => update("approval_mode", v)}
            >
              <div className="font-medium text-sm">{l}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{d}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Dia da semana preferido</Label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={data.publish_day_of_week ?? 1}
            onChange={(e) => update("publish_day_of_week", parseInt(e.target.value, 10))}
          >
            {["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map((d, i) => (
              <option key={d} value={i}>{d}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Hora preferida</Label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={data.publish_hour ?? 9}
            onChange={(e) => update("publish_hour", parseInt(e.target.value, 10))}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-2">
        <div className="font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Tudo pronto pra treinar a IA
        </div>
        <p className="text-muted-foreground">
          Quando clicar em <strong>Finalizar</strong>, vamos processar suas informações
          em embeddings (~10s) e a IA fica pronta pra gerar conteúdo na sua voz.
        </p>
      </div>
    </>
  );
}

function toPayload(initial: Record<string, unknown> | null): BriefingPayload {
  if (!initial) return {};
  return {
    business_description: initial.business_description as string | undefined,
    audience_type: initial.audience_type as string | undefined,
    region: initial.region as string | undefined,
    services: initial.services as BriefingPayload["services"],
    ticket_range: initial.ticket_range as string | undefined,
    competitors: initial.competitors as BriefingPayload["competitors"],
    differentiator: initial.differentiator as string | undefined,
    tone_formal: initial.tone_formal as number | undefined,
    tone_casual: initial.tone_casual as number | undefined,
    tone_technical: initial.tone_technical as number | undefined,
    tone_didactic: initial.tone_didactic as number | undefined,
    sample_texts: initial.sample_texts as string | undefined,
    loved_words: initial.loved_words as string[] | undefined,
    forbidden_words: initial.forbidden_words as string[] | undefined,
    faq_questions: initial.faq_questions as BriefingPayload["faq_questions"],
    target_keywords: initial.target_keywords as string[] | undefined,
    required_disclaimers: initial.required_disclaimers as string | undefined,
    approval_mode: initial.approval_mode as BriefingPayload["approval_mode"],
    publish_day_of_week: initial.publish_day_of_week as number | undefined,
    publish_hour: initial.publish_hour as number | undefined,
  };
}
