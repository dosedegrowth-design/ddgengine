/**
 * LLMBadge — pill com nome da IA + status dot pulsando
 * Usado no trust strip + mockup hero
 */
"use client";

import { cn } from "@/lib/utils";

type Status = "live" | "warning" | "off";

const STATUS_COLOR: Record<Status, string> = {
  live: "bg-emerald-500",
  warning: "bg-amber-500",
  off: "bg-zinc-500",
};

export function LLMBadge({
  name,
  status = "live",
  variant = "light",
  className,
}: {
  name: string;
  status?: Status;
  variant?: "light" | "dark";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 font-medium text-sm",
        variant === "light"
          ? "border-ddg-ink bg-ddg-paper text-ddg-ink"
          : "border-white/20 bg-white/5 text-white",
        className
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full ddg-pulse",
          STATUS_COLOR[status]
        )}
      />
      <span>{name}</span>
    </div>
  );
}

export function LLMTrustStrip({ variant = "light" }: { variant?: "light" | "dark" }) {
  const llms = [
    { name: "ChatGPT", status: "live" as Status },
    { name: "Perplexity", status: "live" as Status },
    { name: "Claude", status: "live" as Status },
    { name: "Gemini", status: "live" as Status },
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {llms.map((l) => (
        <LLMBadge key={l.name} {...l} variant={variant} />
      ))}
    </div>
  );
}
