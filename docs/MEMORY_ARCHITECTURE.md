# Memory Architecture — Personal Strategic Advisor

## Философия памяти

```
Память — это не лог диалогов.
Память — это структурированное знание о человеке,
которое позволяет давать точные стратегические рекомендации.
```

---

## Слои памяти

```
┌─────────────────────────────────────────────────────────────┐
│                    MEMORY LAYERS                            │
├─────────────────────────────────────────────────────────────┤
│  L1: PROFILE (static/slow-changing)                         │
│      Кто ты, ценности, долгосрочные цели                    │
├─────────────────────────────────────────────────────────────┤
│  L2: PROJECTS (active)                                      │
│      Текущие проекты, цели, метрики, статусы                │
├─────────────────────────────────────────────────────────────┤
│  L3: DECISIONS (pending)                                    │
│      Незавершённые решения, открытые вопросы                │
├─────────────────────────────────────────────────────────────┤
│  L4: PATTERNS (behavioral)                                  │
│      Паттерны, привычки, когнитивные искажения              │
├─────────────────────────────────────────────────────────────┤
│  L5: INSIGHTS (derived)                                     │
│      Выводы агентов, рекомендации, прогнозы                 │
├─────────────────────────────────────────────────────────────┤
│  L6: HISTORY (raw)                                          │
│      Полные диалоги (векторный поиск)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## L1: Profile — Кто ты

### Таблица: `advisor_profile`

```sql
CREATE TABLE advisor_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,

  -- Идентичность
  core_values JSONB DEFAULT '[]',           -- ["честность", "эффективность", ...]
  life_principles JSONB DEFAULT '[]',       -- принципы принятия решений
  long_term_vision TEXT,                    -- видение на 5-10 лет

  -- Контекст
  current_role TEXT,                        -- "предприниматель", "CEO", etc.
  industries JSONB DEFAULT '[]',            -- сферы деятельности
  skills JSONB DEFAULT '[]',                -- ключевые навыки

  -- Ограничения
  constraints JSONB DEFAULT '[]',           -- ограничения (время, ресурсы, здоровье)
  risk_tolerance TEXT,                      -- "low", "medium", "high"

  -- Мета
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Пример данных

```json
{
  "core_values": ["эффективность", "глубина", "системность"],
  "life_principles": [
    "Если можно посчитать — нужно посчитать",
    "Решения на основе данных, не интуиции"
  ],
  "long_term_vision": "Построить AI-driven HR компанию топ-3 в СНГ",
  "current_role": "Founder",
  "industries": ["HR Tech", "AI", "HoReCa"],
  "risk_tolerance": "medium"
}
```

---

## L2: Projects — Активные проекты

### Таблица: `advisor_projects`

```sql
CREATE TABLE advisor_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- Проект
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',             -- active, paused, completed, dropped
  priority INTEGER DEFAULT 5,               -- 1-10

  -- Цели
  goals JSONB DEFAULT '[]',                 -- [{goal, metric, target, deadline}]
  current_metrics JSONB DEFAULT '{}',       -- текущие значения метрик

  -- Контекст
  stakeholders JSONB DEFAULT '[]',          -- кто вовлечён
  dependencies JSONB DEFAULT '[]',          -- от чего зависит
  risks JSONB DEFAULT '[]',                 -- риски

  -- Связи
  related_decisions UUID[],                 -- связанные решения

  -- Мета
  started_at TIMESTAMPTZ,
  target_completion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_user_status ON advisor_projects(user_id, status);
```

### Пример данных

```json
{
  "name": "NEXUS Platform",
  "description": "Talent-as-a-Service для HoReCa",
  "status": "active",
  "priority": 9,
  "goals": [
    {
      "goal": "MVP запущен",
      "metric": "candidates_screened",
      "target": 100,
      "deadline": "2026-03-01"
    },
    {
      "goal": "Первый клиент",
      "metric": "paying_customers",
      "target": 1,
      "deadline": "2026-03-15"
    }
  ],
  "current_metrics": {
    "candidates_screened": 0,
    "paying_customers": 0
  },
  "risks": [
    {"risk": "Сложность AI-скрининга", "probability": "medium", "impact": "high"}
  ]
}
```

---

## L3: Decisions — Незавершённые решения

### Таблица: `advisor_decisions`

