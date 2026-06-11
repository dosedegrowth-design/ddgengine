/**
 * Tutoriais passo-a-passo de como ADICIONAR 1 REGISTRO CNAME nos 5 principais
 * registradores brasileiros. Usado no wizard /settings/integration step 2.
 *
 * NOVO MODELO (CNAME): o cliente NÃO troca nameserver, NÃO mexe no site nem
 * no email. Só ADICIONA 1 registro CNAME na zona DNS:
 *   - Tipo:  CNAME
 *   - Nome/Host:  blog
 *   - Valor/Destino:  cname.conteudai.com.br
 *   - TTL:  automático / 3600
 * O blog fica em blog.{dominio}.
 *
 * Fontes verificadas em 2026-06 (registradores mudam UI com frequência —
 * revisar a cada 6 meses).
 *
 * Estratégia visual: descrição textual precisa + mock de tela (suficiente pra
 * cliente leigo se localizar). Próxima rodada: screenshots reais hospedados
 * em Supabase Storage.
 */

/**
 * Mock UI inline — desenha uma representação simplificada do que o cliente
 * vai ver no painel do registrador. NÃO substitui screenshot real, mas dá
 * uma referência visual enquanto a gente não tem fotos.
 *
 * - sidebar-nav: barra lateral com itens (1 destacado com lime)
 * - dns-record-form: formulário de adicionar registro (Tipo/Nome/Valor/TTL)
 * - toggle: switch on/off
 * - radio-choice: 2 opções de radio (a marcada destacada)
 * - button-row: botão pílula destacado (ex: "Adicionar registro")
 * - login-form: tela genérica de login (email/senha)
 */
export type StepMock =
  | { type: "sidebar-nav"; items: string[]; highlightIndex: number }
  | {
      type: "dns-record-form";
      recordType: string;
      name: string;
      value: string;
      ttl?: string;
    }
  | { type: "toggle"; label: string; state: "on" | "off" }
  | { type: "radio-choice"; options: string[]; selectedIndex: number }
  | { type: "button-row"; buttonLabel: string; context?: string }
  | { type: "login-form"; brand: string };

export interface TutorialStep {
  /** Número do passo (1, 2, 3...) */
  num: number;
  /** Título curto. Ex: "Faça login" */
  title: string;
  /** Instrução detalhada com nomes literais de botões/links */
  description: string;
  /** Texto literal que vai aparecer na tela (em "negrito" pra destacar) */
  uiHint?: string;
  /** Aviso/cuidado pro cliente */
  warning?: string;
  /** Nota positiva/tranquilizadora (ex: "não afeta seu email nem seu site") */
  note?: string;
  /** Screenshot real (futuro — Supabase Storage). Se presente, substitui o mock. */
  screenshot?: { url: string; alt: string };
  /** Mock UI inline pra dar referência visual sem screenshot. */
  mock?: StepMock;
}

export interface Registrar {
  /** Slug usado em URLs e como chave */
  id: string;
  /** Nome de exibição */
  name: string;
  /** Texto curto explicativo */
  tagline: string;
  /** % aproximada de mercado BR — pra ordenar */
  marketShareBR: number;
  /** Cor de destaque (Tailwind class) */
  accentClass: string;
  /** Logo placeholder (texto/emoji) */
  logoText: string;
  /** Onde o cliente faz login */
  loginUrl: string;
  /** Link pra tutorial oficial do registrador (fallback) */
  officialTutorialUrl: string;
  /** Tempo estimado total */
  estimatedMinutes: number;
  /** Passos */
  steps: TutorialStep[];
  /** Dicas comuns (problemas/erros que o cliente pode ter) */
  commonIssues?: Array<{ q: string; a: string }>;
}

/** Valores do registro CNAME que o cliente vai cadastrar (constantes do produto). */
export const CNAME_NAME = "blog";
export const CNAME_TARGET = "cname.conteudai.com.br";

