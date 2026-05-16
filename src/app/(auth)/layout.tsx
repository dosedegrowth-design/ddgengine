import Link from "next/link";
import { BrandMarkInverted } from "@/components/brand/brand-mark";
import { AuroraBackground } from "@/components/landing/motion/aurora-background";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-screen flex flex-col bg-ddg-ink text-ddg-paper overflow-hidden">
      {/* Aurora fluindo no fundo */}
      <AuroraBackground />

      {/* Conteúdo acima */}
      <header className="relative z-10 border-b border-ddg-paper/10 backdrop-blur-sm bg-ddg-ink/40 shrink-0">
        <div className="container mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link href="/" aria-label="Início">
            <BrandMarkInverted size="md" />
          </Link>
          <nav className="flex items-center gap-6 text-xs font-medium text-ddg-paper/60">
            <Link href="/" className="hover:text-ddg-paper transition-colors">
              Início
            </Link>
            <Link href="/#pricing" className="hover:text-ddg-paper transition-colors">
              Planos
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex-1 min-h-0 flex items-center justify-center px-4 py-4 overflow-y-auto">
        <div className="w-full max-w-md my-auto">{children}</div>
      </main>

      <footer className="relative z-10 border-t border-ddg-paper/10 backdrop-blur-sm bg-ddg-ink/40 py-3 shrink-0">
        <div className="container mx-auto max-w-6xl px-4 text-[10px] font-mono uppercase tracking-widest text-ddg-paper/40 text-center">
          © {new Date().getFullYear()} Dose de Growth · Feito no Brasil
        </div>
      </footer>
    </div>
  );
}