```sql
CREATE TABLE advisor_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- Решение
  question TEXT NOT NULL,                   -- формулировка вопроса
  context TEXT,                             -- контекст решения
  options JSONB DEFAULT '[]',               -- варианты [{option, pros, cons, agents_opinion}]

  -- Статус
  status TEXT DEFAULT 'open',               -- open, decided, deferred, cancelled
  urgency TEXT DEFAULT 'medium',            -- low, medium, high, critical
  importance TEXT DEFAULT 'medium',         -- low, medium, high, critical

  -- Дедлайн
  deadline TIMESTAMPTZ,
  remind_at TIMESTAMPTZ,                    -- когда напомнить
  reminded_count INTEGER DEFAULT 0,

  -- Результат
  decision TEXT,                            -- принятое решение
  decision_rationale TEXT,                  -- почему
  decided_at TIMESTAMPTZ,

  -- Связи
  project_id UUID REFERENCES advisor_projects(id),

  -- Мета
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_decisions_user_status ON advisor_decisions(user_id, status);
CREATE INDEX idx_decisions_remind ON advisor_decisions(remind_at) WHERE status = 'open';
```

### Пример данных

```json
{
  "question": "Какой стек использовать для памяти Personal AI?",
  "context": "Нужен векторный поиск + структурированные данные",
  "options": [
    {
      "option": "Supabase pgvector",
      "pros": ["Уже используется", "PostgreSQL", "Дешевле"],
      "cons": ["Меньше фич для векторов"],
      "agents_opinion": {
        "Analyst": "Рекомендую, достаточно для задачи",
        "Strategist": "Снижает complexity, ускоряет MVP"
      }
    },
    {
      "option": "Pinecone + Supabase",
      "pros": ["Лучший векторный поиск", "Масштабируемость"],
      "cons": ["Два сервиса", "Дороже", "Сложнее"],
      "agents_opinion": {
        "Analyst": "Overkill для персонального продукта"
      }
    }
  ],
  "status": "open",
  "urgency": "medium",
  "importance": "high",
  "deadline": "2026-02-07T00:00:00Z"
}
```

---

## L4: Patterns — Поведенческие паттерны

### Таблица: `advisor_patterns`

```sql
CREATE TABLE advisor_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- Паттерн
  category TEXT NOT NULL,                   -- cognitive, behavioral, emotional, health
  pattern_type TEXT NOT NULL,               -- bias, habit, trigger, strength
  name TEXT NOT NULL,
  description TEXT,

  -- Детали
  evidence JSONB DEFAULT '[]',              -- примеры из диалогов
  frequency TEXT,                           -- rare, occasional, frequent, constant
  impact TEXT,                              -- positive, neutral, negative

  -- Работа с паттерном
  awareness_level TEXT DEFAULT 'identified', -- identified, acknowledged, working, resolved
  strategies JSONB DEFAULT '[]',            -- стратегии работы

  -- Мета
  first_observed TIMESTAMPTZ,
  last_observed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patterns_user_category ON advisor_patterns(user_id, category);
```

### Примеры паттернов

```json
[
  {
    "category": "cognitive",
    "pattern_type": "bias",
    "name": "Оптимизм в оценке сроков",
    "description": "Систематически недооцениваешь время на задачи в 1.5-2 раза",
    "evidence": [
      {"date": "2026-01-15", "claimed": "2 дня", "actual": "5 дней", "task": "MVP бота"},
      {"date": "2026-01-28", "claimed": "1 неделя", "actual": "2 недели", "task": "Интеграция"}
    ],
    "frequency": "frequent",
    "impact": "negative",
    "strategies": ["Умножать оценку на 2", "Использовать reference class forecasting"]
  },
  {
    "category": "behavioral",
    "pattern_type": "strength",
    "name": "Системное мышление",
    "description": "Способность видеть связи между компонентами и долгосрочные последствия",
    "frequency": "constant",
    "impact": "positive"
  }
]
```

---

## L5: Insights — Выводы агентов

### Таблица: `advisor_insights`

```sql
CREATE TABLE advisor_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- Инсайт
  agent TEXT NOT NULL,                      -- какой агент сгенерировал
  category TEXT NOT NULL,                   -- strategic, tactical, personal, warning
  insight TEXT NOT NULL,
  reasoning TEXT,                           -- логика вывода
  confidence DECIMAL(3,2),                  -- 0.00-1.00

  -- Связи
  based_on JSONB DEFAULT '[]',              -- на чём основан (conversation_ids, decision_ids, etc.)
  related_projects UUID[],
  related_patterns UUID[],

  -- Статус
  status TEXT DEFAULT 'active',             -- active, acknowledged, acted_upon, invalidated
  user_feedback TEXT,                       -- согласие/несогласие пользователя

  -- Мета
  valid_until TIMESTAMPTZ,                  -- когда пересмотреть
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insights_user_category ON advisor_insights(user_id, category, status);
```

### Пример инсайта

```json
{
  "agent": "Strategist",
  "category": "strategic",
  "insight": "NEXUS и repost-tg конкурируют за твоё внимание. При текущих ресурсах нужно выбрать один для фокуса на ближайший месяц.",
  "reasoning": "Оба проекта в статусе 'active', оба требуют >20 часов/неделю. Исторически параллельная работа над 2+ проектами снижала качество обоих.",
  "confidence": 0.85,
  "based_on": ["project:nexus", "project:repost-tg", "pattern:multitasking"],
  "status": "active"
}
```

