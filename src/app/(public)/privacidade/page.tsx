import Link from "next/link";

export const metadata = {
  title: "Política de privacidade",
};

export default function PrivacidadePage() {
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
        <h1>Política de privacidade</h1>
        <p>
          <strong>Última atualização:</strong> {new Date().toLocaleDateString("pt-BR")}
        </p>

        <h2>1. Quem somos</h2>
        <p>
          Conteudai, operado por Dose de Growth. Empresa brasileira, cumpre LGPD (Lei
          13.709/2018).
        </p>

        <h2>2. Dados que coletamos</h2>
        <ul>
          <li>
            <strong>Cadastro:</strong> nome, email, senha (criptografada). Base legal:
            execução de contrato.
          </li>
          <li>
            <strong>Briefing:</strong> informações do seu negócio que você nos fornece.
            Base legal: execução de contrato.
          </li>
          <li>
            <strong>Métricas (GSC/GA4):</strong> coletadas via OAuth com sua autorização.
            Base legal: consentimento.
          </li>
          <li>
            <strong>Uso da plataforma:</strong> logs técnicos pra debugging. Base legal:
            legítimo interesse.
          </li>
          <li>
            <strong>Telefone WhatsApp:</strong> apenas se você optar por aprovação por
            WhatsApp. Base legal: consentimento.
          </li>
        </ul>

        <h2>3. Como usamos seus dados</h2>
        <ul>
          <li>Gerar conteúdo personalizado pra seu negócio</li>
          <li>Enviar notificações sobre posts publicados</li>
          <li>Cobrar mensalidades via Asaas</li>
          <li>Melhorar a plataforma (de forma anonimizada)</li>
        </ul>

        <h2>4. Sub-operadores</h2>
        <p>
          Compartilhamos dados com os seguintes processadores, conforme necessário pra
          operação:
        </p>
        <ul>
          <li>Supabase (database, autenticação) — EUA</li>
          <li>Vercel (hospedagem) — EUA</li>
          <li>Anthropic (geração de conteúdo IA) — EUA</li>
          <li>OpenAI (embeddings) — EUA</li>
          <li>Cloudflare (DNS) — EUA</li>
          <li>Asaas (pagamentos) — Brasil</li>
          <li>Meta (WhatsApp) — EUA, se opt-in</li>
          <li>Resend (email transacional) — EUA</li>
        </ul>
        <p>
          Transferências internacionais cobertas por cláusulas contratuais padrão (SCC).
        </p>

        <h2>5. Seus direitos (LGPD)</h2>
        <ul>
          <li>Acessar seus dados</li>
          <li>Corrigir dados incorretos</li>
          <li>Deletar sua conta e dados associados</li>
          <li>Portabilidade (exportar em CSV/JSON)</li>
          <li>Revogar consentimento</li>
          <li>Reclamar à ANPD</li>
        </ul>
        <p>
          Pra exercer qualquer direito, envie email pra <strong>dpo@conteudai.com.br</strong>.
        </p>

        <h2>6. Retenção</h2>
        <ul>
          <li>Dados ativos: enquanto sua conta existir</li>
          <li>Após cancelamento: 90 dias (período de reativação)</li>
          <li>Depois: deletados, exceto registros fiscais (mantidos 5 anos por lei)</li>
        </ul>

        <h2>7. Segurança</h2>
        <ul>
          <li>HTTPS em todas as comunicações</li>
          <li>Senhas com hash bcrypt</li>
          <li>Banco com criptografia em repouso</li>
          <li>Row-Level Security multi-tenant</li>
          <li>Backups diários encriptados</li>
        </ul>

        <h2>8. Cookies</h2>
        <p>
          Usamos cookies estritamente necessários (sessão, CSRF). Cookies de analytics
          (PostHog) só se você consentir explicitamente.
        </p>

        <h2>9. Crianças</h2>
        <p>
          Serviço destinado a empresas. Não coletamos dados de menores de 18 anos
          conscientemente.
        </p>

        <h2>10. Atualizações</h2>
        <p>
          Mudanças nesta política são notificadas com 30 dias de antecedência por email.
        </p>

        <h2>11. Contato DPO</h2>
        <p>
          Encarregado de proteção de dados: <strong>dpo@conteudai.com.br</strong>
        </p>
      </main>
    </div>
  );
}