// ============================================================
// REGISTRO.BR
// ============================================================
const REGISTRO_BR: Registrar = {
  id: "registrobr",
  name: "Registro.br",
  tagline: "Domínios .com.br · .br · .net.br",
  marketShareBR: 80,
  accentClass: "bg-blue-50 border-blue-300 text-blue-900",
  logoText: ".br",
  loginUrl: "https://registro.br/",
  officialTutorialUrl: "https://ajuda.registro.br/",
  estimatedMinutes: 4,
  steps: [
    {
      num: 1,
      title: "Faça login no Registro.br",
      description:
        "Acesse registro.br no navegador e clique em 'Acessar conta' no canto superior direito. Use o CPF/CNPJ do titular do domínio + senha.",
      uiHint: "Botão **Acessar conta** (canto superior direito)",
      mock: { type: "login-form", brand: "Registro.br" },
    },
    {
      num: 2,
      title: "Selecione o domínio",
      description:
        "Após logar, você verá a lista dos seus domínios. Clique sobre o domínio que quer conectar com a Conteudai.",
      uiHint: "Clica no nome do domínio (não no botão Renovar)",
    },
    {
      num: 3,
      title: "Vá em 'DNS' → 'Editar Zona'",
      description:
        "Na página do domínio, localize a seção 'DNS' e clique em 'Editar Zona' (também aparece como 'Editar zona DNS'). É aqui que você adiciona registros sem mexer nos nameservers.",
      uiHint: "Botão **Editar Zona** dentro do bloco DNS",
      mock: {
        type: "button-row",
        buttonLabel: "Editar Zona",
        context: "Seção DNS",
      },
    },
    {
      num: 4,
      title: "Adicione 1 registro CNAME",
      description:
        "No editor de zona, clique em 'Adicionar registro'. Preencha: no campo do nome digite 'blog', escolha o tipo 'CNAME' e no valor/destino cole 'cname.conteudai.com.br'. Deixe o TTL no padrão.",
      uiHint: "Tipo **CNAME** · Nome **blog** · Valor **cname.conteudai.com.br**",
      note:
        "Isso só ADICIONA um registro novo. Não afeta seu email (MX) nem o seu site atual — só cria o blog.seudominio.",
      mock: {
        type: "dns-record-form",
        recordType: "CNAME",
        name: CNAME_NAME,
        value: CNAME_TARGET,
        ttl: "3600 (automático)",
      },
    },
    {
      num: 5,
      title: "Salvar",
      description:
        "Clique em 'Salvar' no fim da página do editor de zona. A propagação leva de 30 minutos a algumas horas. A gente avisa por email quando o blog estiver no ar.",
      uiHint: "Botão **Salvar** azul no fim",
    },
  ],
  commonIssues: [
    {
      q: "Esqueci a senha do Registro.br",
      a: "Clica em 'Esqueceu a senha?' na tela de login. O Registro.br manda um link de recuperação pro email cadastrado.",
    },
    {
      q: "Não acho 'Editar Zona'",
      a: "Tem que estar dentro da página do domínio, no bloco 'DNS'. Se o domínio estiver usando nameservers de outro provedor (não os do Registro.br), o 'Editar Zona' some — nesse caso o CNAME deve ser criado no painel desse outro provedor. Na dúvida, chama a gente no WhatsApp.",
    },
    {
      q: "Posso digitar 'blog' ou tem que ser o nome completo?",
      a: "Pode digitar só 'blog'. O Registro.br completa com o seu domínio automaticamente (vira blog.seudominio.com.br).",
    },
  ],
};

