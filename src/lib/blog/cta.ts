/**
 * CTA do blog por site: o que o leitor faz depois de ler. Configurado no Radar (SEO › Configurações) e salvo em
 * sites.cta. Sem config, cai num padrão que aponta pro site do cliente (nunca fica sem chamada).
 */
export interface BlogCta {
  titulo: string;
  texto: string;
  botao: string;
  /** URL do botão principal. Se `whatsapp` estiver preenchido, o botão vira link do WhatsApp. */
  url?: string;
  whatsapp?: string;
  mensagem?: string;
  secundario?: string;
  secundario_url?: string;
  /** Link "Site" no topo e no rodapé. */
  site_url?: string;
  /** Mostra também um bloco curto no meio do artigo. */
  meio?: boolean;
}

export function resolveCta(raw: Partial<BlogCta> | null | undefined, domain: string | null, orgName: string): BlogCta {
  const site = raw?.site_url || (domain ? `https://${domain.replace(/^https?:\/\//, "")}` : "");
  return {
    titulo: raw?.titulo || `Quer saber como a ${orgName} pode te ajudar?`,
    texto: raw?.texto || "Fale com a gente e tire suas dúvidas. Atendimento rápido e sem compromisso.",
    botao: raw?.botao || (raw?.whatsapp ? "Falar no WhatsApp" : `Conhecer a ${orgName}`),
    url: raw?.url || site,
    whatsapp: raw?.whatsapp || undefined,
    mensagem: raw?.mensagem || `Olá! Vim pelo blog da ${orgName}.`,
    secundario: raw?.secundario || (raw?.whatsapp || raw?.url ? "Ver o site" : ""),
    secundario_url: raw?.secundario_url || site,
    site_url: site,
    meio: raw?.meio ?? true,
  };
}

export function ctaHref(c: BlogCta): string {
  if (c.whatsapp) return `https://wa.me/${c.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(c.mensagem || "")}`;
  return c.url || c.site_url || "#";
}
