"use client";

/**
 * BrandToaster — toasts com a identidade da Conteudai (não o azul genérico).
 *
 * Estilo brutalista da marca: fundo claro, borda ink 2px, sombra dura,
 * e o SÍMBOLO da marca (bolinha lime em quadrado ink) no ícone de info/loading.
 * Cada tipo tem seu acento (sucesso lime, alerta âmbar, erro vermelho).
 */
import { Toaster } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";

/** Símbolo da marca — bolinha lime num quadradinho ink (a "ID da marca"). */
function BrandMarkIcon() {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-ddg-ink shrink-0">
      <span className="w-2 h-2 rounded-full bg-ddg-lime" />
    </span>
  );
}

export function BrandToaster() {
  return (
    <Toaster
      position="top-right"
      closeButton
      theme="light"
      toastOptions={{
        classNames: {
          toast:
            "!bg-ddg-paper !border-2 !border-ddg-ink !rounded-xl !shadow-[4px_4px_0_var(--ddg-ink)] !text-ddg-ink !text-sm !items-center !gap-3",
          title: "!text-ddg-ink !font-bold !text-[13px] !leading-snug",
          description: "!text-ddg-muted !text-xs",
          closeButton:
            "!bg-ddg-paper !border-2 !border-ddg-ink !text-ddg-ink hover:!bg-ddg-ink hover:!text-ddg-paper !rounded-md",
          actionButton:
            "!bg-ddg-lime !text-ddg-ink !border-2 !border-ddg-ink !font-bold !rounded-md",
          cancelButton:
            "!bg-ddg-stone !text-ddg-ink !border-2 !border-ddg-ink !rounded-md",
          icon: "!mr-0",
        },
      }}
      icons={{
        info: <BrandMarkIcon />,
        loading: <Loader2 className="w-4 h-4 animate-spin text-ddg-lime-deep" />,
        success: <CheckCircle2 className="w-5 h-5 text-ddg-lime-deep" strokeWidth={2.5} />,
        warning: <AlertTriangle className="w-5 h-5 text-amber-500" strokeWidth={2.5} />,
        error: <XCircle className="w-5 h-5 text-red-500" strokeWidth={2.5} />,
      }}
    />
  );
}
