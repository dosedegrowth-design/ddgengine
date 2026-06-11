"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "ddg_welcome_seen";

const STEPS = [
  {
    title: "Bem-vindo ao Conteudai 👋",
    description: "Vamos te guiar pelos primeiros passos pra você ver o produto funcionando em 7 minutos.",
    cta: "Vamos lá",
  },
  {
    title: "Conecte seu site",
    description: "Cole a URL do seu site no Onboarding. Nossa IA vai analisar tudo automaticamente.",
    cta: "Próximo",
  },
  {
    title: "Preencha o briefing",
    description: "15 perguntas em 5 minutos. A IA aprende como você fala e nunca mais erra.",
    cta: "Próximo",
  },
  {
    title: "A IA cuida do resto",
    description: "Escreve, otimiza pra SEO + GEO, publica em blog.seusite.com.br, mede tudo.",
    cta: "Começar",
  },
];

export function WelcomeTour() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  }

  function next() {
    if (step === STEPS.length - 1) {
      dismiss();
      router.push("/onboarding");
    } else {
      setStep(step + 1);
    }
  }

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-background rounded-lg border shadow-xl">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <button onClick={dismiss} className="p-1 rounded hover:bg-accent">
              <X className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-xl font-semibold tracking-tight mb-2">{current.title}</h2>
          <p className="text-muted-foreground leading-relaxed">{current.description}</p>
        </div>
        <div className="border-t p-4 flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={
                  i === step
                    ? "h-1.5 w-6 rounded-full bg-foreground"
                    : "h-1.5 w-1.5 rounded-full bg-muted"
                }
              />
            ))}
          </div>
          <Button onClick={next} size="sm">
            {current.cta}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