// ============================================================
// HOSTGATOR
// ============================================================
const HOSTGATOR: Registrar = {
  id: "hostgator",
  name: "HostGator",
  tagline: "Domínios + hospedagem",
  marketShareBR: 8,
  accentClass: "bg-orange-50 border-orange-300 text-orange-900",
  logoText: "HG",
  loginUrl: "https://portal.hostgator.com.br/",
  officialTutorialUrl:
    "https://suporte.hostgator.com.br/hc/pt-br/articles/30810621770387",
  estimatedMinutes: 5,
  steps: [
    {
      num: 1,
      title: "Acesse o Portal do Cliente",
      description:
        "Vai em portal.hostgator.com.br e faz login com seu email + senha cadastrados.",
      uiHint: "Tela de login do **Portal do Cliente HostGator**",
    },
    {
      num: 2,
      title: "Abra o Gerenciador de DNS (Zone Editor)",
      description:
        "Se o seu domínio usa a hospedagem da HostGator, entre no cPanel e procure o 'Zone Editor' (Editor de Zona). Se for só domínio, no Portal vá em 'Domínios' → seu domínio → 'Gerenciar DNS'.",
      uiHint: "**cPanel → Zone Editor** ou **Domínios → Gerenciar DNS**",
      mock: {
        type: "sidebar-nav",
        items: ["Início", "Hospedagem", "Domínios", "Email", "Faturas"],
        highlightIndex: 2,
      },
    },
    {
      num: 3,
      title: "Clique em 'Gerenciar' / '+ Registro'",
      description:
        "Na linha do seu domínio, clique em 'Gerenciar' (no Zone Editor) ou no botão '+ Registro CNAME' / 'Adicionar registro'.",
      uiHint: "Botão **Gerenciar** / **+ Registro CNAME**",
      mock: { type: "button-row", buttonLabel: "+ Registro CNAME" },
    },
    {
      num: 4,
      title: "Adicione 1 registro CNAME",
      description:
        "Preencha o formulário: Nome/Host = 'blog', Tipo = 'CNAME', Destino/CNAME = 'cname.conteudai.com.br'. TTL pode deixar no padrão (3600).",
      uiHint: "Tipo **CNAME** · Nome **blog** · Destino **cname.conteudai.com.br**",
      note:
        "Você está só ADICIONANDO um registro. Seu email e seu site atual continuam intactos.",
      mock: {
        type: "dns-record-form",
        recordType: "CNAME",
        name: CNAME_NAME,
        value: CNAME_TARGET,
        ttl: "3600",
      },
    },
    {
      num: 5,
      title: "Salvar",
      description:
        "Clica em 'Adicionar registro' / 'Salvar'. A propagação leva até 24h, mas geralmente fica pronto em ~4h.",
    },
  ],
  commonIssues: [
    {
      q: "Não acho o 'Zone Editor' no cPanel",
      a: "Use a busca do cPanel e digite 'zona' ou 'zone'. Se o domínio for só registrado (sem hospedagem HostGator), o caminho é pelo Portal do Cliente em 'Domínios' → 'Gerenciar DNS'.",
    },
    {
      q: "Ele pede '.' no fim do valor?",
      a: "Alguns painéis aceitam 'cname.conteudai.com.br' e outros 'cname.conteudai.com.br.' (com ponto no fim). Se der erro, tente com o ponto final. Na dúvida, chama a gente.",
    },
  ],
};

