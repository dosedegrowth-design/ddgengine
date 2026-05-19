/**
 * Tutoriais passo-a-passo de como trocar nameservers nos 5 principais
 * registradores brasileiros. Usado no wizard /settings/integration step 2.
 *
 * Fontes verificadas em 2026-05 (registradores mudam UI com frequência —
 * revisar a cada 6 meses).
 *
 * Estratégia visual: descrição textual precisa + ASCII diagram de tela
 * (suficiente pra cliente leigo se localizar). Próxima rodada: screenshots
 * reais hospedados em Supabase Storage.
 */

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
  estimatedMinutes: 5,
  steps: [
    {
      num: 1,
      title: "Faça login no Registro.br",
      description:
        "Acesse registro.br no navegador e clique em 'Acessar conta' no canto superior direito. Use o CPF/CNPJ do titular do domínio + senha.",
      uiHint: "Botão **Acessar conta** (canto superior direito)",
      warning:
        "Importante: precisa logar com o ID Administrativo ou Técnico do domínio. Outros perfis não podem trocar DNS.",
    },
    {
      num: 2,
      title: "Selecione o domínio",
      description:
        "Após logar, você verá a lista dos seus domínios. Clique sobre o domínio que quer conectar com a DDG Engine.",
      uiHint: "Clica no nome do domínio (não no botão Renovar)",
    },
    {
      num: 3,
      title: "Vá em 'Alterar servidores DNS'",
      description:
        "Role a tela até encontrar a seção 'DNS'. Clique no botão 'Alterar servidores DNS' (também pode aparecer como 'Editar DNS').",
      uiHint: "Botão **Alterar servidores DNS** dentro do bloco DNS",
    },
    {
      num: 4,
      title: "Substitua os 2 nameservers",
      description:
        "Apague os DNS atuais nos campos 'MASTER' e 'SLAVE 1'. Cole os 2 nameservers que mostramos acima nesse painel. Não precisa preencher SLAVE 2/3.",
      uiHint: "Campos **MASTER** e **SLAVE 1**",
      warning:
        "Se você usa email no domínio (ex: contato@seusite.com.br), a gente migra os registros MX juntos pra não derrubar. Fala com nossa equipe no WhatsApp antes de seguir.",
    },
    {
      num: 5,
      title: "Salvar",
      description:
        "Clique em 'Salvar dados' (ou 'Salvar') no fim da página. A propagação leva de 30 minutos a 4 horas. A gente avisa por email quando estiver no ar.",
      uiHint: "Botão **Salvar dados** azul no fim",
    },
  ],
  commonIssues: [
    {
      q: "Esqueci a senha do Registro.br",
      a: "Clica em 'Esqueceu a senha?' na tela de login. O Registro.br manda um link de recuperação pro email cadastrado.",
    },
    {
      q: "Não acho o botão 'Alterar servidores DNS'",
      a: "Tem que rolar a tela bem pra baixo dentro da página do domínio. Fica entre 'Pagamento' e 'Contatos'.",
    },
    {
      q: "Não consigo logar — diz que não sou autorizado",
      a: "Só os IDs Administrativo e Técnico podem trocar DNS. Se você é o titular, está nesse grupo. Se você comprou o domínio em nome de outra pessoa, peça pra ela fazer o login (ou nos chama no WhatsApp pra fazer junto).",
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
      title: "Menu Domínios",
      description:
        "No menu lateral esquerdo (sidebar), clique em 'Domínios'. Vai abrir a lista de domínios cadastrados.",
      uiHint: "Item **Domínios** no menu lateral",
    },
    {
      num: 3,
      title: "Achar e selecionar o domínio",
      description:
        "Procure o domínio que quer conectar. À direita dele tem o botão 'Alterar DNS' — clica nele.",
      uiHint: "Botão **Alterar DNS** na linha do domínio",
    },
    {
      num: 4,
      title: "Escolher 'Outro Servidor'",
      description:
        "Vai aparecer opção 'DNS HostGator' ou 'Outro Servidor'. Marca 'Outro Servidor' e cola os 2 nameservers que mostramos no painel DDG nos campos Master e Slave.",
      uiHint: "Radio **Outro Servidor** + campos Master/Slave",
    },
    {
      num: 5,
      title: "Salvar",
      description:
        "Clica em 'Salvar' no fim. A propagação leva até 24h, mas geralmente fica pronto em ~4h.",
    },
  ],
  commonIssues: [
    {
      q: "Aparece só 1 campo de DNS",
      a: "Clica em 'Adicionar mais um Slave' pra liberar o segundo campo.",
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
    "https://www.locaweb.com.br/ajuda/wiki/como-alterar-os-dns-dos-dominios-registrados-na-locaweb-registro-de-dominio/",
  estimatedMinutes: 5,
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
      title: "Administrar o domínio",
      description:
        "Encontre o domínio e clique em 'Administrar' (botão azul à direita).",
      uiHint: "Botão **Administrar** ao lado do domínio",
    },
    {
      num: 4,
      title: "Desativar 'Usar nameservers da Locaweb'",
      description:
        "Vai aparecer uma chave/toggle 'Usar nameservers da Locaweb'. Desligue ela.",
      uiHint: "Toggle **Usar nameservers da Locaweb** → OFF",
    },
    {
      num: 5,
      title: "Alterar nameservers",
      description:
        "Clique em 'Alterar'. Apague os valores Primário, Secundário e Terciário antigos. Cole os 2 nameservers DDG nos 2 primeiros campos. Deixe o terceiro vazio. Clique em 'Salvar'.",
      uiHint: "Campos **Primário** e **Secundário** + botão **Salvar**",
    },
  ],
  commonIssues: [
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
    "https://www.hostinger.com/br/tutoriais/como-alterar-os-nameservers-de-dominio-de-ponto-para-o-novo-provedor-de-hospedagem",
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
    },
    {
      num: 3,
      title: "Gerenciar o domínio",
      description:
        "Ao lado do domínio que quer conectar, clique em 'Gerenciar' (ou ícone de engrenagem).",
      uiHint: "Botão **Gerenciar** na linha do domínio",
    },
    {
      num: 4,
      title: "Alterar nameservers",
      description:
        "Na coluna esquerda, vá em 'DNS / Nameservers'. Clica em 'Alterar' no card 'Nameservers'.",
      uiHint: "**DNS / Nameservers** → botão **Alterar**",
    },
    {
      num: 5,
      title: "Modo 'Alterar nameservers'",
      description:
        "Selecione 'Alterar nameservers' (não 'Usar nameservers da Hostinger'). Cole os 2 nameservers DDG nos campos Nameserver 1 e Nameserver 2. Clique em 'Salvar'.",
      uiHint: "Modo **Alterar nameservers** + campos NS1/NS2",
    },
  ],
  commonIssues: [
    {
      q: "Vou perder a hospedagem da Hostinger?",
      a: "Se você usa a Hostinger pra hospedar o site, sim — o site principal vai parar de funcionar quando trocar os NS. Nesse caso fale com a gente no WhatsApp antes pra a gente migrar tudo junto.",
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
    "https://br.godaddy.com/help/alterar-servidores-de-nomes-664",
  estimatedMinutes: 5,
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
      title: "Menu 'Meus Produtos' → Domínios",
      description:
        "Clique no seu nome (canto superior) → 'Meus Produtos' → 'Domínios'.",
      uiHint: "**Meus Produtos** → **Domínios**",
    },
    {
      num: 3,
      title: "Gerenciar DNS",
      description:
        "Encontre o domínio. Clique em 'DNS' ou nos três pontinhos (•••) e selecione 'Gerenciar DNS'.",
      uiHint: "Botão **DNS** ou menu **Gerenciar DNS**",
    },
    {
      num: 4,
      title: "Trocar nameservers",
      description:
        "Role até 'Nameservers' (Servidores de Nome). Clica em 'Alterar' → escolhe 'Inserir meus próprios servidores de nome'. Cole os 2 nameservers DDG.",
      uiHint: "**Inserir meus próprios servidores de nome**",
    },
    {
      num: 5,
      title: "Salvar",
      description:
        "Marca a caixa 'Compreendo os riscos' e clica em 'Salvar'. Propagação até 48h (geralmente 4h).",
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
