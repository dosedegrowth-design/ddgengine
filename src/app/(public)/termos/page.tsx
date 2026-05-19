import Link from "next/link";

export const metadata = {
  title: "Termos de uso",
};

export default function TermosPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto max-w-4xl px-6 h-16 flex items-center">
          <Link href="/" className="font-semibold tracking-tight">
            Conteudai
          </Link>
        </div>
      </header>
      <main className="container mx-auto max-w-3xl px-6 py-12 prose prose-neutral dark:prose-invert">
        <h1>Termos de uso</h1>
        <p>
          <strong>Última atualização:</strong> {new Date().toLocaleDateString("pt-BR")}
        </p>

        <h2>1. Aceitação</h2>
        <p>
          Ao criar uma conta no Conteudai, você concorda com estes termos. Se discordar,
          não use a plataforma.
        </p>

        <h2>2. O que oferecemos</h2>
        <p>
          Plataforma SaaS de automação de blog com IA, que gera conteúdo otimizado pra
          Google e modelos de linguagem (ChatGPT, Perplexity, Claude, Gemini) e publica
          no domínio do cliente.
        </p>

        <h2>3. Suas obrigações</h2>
        <ul>
          <li>Fornecer informações verídicas no briefing</li>
          <li>Ser responsável pelo conteúdo publicado no seu domínio</li>
          <li>Respeitar disclaimers regulatórios do seu setor (saúde, jurídico, financeiro)</li>
          <li>Manter HTTPS e SSL ativos no seu domínio</li>
          <li>Não tentar fraudar o sistema (gerar volume excessivo, abuso de API, etc)</li>
        </ul>

        <h2>4. Propriedade intelectual</h2>
        <p>
          Você é dono do conteúdo gerado pelo Conteudai pra seu domínio. Ao usar o
          serviço, você concede licença não-exclusiva pra processarmos e publicarmos esse
          conteúdo no seu site.
        </p>

        <h2>5. Limitação de responsabilidade</h2>
        <p>
          Não garantimos posições específicas no Google ou citações em IAs. SEO depende de
          múltiplos fatores fora do nosso controle. Resultados típicos: tráfego mensurável
          em 90-180 dias.
        </p>

        <h2>6. Garantia condicional</h2>
        <p>
          Se em 90 dias suas impressões no Google Search Console não crescerem,
          reembolsamos 100% do valor pago. Solicitação via suporte.
        </p>

        <h2>7. Cancelamento</h2>
        <p>
          Você pode cancelar a qualquer momento. Sem multa. Os posts publicados ficam no
          seu site permanentemente — você é dono do conteúdo.
        </p>

        <h2>8. Privacidade</h2>
        <p>
          Tratamento de dados conforme LGPD. Detalhes em nossa{" "}
          <Link href="/privacidade">Política de privacidade</Link>.
        </p>

        <h2>9. Foro</h2>
        <p>
          Lei brasileira aplicável. Foro da Comarca de São Paulo, SP, exceto quando o CDC
          determinar de outra forma.
        </p>

        <h2>10. Contato</h2>
        <p>
          Dúvidas: suporte@conteudai.com.br
        </p>
      </main>
    </div>
  );
}