---

## L6: History — Полные диалоги

### Таблица: `advisor_conversations`

```sql
CREATE TABLE advisor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- Диалог
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  mode TEXT DEFAULT 'analysis',             -- analysis, debate

  -- Контекст
  topic TEXT,
  projects_involved UUID[],
  decisions_involved UUID[],

  -- Результат
  summary TEXT,                             -- краткое резюме
  action_items JSONB DEFAULT '[]',          -- что делать
  new_decisions JSONB DEFAULT '[]',         -- новые решения для трекинга

  -- Мета
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON advisor_conversations(user_id, started_at DESC);
```

### Таблица: `advisor_messages`

```sql
CREATE TABLE advisor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES advisor_conversations(id),

  -- Сообщение
  role TEXT NOT NULL,                       -- user, agent
  agent_name TEXT,                          -- если role=agent: Strategist, Analyst, etc.
  content TEXT NOT NULL,

  -- Векторный поиск
  embedding vector(1536),                   -- OpenAI embedding

  -- Мета
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON advisor_messages(conversation_id, created_at);
CREATE INDEX idx_messages_embedding ON advisor_messages USING ivfflat (embedding vector_cosine_ops);
```

---

## Контекст для агентов

При каждом запросе агенты получают:

```python
def build_context(user_id: str, query: str) -> dict:
    return {
        # Всегда включается
        "profile": get_profile(user_id),
        "active_projects": get_projects(user_id, status="active"),
        "open_decisions": get_decisions(user_id, status="open"),
        "key_patterns": get_patterns(user_id, impact="negative", limit=5),

        # Релевантное по запросу
        "relevant_history": semantic_search(query, user_id, limit=10),
        "relevant_insights": get_insights(user_id, category="active", limit=5),

        # Проактивность
        "overdue_decisions": get_decisions(user_id, overdue=True),
        "pending_reminders": get_reminders(user_id)
    }
```

---

## Проактивность — Scheduler

### Таблица: `advisor_reminders`

```sql
CREATE TABLE advisor_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- Напоминание
  type TEXT NOT NULL,                       -- decision_overdue, pattern_check, goal_review
  reference_id UUID,                        -- на что ссылается
  message TEXT NOT NULL,

  -- Расписание
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,

  -- Мета
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminders_scheduled ON advisor_reminders(scheduled_at) WHERE sent_at IS NULL;
```

### Логика проактивности

```python
# Ежедневная проверка
async def daily_proactive_check(user_id: str):
    reminders = []

    # 1. Незавершённые решения с истёкшим дедлайном
    overdue = await get_overdue_decisions(user_id)
    for d in overdue:
        reminders.append({
            "type": "decision_overdue",
            "message": f"Решение '{d.question}' просрочено на {d.days_overdue} дней. Что блокирует?"
        })

    # 2. Решения, приближающиеся к дедлайну
    upcoming = await get_upcoming_decisions(user_id, days=2)
    for d in upcoming:
        reminders.append({
            "type": "decision_deadline",
            "message": f"Через {d.days_left} дня дедлайн по '{d.question}'. Есть ли прогресс?"
        })

    # 3. Давно не обновлявшиеся проекты
    stale = await get_stale_projects(user_id, days=7)
    for p in stale:
        reminders.append({
            "type": "project_stale",
            "message": f"Проект '{p.name}' не обновлялся {p.days} дней. Актуален ли он?"
        })

    return reminders
```

---

## Индексы для производительности

```sql
-- Полнотекстовый поиск
CREATE INDEX idx_messages_content_fts ON advisor_messages
USING gin(to_tsvector('russian', content));

-- Векторный поиск (pgvector)
CREATE INDEX idx_messages_embedding_ivfflat ON advisor_messages
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Составные индексы
CREATE INDEX idx_decisions_open_urgent ON advisor_decisions(user_id, urgency, importance)
WHERE status = 'open';

CREATE INDEX idx_projects_active_priority ON advisor_projects(user_id, priority DESC)
WHERE status = 'active';
```

---

## Миграция — порядок создания

```sql
-- 1. Включить pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Создать таблицы в порядке зависимостей
-- advisor_profile
-- advisor_projects
-- advisor_decisions (FK → projects)
-- advisor_patterns
-- advisor_insights
-- advisor_conversations
-- advisor_messages (FK → conversations)
-- advisor_reminders

-- 3. Создать индексы
-- 4. Создать функции для semantic search
```

---

*Версия: 1.0*
*Дата: 2026-02-05*
