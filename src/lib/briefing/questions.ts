/**
 * Briefing — 12 perguntas estruturadas
 *
 * Cada pergunta tem:
 * - id (estável, usado como chave em raw_answers)
 * - label (mostrado pro usuário)
 * - placeholder + hint pra orientar
 * - tipo de input (text/textarea/list/multichoice)
 * - obrigatória ou opcional
 * - exemplos pra ajudar quem trava
 * - category pra agrupar na ficha final
 */

export type QuestionType = "text" | "textarea" | "list" | "multichoice";

export interface BriefingQuestion {
  id: string;
  label: string;
  hint?: string;
  placeholder?: string;
  type: QuestionType;
  required: boolean;
  category: string;
  examples?: string[];
  /** Pra multichoice */
  choices?: { value: string; label: string }[];
  /** Pra list (separado por linha ou vírgula) */
  maxItems?: number;
  /** Sugere áudio se a pergunta beneficia de resposta longa */
  audioRecommended?: boolean;
}

export const BRIEFING_QUESTIONS: BriefingQuestion[] = [
  {
    id: "company_name",
    label: "Qual o nome da sua empresa?",
    placeholder: "Ex: Padaria do Zé",
    type: "text",
    required: true,
    category: "identity",
  },
  {
    id: "what_we_do",
    label: "O que sua empresa faz, em 1-2 frases?",
    hint: "Como você explicaria pra um amigo numa festa. Pode ser direto.",
    placeholder: "Ex: Vendo confeitaria artesanal pra eventos corporativos em SP.",
    type: "textarea",
    required: true,
    category: "identity",
    audioRecommended: true,
  },
  {
    id: "ideal_customer",
    label: "Quem é seu cliente ideal?",
    hint: "Idade, perfil, tamanho da empresa, dor que ele tem. Pode falar à vontade.",
    placeholder: "Ex: Mulheres 30-50 anos, gestoras de RH em empresas médias (50-500 funcionários), buscam diferenciar lanches em eventos…",
    type: "textarea",
    required: true,
    category: "audience",
    audioRecommended: true,
  },
  {
    id: "target_keywords",
    label: "Quais temas você quer ranquear no Google?",
    hint: "Termos que seu cliente busca. Pode listar separado por vírgula ou enter.",
    placeholder: "doces gourmet sp\ncoffee break corporativo\nkit lanche para evento",
    type: "list",
    required: true,
    category: "seo",
    maxItems: 15,
  },
  {
    id: "tone_of_voice",
    label: "Como sua marca fala?",
    hint: "Pode escolher mais de uma. Se nenhuma servir, descreve em texto.",
    type: "multichoice",
    required: false,
    category: "voice",
    choices: [
      { value: "formal", label: "Formal e técnica" },
      { value: "casual", label: "Casual e descontraída" },
      { value: "premium", label: "Premium e sofisticada" },
      { value: "didatica", label: "Didática e explicativa" },
      { value: "irreverente", label: "Irreverente e direta" },
      { value: "consultiva", label: "Consultiva e profissional" },
    ],
  },
  {
    id: "differentials",
    label: "Quais seus 3 maiores diferenciais vs concorrência?",
    hint: "O que faz cliente escolher VOCÊ e não os outros?",
    placeholder: "1. Único atelier com chef pâtissière formada na França…\n2. Entrega no mesmo dia em SP…\n3. Cardápio sem glúten 100%…",
    type: "textarea",
    required: false,
    category: "positioning",
    audioRecommended: true,
  },
  {
    id: "competitors",
    label: "Quem são seus 3 maiores concorrentes?",
    hint: "Nomes ou sites. A engine vai analisar como eles aparecem em SEO/IA.",
    placeholder: "concorrente1.com.br, Padaria X, marca Y",
    type: "list",
    required: false,
    category: "market",
    maxItems: 10,
  },
  {
    id: "client_case",
    label: "Conta um case de cliente seu",
    hint: "Pode ser um caso recente que te orgulha. Quanto mais detalhe, melhor — é a história que vai aparecer em conteúdo.",
    placeholder: "Conta como foi: o que o cliente precisava, o que você entregou, qual resultado…",
    type: "textarea",
    required: false,
    category: "storytelling",
    audioRecommended: true,
  },
  {
    id: "main_pain",
    label: "Qual é a maior dor que sua empresa resolve?",
    hint: "Em uma frase. Esta é a promessa que vai pra todo conteúdo.",
    placeholder: "Ex: Empresas perdem tempo escolhendo coffee break ruim que cliente nem come.",
    type: "textarea",
    required: false,
    category: "promise",
  },
  {
    id: "ai_visibility_goal",
    label: "Quando alguém pergunta no ChatGPT sobre seu setor, você QUER aparecer em qual pergunta?",
    hint: "Ex: \"melhor confeitaria pra evento em SP\". Lista as perguntas que sua marca PRECISA estar na resposta.",
    placeholder: "qual a melhor doceria para evento em SP\nonde pedir coffee break corporativo\nempresa de buffet de doces SP",
    type: "list",
    required: false,
    category: "visibility_goal",
    maxItems: 10,
  },
  {
    id: "existing_content",
    label: "Você já tem conteúdo antigo (blog, posts)?",
    hint: "Se sim, cola URL ou separa por vírgula. A engine pode importar pra não perder histórico.",
    placeholder: "exemplo.com.br/blog, post-antigo.com/url",
    type: "list",
    required: false,
    category: "migration",
    maxItems: 5,
  },
  {
    id: "unique_voice",
    label: "Algo único sobre o jeito que sua empresa fala ou pensa?",
    hint: "Expressões internas, jargão evitado, valores que aparecem na escrita. Pode falar à vontade.",
    placeholder: "Ex: A gente nunca usa 'cliente' — fala 'parceiro'. Evitamos termos técnicos. Sempre menciona região (somos Vila Madalena).",
    type: "textarea",
    required: false,
    category: "voice",
    audioRecommended: true,
  },
];

