"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Magnet } from "@/components/landing/motion/magnet";
import { loginWithEmail, signInWithGoogle } from "./actions";

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const params = useSearchParams();
  const redirectTo = params.get("redirect_to") ?? "/dashboard";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append("redirect_to", redirectTo);
    const result = await loginWithEmail(formData);
    if (result?.error) {
      toast.error(result.error);
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await signInWithGoogle();
    if (result?.error) {
      toast.error(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      {/* Glass card */}
      <div className="relative rounded-2xl border-2 border-ddg-lime/30 bg-ddg-ink/70 backdrop-blur-2xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.6)] p-7 md:p-9">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="ddg-bracket text-ddg-lime mb-3 inline-block">ENTRAR</div>
          <h1 className="ddg-display text-3xl md:text-4xl text-ddg-paper leading-[1] mb-2">
            Bem-vindo de volta.
          </h1>
          <p className="text-sm text-ddg-paper/60">
            Acesse seu painel e veja sua visibility em tempo real.
          </p>
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-3 h-12 rounded-xl border-2 border-ddg-paper/15 bg-ddg-paper/[0.04] hover:bg-ddg-paper/[0.08] hover:border-ddg-paper/30 transition-colors text-ddg-paper font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continuar com Google
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <span className="w-full border-t border-ddg-paper/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 text-[10px] font-mono uppercase tracking-widest text-ddg-paper/40 bg-ddg-ink/80 rounded-full">
              ou com email
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-mono uppercase tracking-widest text-ddg-paper/60 mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="voce@empresa.com.br"
              required
              autoComplete="email"
              disabled={loading}
              className="w-full h-11 px-4 rounded-xl border-2 border-ddg-paper/15 bg-ddg-paper/[0.04] text-ddg-paper placeholder:text-ddg-paper/30 focus:border-ddg-lime/60 focus:bg-ddg-paper/[0.06] focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-xs font-mono uppercase tracking-widest text-ddg-paper/60">
                Senha
              </label>
              <Link
                href="/forgot-password"
                className="text-[10px] font-mono uppercase tracking-widest text-ddg-paper/40 hover:text-ddg-lime transition-colors"
              >
                Esqueci a senha
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              disabled={loading}
              className="w-full h-11 px-4 rounded-xl border-2 border-ddg-paper/15 bg-ddg-paper/[0.04] text-ddg-paper placeholder:text-ddg-paper/30 focus:border-ddg-lime/60 focus:bg-ddg-paper/[0.06] focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          <Magnet strength={0.15} className="w-full pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-ddg-lime text-ddg-ink font-bold text-sm border-2 border-ddg-ink shadow-[4px_4px_0_var(--ddg-ink)] hover:shadow-[6px_6px_0_var(--ddg-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[2px_2px_0_var(--ddg-ink)] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0_var(--ddg-ink)] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
            >
              {loading ? "Entrando..." : "Entrar"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </Magnet>
        </form>
      </div>

      {/* Bottom links */}
      <div className="text-center mt-6">
        <p className="text-sm text-ddg-paper/60">
          Não tem conta?{" "}
          <Link href="/signup" className="text-ddg-lime font-medium hover:text-ddg-lime-bright transition-colors">
            Começar grátis
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-96" />}>
      <LoginForm />
    </Suspense>
  );
}
