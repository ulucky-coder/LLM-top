-- ============================================================
-- KNOWLEDGE BASE — База знаний для Personal Strategic Advisor
-- ============================================================
-- Хранит методологии, frameworks, образы мышления гениев
-- Используется агентами как reference при анализе
-- ============================================================

-- Включить pgvector (если ещё не включён)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- Таблица: advisor_knowledge
-- ============================================================
CREATE TABLE IF NOT EXISTS advisor_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Источник
  source_url TEXT,
  source_type TEXT NOT NULL,                -- article, book, video, paper, thread
  title TEXT NOT NULL,
  author TEXT,

  -- Категория
  category TEXT NOT NULL,                   -- strategy, analytics, psychology, genius_mind
  subcategory TEXT,                         -- first_principles, game_theory, cognitive_bias, etc.
  tags TEXT[] DEFAULT '{}',                 -- дополнительные теги

  -- Контент
  content TEXT,                             -- полный текст (если доступен)
  summary TEXT,                             -- краткое summary (всегда генерируется)
  key_insights JSONB DEFAULT '[]',          -- [{insight, importance}]
  frameworks JSONB DEFAULT '[]',            -- [{name, description, when_to_use}]
  quotes JSONB DEFAULT '[]',                -- [{quote, context}]

  -- Применение
  use_cases JSONB DEFAULT '[]',             -- когда применять
  related_concepts TEXT[] DEFAULT '{}',     -- связанные концепции

  -- Векторный поиск
  embedding vector(1536),                   -- OpenAI ada-002 embedding

  -- Качество
  quality_score INTEGER DEFAULT 5,          -- 1-10, насколько ценный источник
  processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  processing_error TEXT,

  -- Мета
  language TEXT DEFAULT 'en',               -- en, ru
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- ============================================================
-- Индексы
-- ============================================================

-- Категории
CREATE INDEX idx_knowledge_category ON advisor_knowledge(category);
CREATE INDEX idx_knowledge_subcategory ON advisor_knowledge(category, subcategory);
CREATE INDEX idx_knowledge_status ON advisor_knowledge(processing_status);

-- Полнотекстовый поиск
CREATE INDEX idx_knowledge_title_fts ON advisor_knowledge
  USING gin(to_tsvector('english', title));
CREATE INDEX idx_knowledge_content_fts ON advisor_knowledge
  USING gin(to_tsvector('english', coalesce(content, '') || ' ' || coalesce(summary, '')));

-- Векторный поиск
CREATE INDEX idx_knowledge_embedding ON advisor_knowledge
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Теги
CREATE INDEX idx_knowledge_tags ON advisor_knowledge USING gin(tags);

-- ============================================================
-- Таблица: advisor_knowledge_chunks
-- Для длинных документов — разбивка на chunks
-- ============================================================
CREATE TABLE IF NOT EXISTS advisor_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id UUID NOT NULL REFERENCES advisor_knowledge(id) ON DELETE CASCADE,

  -- Chunk
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,

  -- Векторный поиск
  embedding vector(1536),

  -- Мета
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chunks_knowledge ON advisor_knowledge_chunks(knowledge_id, chunk_index);
CREATE INDEX idx_chunks_embedding ON advisor_knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- Функция: semantic_search_knowledge
-- ============================================================
CREATE OR REPLACE FUNCTION semantic_search_knowledge(
  query_embedding vector(1536),
  match_count INTEGER DEFAULT 5,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  category TEXT,
  summary TEXT,
  key_insights JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.title,
    k.category,
    k.summary,
    k.key_insights,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM advisor_knowledge k
  WHERE
    k.processing_status = 'completed'
    AND k.embedding IS NOT NULL
    AND (filter_category IS NULL OR k.category = filter_category)
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- Функция: update_updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_knowledge_updated_at
  BEFORE UPDATE ON advisor_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Начальные данные: категории и субкатегории (для reference)
-- ============================================================
COMMENT ON TABLE advisor_knowledge IS '
Categories:
- strategy: Strategic thinking, decision-making frameworks
- analytics: Data analysis, statistical methods, quantitative thinking
- psychology: Cognitive biases, mental models, behavioral patterns
- genius_mind: Mental models of great thinkers (Musk, Buffett, Feynman, etc.)

Subcategories (examples):
- strategy: first_principles, game_theory, systems_thinking, ooda_loop
- analytics: bayesian, statistical, forecasting, modeling
- psychology: cognitive_bias, mental_models, decision_making, persuasion
- genius_mind: musk, buffett, feynman, munger, bezos
';