// ============================================================
// LOCAWEB
// ============================================================
const LOCAWEB: Registrar = {
  id: "locaweb",
  name: "Locaweb",
  tagline: "Hospedagem brasileira tradicional",
  marketShareBR: 6,
  accentClass: "bg-purple-50 border-purple-300 text-purple-900",
  logoText: "LW",
  loginUrl: "https://painel.locaweb.com.br/",
  officialTutorialUrl:
    "https://www.locaweb.com.br/ajuda/wiki/como-configurar-as-entradas-de-dns-do-meu-dominio/",
  estimatedMinutes: 4,
  steps: [
    {
      num: 1,
      title: "Login no Painel Locaweb",
      description:
        "Acesse painel.locaweb.com.br e entre com seu usuário + senha (geralmente o CPF/CNPJ ou email).",
      uiHint: "Tela de login do **Painel Locaweb**",
    },
    {
      num: 2,
      title: "Menu 'Meus Domínios'",
      description:
        "Localize a seção 'Domínios' (ou 'Meus Domínios') no painel principal. Clique pra abrir a lista.",
      uiHint: "Card/menu **Meus Domínios**",
    },
    {
      num: 3,
      title: "Abra a 'Zona DNS' do domínio",
      description:
        "Encontre o domínio e clique em 'Administrar'. Depois entre em 'Zona DNS' (ou 'Editar Zona DNS').",
      uiHint: "**Administrar** → **Zona DNS**",
      mock: {
        type: "button-row",
        buttonLabel: "Zona DNS",
        context: "Administrar domínio",
      },
    },
    {
      num: 4,
      title: "Adicione 1 registro CNAME",
      description:
        "Clique em 'Adicionar entrada' / 'Novo registro'. Em Nome digite 'blog', escolha o tipo 'CNAME' e no campo de destino cole 'cname.conteudai.com.br'. TTL no padrão.",
      uiHint: "Tipo **CNAME** · Nome **blog** · Destino **cname.conteudai.com.br**",
      note:
        "É só uma entrada nova na zona. Não mexe nos seus emails (MX) nem no site que já está no ar.",
      mock: {
        type: "dns-record-form",
        recordType: "CNAME",
        name: CNAME_NAME,
        value: CNAME_TARGET,
        ttl: "3600",
      },
    },
    {
      num: 5,
      title: "Salvar",
      description:
        "Clique em 'Salvar' / 'Adicionar'. A propagação na Locaweb costuma ser rápida — entre 30 min e 3h.",
      uiHint: "Botão **Salvar**",
    },
  ],
  commonIssues: [
    {
      q: "Não aparece 'Zona DNS', só 'Alterar DNS'",
      a: "Se só aparece a opção de trocar nameservers, é porque o domínio está apontado pra outro provedor. Nesse caso o CNAME deve ser criado no painel do provedor que controla o DNS. Chama a gente no WhatsApp que descobrimos qual é.",
    },
    {
      q: "Propagação Locaweb é rápida ou demora?",
      a: "Geralmente entre 30 min e 3h. Mais rápida que outros registradores.",
    },
  ],
};

// ============================================================
// HOSTINGER
// ============================================================
const HOSTINGER: Registrar = {
  id: "hostinger",
  name: "Hostinger",
  tagline: "hPanel — interface moderna",
  marketShareBR: 4,
  accentClass: "bg-violet-50 border-violet-300 text-violet-900",
  logoText: "hp",
  loginUrl: "https://hpanel.hostinger.com/",
  officialTutorialUrl:
    "https://www.hostinger.com/br/tutoriais/como-apontar-dominio-cname",
  estimatedMinutes: 4,
  steps: [
    {
      num: 1,
      title: "Login no hPanel",
      description:
        "Acesse hpanel.hostinger.com e entre com email + senha (ou faça login com Google).",
      uiHint: "Login do **hPanel**",
    },
    {
      num: 2,
      title: "Seção 'Domínios'",
      description:
        "No menu principal, clique em 'Domínios'. Aparece a lista dos domínios da sua conta.",
      uiHint: "Item **Domínios** no menu",
      mock: {
        type: "sidebar-nav",
        items: ["Home", "Hospedagem", "Domínios", "Emails", "Pagamentos"],
        highlightIndex: 2,
      },
    },
    {
      num: 3,
      title: "DNS / Nameservers → Gerenciar registros DNS",
      description:
        "Clique em 'Gerenciar' no domínio, vá na aba 'DNS / Nameservers' e role até 'Gerenciar registros DNS' (onde aparece a lista de registros A, CNAME, MX etc).",
      uiHint: "**DNS / Nameservers** → **Gerenciar registros DNS**",
    },
    {
      num: 4,
      title: "Adicione 1 registro CNAME",
      description:
        "No bloco 'Adicionar novo registro', escolha o Tipo 'CNAME', no campo 'Nome' digite 'blog' e em 'Aponta para' (Target) cole 'cname.conteudai.com.br'. TTL pode deixar automático.",
      uiHint: "Tipo **CNAME** · Nome **blog** · Aponta para **cname.conteudai.com.br**",
      note:
        "Só estamos adicionando um registro. Sua hospedagem, seu site e seus emails na Hostinger continuam funcionando normalmente.",
      mock: {
        type: "dns-record-form",
        recordType: "CNAME",
        name: CNAME_NAME,
        value: CNAME_TARGET,
        ttl: "Automático",
      },
    },
    {
      num: 5,
      title: "Salvar",
      description:
        "Clique em 'Adicionar registro'. Ele entra na lista logo abaixo. A propagação leva de minutos a algumas horas.",
      uiHint: "Botão **Adicionar registro**",
    },
  ],
  commonIssues: [
    {
      q: "Vou perder a hospedagem da Hostinger?",
      a: "Não. Como você está só ADICIONANDO um registro CNAME (e não trocando os nameservers), seu site e seus emails na Hostinger continuam intactos. O blog fica num subdomínio separado.",
    },
    {
      q: "Já existe um registro 'blog'?",
      a: "Se já houver um registro com o nome 'blog', apague o antigo antes de criar o CNAME novo — não dá pra ter dois com o mesmo nome. Na dúvida, chama a gente no WhatsApp.",
    },
  ],
};

