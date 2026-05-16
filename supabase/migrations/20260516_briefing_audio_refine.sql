-- Migration: estende tabela briefings pra suportar fluxo de onboarding novo
-- com áudio transcrito + refine via Claude + versionamento

-- Adiciona colunas se ainda não existirem
ALTER TABLE briefings
  ADD COLUMN IF NOT EXISTS raw_answers JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS refined_brief JSONB,
  ADD COLUMN IF NOT EXISTS audio_transcripts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'guided' CHECK (mode IN ('guided', 'audio_free', 'minimal')),
  ADD COLUMN IF NOT EXISTS completion_status TEXT DEFAULT 'in_progress'
    CHECK (completion_status IN ('in_progress', 'review', 'completed')),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Comentários pra documentação
COMMENT ON COLUMN briefings.raw_answers IS
  'Respostas brutas do quiz por pergunta: { q1: { value: "texto", source: "text"|"audio"|"mixed", audio_url?: "..." } }';
COMMENT ON COLUMN briefings.refined_brief IS
  'Versão estruturada pelo Claude após o usuário aprovar — JSON tipado com seções (identity, voice, audience, etc)';
COMMENT ON COLUMN briefings.audio_transcripts IS
  'Array de transcripts: [{ id, question_id, audio_url, transcript, duration_sec, created_at }]';
COMMENT ON COLUMN briefings.mode IS
  'Modo de preenchimento escolhido pelo usuário no início';
COMMENT ON COLUMN briefings.completion_status IS
  'Estado do briefing: in_progress (preenchendo) | review (revisando ficha) | completed (OK final)';

-- Índice pra busca rápida por org + status
CREATE INDEX IF NOT EXISTS idx_briefings_org_status
  ON briefings (organization_id, completion_status);

-- RLS: usuário só vê briefings da própria org
-- (assume policy já existente; só garante)
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;

-- Storage bucket pra áudios (criado via Supabase Dashboard ou SQL admin)
-- Recomendação: bucket 'briefing-audios' com policy 'org members only'
-- (executar manualmente no Supabase Dashboard)
