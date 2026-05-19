import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Sobre" };

export default function SobrePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto max-w-4xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">
            Conteudai
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Voltar
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-6 py-16 prose prose-neutral dark:prose-invert">
        <h1>Por que existimos</h1>
        <p className="lead">
          ChatGPT virou hábito de busca. Setenta por cento das pesquisas por IA são lá. E quase
          nenhuma empresa brasileira sabe se está aparecendo.
        </p>

        <p>
          Em 2024 a galera percebeu que o jogo mudou. Já não basta ranquear no Google — a IA virou
          o portão de entrada antes do clique. Mas as ferramentas pra esse novo jogo são caras,
          gringas, e exigem instalar plugin no site. PME brasileira fica de fora.
        </p>

        <p>
          O Conteudai resolve isso. <strong>Plataforma 100% brasileira</strong>, que conecta
          qualquer site (sem plugin), mede em números a presença em ChatGPT/Perplexity/Claude/Gemini,
          gera conteúdo otimizado pra Google e IA, e publica direto no domínio do cliente. PIX,
          WhatsApp pra aprovar, suporte em pt-BR.
        </p>

        <h2>O que defendemos</h2>
        <ul>
          <li>
            <strong>Visibilidade mensurável.</strong> Toda promessa de SEO/GEO precisa virar número
            comparável.
          </li>
          <li>
            <strong>Velocidade do PME.</strong> Setup em 7 minutos. Sem call de onboarding, sem
            consultoria.
          </li>
          <li>
            <strong>Não toca no site do cliente.</strong> Reverse proxy via Cloudflare. Zero risco
            de quebrar o que já funciona.
          </li>
          <li>
            <strong>Brasileiro de verdade.</strong> PIX, WhatsApp, LGPD nativa. Não &quot;localizado&quot;
            às pressas.
          </li>
        </ul>

        <h2>Quem está por trás</h2>
        <p>
          Construído pela <a href="https://dosedegrowth.com">Dose de Growth</a>, agência
          brasileira de automação e IA desde 2024. Time enxuto, focado em entregar valor mensurável
          pra PME brasileira.
        </p>

        <h2>Onde estamos indo</h2>
        <p>
          Em 12 meses, queremos ser a plataforma de visibilidade em IA padrão pra PME no Brasil.
          Em 24 meses, pra agências brasileiras como produto white-label. Em 36 meses, exportar pra
          mercados de língua latina (Espanha, México, Argentina).
        </p>

        <hr />

        <div className="flex gap-3 not-prose">
          <Button asChild>
            <Link href="/signup">Começar grátis</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contato">Falar com a gente</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
