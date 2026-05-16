/**
 * FlowDiagram — visualização do produto end-to-end
 * Briefing → AI → WhatsApp → Publica → 4 LLMs
 *
 * Funciona em mobile (stack vertical) e desktop (horizontal flow).
 */
import { Brain, FileText, MessageCircle, Send, Sparkles } from "lucide-react";

const NODES = [
  {
    icon: FileText,
    label: "Briefing",
    desc: "15 perguntas. A IA aprende sua marca.",
  },
  {
    icon: Brain,
    label: "AI escreve",
    desc: "Multi-pass: 7 passos editoriais.",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp aprova",
    desc: "Você lê e libera em 1 clique.",
  },
  {
    icon: Send,
    label: "Publica",
    desc: "Direto no seu site, sem plugin.",
  },
  {
    icon: Sparkles,
    label: "4 IAs trackeiam",
    desc: "ChatGPT · Perplexity · Claude · Gemini",
  },
];

export function FlowDiagram() {
  return (
    <div className="relative">
      {/* Desktop: horizontal */}
      <div className="hidden md:grid grid-cols-5 gap-3 items-stretch">
        {NODES.map((node, i) => {
          const Icon = node.icon;
          return (
            <div key={node.label} className="relative">
              <div className="h-full flex flex-col items-center text-center gap-3 p-5 rounded-xl border-2 border-ddg-ink bg-ddg-paper">
                <div className="h-12 w-12 rounded-full bg-ddg-lime border-2 border-ddg-ink flex items-center justify-center">
                  <Icon className="w-5 h-5 text-ddg-ink" />
                </div>
                <div className="font-mono text-[10px] text-ddg-muted tracking-widest uppercase">
                  Passo {String(i + 1).padStart(2, "0")}
                </div>
                <div className="font-black text-base text-ddg-ink uppercase">
                  {node.label}
                </div>
                <div className="text-xs text-ddg-muted leading-relaxed">
                  {node.desc}
                </div>
              </div>
              {/* Arrow between cards (except last) */}
              {i < NODES.length - 1 && (
                <div className="absolute top-1/2 -right-2 -translate-y-1/2 z-10 pointer-events-none">
                  <div className="bg-ddg-paper border-2 border-ddg-ink rounded-full h-6 w-6 flex items-center justify-center text-ddg-ink font-bold text-xs">
                    →
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical stack */}
      <div className="md:hidden flex flex-col gap-3">
        {NODES.map((node, i) => {
          const Icon = node.icon;
          return (
            <div key={node.label} className="relative">
              <div className="flex items-start gap-4 p-4 rounded-xl border-2 border-ddg-ink bg-ddg-paper">
                <div className="shrink-0 h-12 w-12 rounded-full bg-ddg-lime border-2 border-ddg-ink flex items-center justify-center">
                  <Icon className="w-5 h-5 text-ddg-ink" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] text-ddg-muted tracking-widest uppercase mb-1">
                    Passo {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="font-black text-base text-ddg-ink uppercase mb-1">
                    {node.label}
                  </div>
                  <div className="text-xs text-ddg-muted leading-relaxed">
                    {node.desc}
                  </div>
                </div>
              </div>
              {i < NODES.length - 1 && (
                <div className="flex justify-center my-1 text-ddg-ink font-bold">
                  ↓
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