export const QUESTIONS_BY_ID = Object.fromEntries(
  BRIEFING_QUESTIONS.map((q) => [q.id, q])
);

export const REQUIRED_QUESTIONS = BRIEFING_QUESTIONS.filter((q) => q.required);
export const OPTIONAL_QUESTIONS = BRIEFING_QUESTIONS.filter((q) => !q.required);

/** Categorias agrupadas pra revisão final */
export const CATEGORIES: Record<string, { label: string; order: number }> = {
  identity: { label: "Identidade", order: 1 },
  audience: { label: "Público-alvo", order: 2 },
  positioning: { label: "Posicionamento", order: 3 },
  voice: { label: "Voz da marca", order: 4 },
  seo: { label: "SEO e palavras-chave", order: 5 },
  visibility_goal: { label: "Visibility em IA", order: 6 },
  market: { label: "Mercado e concorrência", order: 7 },
  storytelling: { label: "Casos e histórias", order: 8 },
  promise: { label: "Promessa central", order: 9 },
  migration: { label: "Conteúdo existente", order: 10 },
};

/**
 * Formato JSON refinado retornado pelo Claude
 */
export interface RefinedBrief {
  identity: {
    company_name: string;
    description: string; // 1-2 frases limpas
    elevator_pitch: string; // versão expandida 3-4 frases
  };
  audience: {
    ideal_customer: string;
    demographics?: string;
    main_pain: string;
  };
  positioning: {
    differentials: string[];
    unique_value: string;
  };
  voice: {
    tone: string; // resumo unificado
    style_notes: string;
    expressions_to_use?: string[];
    expressions_to_avoid?: string[];
  };
  seo: {
    primary_keywords: string[];
    secondary_keywords: string[];
  };
  visibility_goal: {
    target_questions: string[]; // perguntas onde quer aparecer em IAs
  };
  market: {
    competitors: string[];
  };
  storytelling: {
    case_summaries: string[];
  };
  migration?: {
    existing_urls: string[];
  };
}

export interface RawAnswer {
  value: string;
  source: "text" | "audio" | "mixed";
  audio_url?: string;
  audio_transcript?: string;
  updated_at: string;
}

export type RawAnswers = Record<string, RawAnswer>;