// ============================================================
// GODADDY
// ============================================================
const GODADDY: Registrar = {
  id: "godaddy",
  name: "GoDaddy",
  tagline: "Domínios .com / .net internacionais",
  marketShareBR: 3,
  accentClass: "bg-green-50 border-green-300 text-green-900",
  logoText: "GD",
  loginUrl: "https://br.godaddy.com/",
  officialTutorialUrl:
    "https://br.godaddy.com/help/adicionar-um-registro-cname-19236",
  estimatedMinutes: 4,
  steps: [
    {
      num: 1,
      title: "Login no GoDaddy",
      description:
        "Acesse br.godaddy.com e faça login no canto superior direito.",
      uiHint: "**Entrar** no topo da página",
    },
    {
      num: 2,
      title: "Meus Produtos → Domínios",
      description:
        "Clique no seu nome (canto superior) → 'Meus Produtos' → 'Domínios'.",
      uiHint: "**Meus Produtos** → **Domínios**",
    },
    {
      num: 3,
      title: "Gerenciar DNS",
      description:
        "Encontre o domínio. Clique em 'DNS' ou nos três pontinhos (•••) e selecione 'Gerenciar zonas' / 'Gerenciar DNS'. Vai abrir a lista de registros.",
      uiHint: "Menu **Gerenciar DNS** / **Gerenciar zonas**",
      mock: {
        type: "button-row",
        buttonLabel: "Gerenciar DNS",
        context: "Linha do domínio",
      },
    },
    {
      num: 4,
      title: "Adicione 1 registro CNAME",
      description:
        "Clique em 'Adicionar' / 'Adicionar registro'. Em Tipo escolha 'CNAME', em Nome/Host digite 'blog' e em 'Valor' (Aponta para) cole 'cname.conteudai.com.br'. TTL no padrão (1 hora).",
      uiHint: "Tipo **CNAME** · Nome **blog** · Valor **cname.conteudai.com.br**",
      note:
        "É um registro novo. Não mexe no que já está configurado — seu email e site continuam iguais.",
      mock: {
        type: "dns-record-form",
        recordType: "CNAME",
        name: CNAME_NAME,
        value: CNAME_TARGET,
        ttl: "1 hora",
      },
    },
    {
      num: 5,
      title: "Salvar",
      description:
        "Clica em 'Salvar'. A GoDaddy aplica em alguns minutos (pode levar até algumas horas pra propagar).",
      uiHint: "Botão **Salvar**",
    },
  ],
  commonIssues: [
    {
      q: "A GoDaddy pede o valor com ponto no final?",
      a: "Geralmente não, mas se der erro ao salvar, tente 'cname.conteudai.com.br.' com ponto no fim.",
    },
  ],
};

// ============================================================
// EXPORT
// ============================================================
export const REGISTRARS: Registrar[] = [
  REGISTRO_BR,
  HOSTGATOR,
  LOCAWEB,
  HOSTINGER,
  GODADDY,
];

export function getRegistrarById(id: string): Registrar | undefined {
  return REGISTRARS.find((r) => r.id === id);
}
