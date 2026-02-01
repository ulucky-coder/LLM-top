# Платформа автоматизации n8n: полное руководство 2025-2026

n8n версии **2.0** официально выпущена **15 декабря 2025 года** как «hardening release», фокусирующийся на безопасности и производительности. Этот релиз включает критические изменения: прекращение поддержки MySQL/MariaDB, обязательные task runners для изоляции кода, и новую систему Publish/Save для управления workflow. **Критически важно**: обнаружены серьёзные уязвимости (CVE-2026-21858, CVE-2025-68668), требующие немедленного обновления до версии 1.121.3+ или 2.0+.

---

## Статус релиза n8n 2.0 и актуальные изменения

Версия n8n 2.0 представляет собой не feature-релиз, а «hardening release», укрепляющий позиции платформы как enterprise-grade решения. На февраль 2026 года актуальна серия **2.1.x** (стабильная) и **2.2.x** (бета).

### Полный список breaking changes версии 2.0

| Категория | Изменение | Влияние |
|-----------|-----------|---------|
| **База данных** | MySQL/MariaDB больше не поддерживаются | Миграция на PostgreSQL или SQLite обязательна |
| **Безопасность** | Task runners включены по умолчанию | Code node выполняется в изолированном окружении |
| **Безопасность** | Доступ к env переменным из Code node заблокирован | `N8N_BLOCK_ENV_ACCESS_IN_NODE=true` по умолчанию |
| **Ноды** | ExecuteCommand и LocalFileTrigger отключены | Требуется явное включение через `NODES_EXCLUDE` |
| **Python** | Pyodide-based Python удалён | Требуются task runners в external mode |
| **OAuth** | Callback URL требуют аутентификации | Обновление OAuth конфигураций |
| **CLI** | Опция `--tunnel` удалена | Использовать ngrok, Cloudflare Tunnel |
| **Конфигурация** | `N8N_CONFIG_FILES` удалена | Пересмотр подхода к конфигурации |
| **UX** | Новая система Save/Publish | Разделение черновиков и production версий |

### Инструмент Migration Report

Для проверки совместимости перед обновлением используйте встроенный инструмент:
- **Расположение**: Settings → Migration Report (доступен с версии 1.119.0)
- **Доступ**: Только для глобальных администраторов
- **Функция**: Сканирует workflows и конфигурацию на проблемы совместимости с v2.0

---

## Руководство по установке

### Docker установка (рекомендуется для production)

```yaml
version: '3.8'
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    container_name: n8n
    environment:
      - GENERIC_TIMEZONE=Europe/Moscow
      - TZ=Europe/Moscow
      - N8N_HOST=your-domain.com
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://your-domain.com/
      - N8N_ENCRYPTION_KEY=your-32-character-encryption-key
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=secure-password
      - N8N_RUNNERS_ENABLED=true
      - N8N_BLOCK_ENV_ACCESS_IN_NODE=true
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=secure-password
      - POSTGRES_DB=n8n
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  n8n_data:
  postgres_data:
```

### npm установка

```bash
# Требования: Node.js 20.19 - 24.x
npm install n8n -g
n8n start

# Или без установки через npx
npx n8n
```

### n8n Cloud тарифы (2025-2026)

| План | Цена | Executions/месяц | Особенности |
|------|------|------------------|-------------|
| **Starter** | €20/мес | 2,500 | Все интеграции, 5 параллельных workflows |
| **Pro** | €50/мес | 10,000 | Глобальные переменные, webhook auth |
| **Business** | €800/мес | 40,000+ | SSO, Git интеграция, version control |
| **Enterprise** | Custom | Custom | Dedicated support, SLAs |

---

## Создание workflow и механизмы триггеров

### Структура JSON-экспорта workflow

```json
{
  "name": "My Workflow",
  "nodes": [
    {
      "id": "unique-node-uuid",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [250, 300],
      "parameters": {
        "httpMethod": "POST",
        "path": "webhook-path",
        "authentication": "headerAuth",
        "options": {}
      },
      "credentials": {},
      "webhookId": "webhook-uuid"
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "Next Node", "type": "main", "index": 0}]]
    }
  },
  "settings": {
    "executionOrder": "v1",
    "saveExecutionProgress": true,
    "timezone": "Europe/Moscow",
    "errorWorkflow": "error-handler-id"
  },
  "staticData": null,
  "tags": [{"id": "tag-id", "name": "production"}]
}
```

### Webhook Trigger конфигурация

```json
{
  "parameters": {
    "httpMethod": "POST",
    "path": "my-webhook",
    "authentication": "headerAuth",
    "options": {
      "allowedOrigins": "*",
      "ipWhitelist": "192.168.1.0/24"
    }
  }
}
```

**URL-структура:**
- Test: `https://domain.com/webhook-test/[path]`
- Production: `https://domain.com/webhook/[path]`

### Schedule Trigger с cron

```json
{
  "rule": {
    "interval": [{
      "field": "cronExpression",
      "expression": "0 9 * * 1-5"
    }]
  }
}
```

### Логическое ветвление с IF Node

```json
{
  "parameters": {
    "conditions": {
      "conditions": [
        {
          "leftValue": "={{ $json.amount }}",
          "rightValue": 100,
          "operator": {"type": "number", "operation": "gt"}
        }
      ],
      "combineOperation": "and"
    }
  }
}
```

### Switch Node для множественного ветвления

```json
{
  "parameters": {
    "mode": "rules",
    "rules": {
      "rules": [
        {"output": 0, "conditions": {"conditions": [{"leftValue": "={{ $json.region }}", "rightValue": "Europe"}]}},
        {"output": 1, "conditions": {"conditions": [{"leftValue": "={{ $json.region }}", "rightValue": "Americas"}]}}
      ]
    },
    "options": {"fallbackOutput": 2}
  }
}
```

### Обработка ошибок

**Error Trigger output data:**
```json
{
  "execution": {
    "id": "234",
    "url": "https://n8n.example.com/execution/234",
    "error": {"message": "Error message", "stack": "Stack trace"},
    "lastNodeExecuted": "HTTP Request"
  },
  "workflow": {"id": "123", "name": "My Workflow"}
}
```

**Retry механизм (в настройках ноды):**
```json
{
  "retryOnFail": true,
  "maxTries": 3,
  "waitBetweenTries": 5000
}
```

---

## Справочник Core Nodes

### HTTP Request Node

Универсальная нода для HTTP-запросов к любым REST API.

**Методы:** GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS

**Аутентификация:**
- Predefined Credential Type (для поддерживаемых сервисов)
- Generic: Basic Auth, OAuth1/OAuth2, API Key, Header Auth, Query Auth

**Пример конфигурации:**
```json
{
  "parameters": {
    "method": "POST",
    "url": "https://api.example.com/data",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendBody": true,
    "bodyContentType": "json",
    "body": {"key": "={{ $json.value }}"},
    "options": {
      "timeout": 30000,
      "redirect": {"redirect": {"followRedirects": true}}
    }
  }
}
```

### Code Node

Выполнение JavaScript или Python кода.

**Ключевые переменные:**
- `$input` — входные данные текущей ноды
- `$json` — JSON текущего item
- `$items` — все items (в режиме Run Once for All Items)
- `$node["nodeName"]` — доступ к данным других нод
- `$execution` — метаданные выполнения

**Пример JavaScript:**
```javascript
// Обработка всех items
const items = $input.all();
const results = items.map(item => ({
  json: {
    ...item.json,
    processed: true,
    timestamp: new Date().toISOString()
  }
}));
return results;
```

**Пример Python (требует task runners):**
```python
# Доступ к items через _items
for item in _items:
    item.json['processed'] = True
return _items
```

### Set (Edit Fields) Node

**Режимы:**
- **Manual Mapping** — GUI-конфигурация полей
- **JSON Output** — прямая запись JSON

```json
{
  "parameters": {
    "mode": "manual",
    "values": {
      "string": [
        {"name": "fullName", "value": "={{ $json.firstName }} {{ $json.lastName }}"}
      ],
      "number": [
        {"name": "totalPrice", "value": "={{ $json.price * $json.quantity }}"}
      ]
    },
    "options": {"dotNotation": true}
  }
}
```

### Merge Node

**Режимы слияния:**

| Режим | Описание |
|-------|----------|
| **Append** | Последовательное объединение всех items |
| **Combine by Matching Fields** | Слияние по ключевому полю (аналог JOIN) |
| **Combine by Position** | Слияние по индексу |
| **Multiplex** | Декартово произведение |

```json
{
  "parameters": {
    "mode": "combine",
    "combineBy": "combineByFields",
    "fieldsToMatch": {
      "fields": [{"field1": "id", "field2": "userId"}]
    },
    "outputDataFrom": "both"
  }
}
```

### Loop Over Items (Split In Batches)

```json
{
  "parameters": {
    "batchSize": 10,
    "options": {"reset": false}
  }
}
```

**Контекстные переменные:**
```javascript
$("Loop Over Items").context["noItemsLeft"]     // Boolean
$("Loop Over Items").context["currentRunIndex"] // Номер итерации
```

---

## Интеграция с Telegram

### Настройка credentials

1. Создать бота через @BotFather в Telegram
2. Получить токен (`/newbot`)
3. В n8n: Credentials → Telegram API → вставить Access Token

**Важно:** Для работы webhook n8n должен быть доступен по HTTPS.

### Telegram Trigger Node

**Поддерживаемые события:**
- `message` — входящие сообщения
- `callback_query` — нажатия inline-кнопок
- `channel_post` — посты в каналах
- `edited_message` — редактирование сообщений
- `chat_member` — изменения участников (требует admin)

```json
{
  "parameters": {
    "updates": ["message", "callback_query"],
    "options": {
      "download": true,
      "imageSize": "large",
      "restrictToChatIds": "123456789,-987654321"
    }
  }
}
```

### Telegram Node операции

**Отправка сообщений:**
```json
{
  "parameters": {
    "resource": "message",
    "operation": "sendMessage",
    "chatId": "={{ $json.message.chat.id }}",
    "text": "<b>Заголовок</b>\n\nТекст сообщения",
    "replyMarkup": "inlineKeyboard",
    "inlineKeyboard": {
      "rows": [{
        "row": {
          "buttons": [
            {"text": "✅ Подтвердить", "additionalFields": {"callbackData": "confirm"}},
            {"text": "❌ Отмена", "additionalFields": {"callbackData": "cancel"}}
          ]
        }
      }]
    },
    "additionalFields": {
      "parseMode": "HTML",
      "disableNotification": false
    }
  }
}
```

### Полный пример Telegram бота

```json
{
  "name": "Telegram Command Bot",
  "nodes": [
    {
      "name": "Telegram Trigger",
      "type": "n8n-nodes-base.telegramTrigger",
      "parameters": {"updates": ["message", "callback_query"]}
    },
    {
      "name": "Parse Command",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const msg = $json.message || $json.callback_query?.message;\nconst text = $json.message?.text || '';\nconst isCommand = text.startsWith('/');\nconst command = isCommand ? text.split(' ')[0].substring(1) : null;\n\nreturn [{\n  json: {\n    chatId: msg?.chat?.id,\n    userId: $json.message?.from?.id || $json.callback_query?.from?.id,\n    command,\n    callbackData: $json.callback_query?.data\n  }\n}];"
      }
    },
    {
      "name": "Switch Command",
      "type": "n8n-nodes-base.switch",
      "parameters": {
        "mode": "rules",
        "rules": {"rules": [
          {"output": 0, "conditions": {"conditions": [{"leftValue": "={{ $json.command }}", "rightValue": "start"}]}},
          {"output": 1, "conditions": {"conditions": [{"leftValue": "={{ $json.command }}", "rightValue": "help"}]}}
        ]},
        "options": {"fallbackOutput": 2}
      }
    }
  ]
}
```

### Работа с файлами

**Отправка документа:**
```json
{
  "parameters": {
    "resource": "message",
    "operation": "sendDocument",
    "chatId": "123456789",
    "binaryFile": true,
    "binaryPropertyName": "data"
  }
}
```

**Лимиты файлов:** Photos до 10MB, Documents/Videos/Audio до 50MB.

---

## Интеграция с AI/LLM

### OpenAI Node

**Поддерживаемые модели:** GPT-4o, GPT-4o-mini, GPT-4 Turbo, O3

**Операции:**
- Text: Chat Completion, Model Response, Classify Text
- Image: Analyze, Generate (DALL-E), Edit
- Audio: Generate, Transcribe, Translate
- Assistants: Create, Message, List

```json
{
  "parameters": {
    "resource": "text",
    "operation": "message",
    "model": "gpt-4o",
    "messages": {
      "values": [{
        "content": "{{ $json.prompt }}",
        "role": "user"
      }]
    },
    "options": {
      "temperature": 0.7,
      "maxTokens": 2048,
      "outputAsJson": true
    }
  },
  "credentials": {"openAiApi": {"id": "credential-id"}}
}
```

### Anthropic/Claude Node

**Модели:** Claude Opus 4, Claude Sonnet 4, Claude Sonnet 3.7, Claude 3 Opus

```json
{
  "parameters": {
    "model": "claude-sonnet-4-20250514",
    "options": {
      "maxTokensToSample": 4096,
      "temperature": 0.7
    }
  },
  "type": "n8n-nodes-langchain.lmchatanthropic"
}
```

### LangChain Nodes

**Доступные chain типы:**
- **AI Agent** — автономный агент с инструментами и памятью
- **Basic LLM Chain** — простой чат без памяти
- **Question and Answer Chain** — Q&A с retrieval
- **Summarization Chain** — суммаризация документов
- **Information Extractor** — извлечение структурированных данных

**Память:**
- Simple Memory (buffer window)
- Postgres/MongoDB/Redis Chat Memory

**Инструменты для агентов:**
- Calculator, Wikipedia, Wolfram|Alpha
- SerpApi, SearXNG
- Vector Store Question Answer Tool
- Call n8n Workflow Tool
- MCP Client Tool

### RAG паттерн

**Поддерживаемые Vector Stores:**
- Pinecone, Qdrant, Supabase (pgvector), PGVector
- Weaviate, Milvus, MongoDB Atlas, Redis

**Embeddings:**
- OpenAI (text-embedding-3-small)
- Azure OpenAI, Google Gemini, Cohere, Ollama

```json
{
  "nodes": [
    {
      "type": "n8n-nodes-langchain.vectorstorePinecone",
      "name": "Insert Documents",
      "parameters": {
        "mode": "insert",
        "pineconeIndex": "documents"
      }
    },
    {
      "type": "n8n-nodes-langchain.retrievervectorstore",
      "name": "Retriever",
      "parameters": {"options": {"limit": 5}}
    },
    {
      "type": "n8n-nodes-langchain.chainretrievalqa",
      "name": "QA Chain",
      "parameters": {
        "text": "{{ $json.question }}"
      }
    }
  ]
}
```

### AI Agent workflow пример

```json
{
  "nodes": [
    {
      "type": "n8n-nodes-langchain.chattrigger",
      "name": "Chat Trigger"
    },
    {
      "type": "n8n-nodes-langchain.agent",
      "name": "AI Agent",
      "parameters": {
        "promptType": "define",
        "text": "{{ $json.chatInput }}",
        "options": {
          "systemMessage": "Ты полезный ассистент с доступом к инструментам.",
          "maxIterations": 10
        }
      }
    },
    {
      "type": "n8n-nodes-langchain.lmchatopenai",
      "name": "OpenAI Model",
      "parameters": {"model": "gpt-4o-mini"}
    },
    {
      "type": "n8n-nodes-langchain.memorybufferwindow",
      "name": "Memory",
      "parameters": {"contextWindowLength": 10}
    }
  ]
}
```

---

## Работа с базами данных

### PostgreSQL Node

**Операции:** Execute Query, Insert, Update, Delete, Upsert

**Credentials:**
```json
{
  "host": "localhost",
  "port": 5432,
  "database": "mydb",
  "user": "postgres",
  "password": "secure-password",
  "ssl": "require"
}
```

**Параметризованный запрос:**
```json
{
  "parameters": {
    "operation": "executeQuery",
    "query": "SELECT * FROM users WHERE status = $1 AND created_at > $2",
    "queryParameters": "active,2025-01-01"
  }
}
```

**Upsert (idempotent insert):**
```json
{
  "parameters": {
    "operation": "upsert",
    "table": "orders",
    "columns": "id,customer_id,total,status",
    "conflictColumn": "id"
  }
}
```

### PostgreSQL Trigger Node (CDC)

```json
{
  "parameters": {
    "triggerMode": "createTrigger",
    "tableName": "orders",
    "events": ["INSERT", "UPDATE", "DELETE"]
  }
}
```

### MongoDB Node

**Операции:** Find, Insert, Update, Delete, Aggregate

**Aggregation pipeline:**
```json
{
  "parameters": {
    "operation": "aggregate",
    "collection": "orders",
    "pipeline": "[{\"$match\": {\"status\": \"completed\"}}, {\"$group\": {\"_id\": \"$customer_id\", \"total\": {\"$sum\": \"$amount\"}}}]"
  }
}
```

### ETL паттерн

```
Schedule Trigger → Extract (HTTP/DB) → Transform (Code/Set) → Load (DB Insert)
                                                                    ↓
                                              Error Workflow ← Error Trigger
```

**Best practices:**
- Используйте upsert вместо insert для идемпотентности
- Batch inserts для больших объёмов данных
- PostgreSQL для production ETL (не SQLite)
- Queue mode с Redis workers для высоких нагрузок

---

## Продвинутые архитектурные паттерны

### Queue Mode архитектура

Queue mode разделяет выполнение workflow от основного инстанса через Redis (BullMQ).

```
┌─────────────────┐     ┌─────────┐     ┌─────────────────┐
│  Main Instance  │────▶│  Redis  │────▶│  Worker Pool    │
│  (UI, Webhooks) │     │ (Queue) │     │  (Execution)    │
└─────────────────┘     └─────────┘     └─────────────────┘
                              │
                              ▼
                       ┌─────────────┐
                       │ PostgreSQL  │
                       └─────────────┘
```

**Environment variables:**
```bash
EXECUTIONS_MODE=queue
QUEUE_BULL_REDIS_HOST=redis
QUEUE_BULL_REDIS_PORT=6379
QUEUE_BULL_REDIS_PASSWORD=secure-password
QUEUE_HEALTH_CHECK_ACTIVE=true
N8N_CONCURRENCY_PRODUCTION_LIMIT=10
```

### Docker Compose для multi-worker setup

```yaml
version: '3.8'
services:
  n8n-main:
    image: n8nio/n8n:latest
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
    ports:
      - "5678:5678"

  n8n-worker-1:
    image: n8nio/n8n:latest
    command: worker
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
    deploy:
      resources:
        limits:
          memory: 2G

  n8n-worker-2:
    image: n8nio/n8n:latest
    command: worker
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres

  n8n-webhook:
    image: n8nio/n8n:latest
    command: webhook
    ports:
      - "5679:5678"
    environment:
      - EXECUTIONS_MODE=queue

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=n8n
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
```

### Дедупликация и идемпотентность

**Remove Duplicates Node:**
```json
{
  "parameters": {
    "operation": "removeItemsSeenInPreviousExecutions",
    "compare": "selectedFields",
    "fieldsToCompare": "email,orderId",
    "scope": "workflow",
    "historySize": 10000
  }
}
```

**Идемпотентность через Static Data:**
```javascript
const staticData = $getWorkflowStaticData('global');
if (!staticData.processedIds) staticData.processedIds = [];

const currentId = $input.first().json.id;
if (staticData.processedIds.includes(currentId)) {
  return []; // Skip duplicate
}

staticData.processedIds.push(currentId);
// Limit growth
if (staticData.processedIds.length > 10000) {
  staticData.processedIds = staticData.processedIds.slice(-5000);
}
return $input.all();
```

### Binary Data Storage

**Для Queue Mode обязательно S3:**
```bash
N8N_DEFAULT_BINARY_DATA_MODE=s3
N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME=n8n-binary-data
N8N_EXTERNAL_STORAGE_S3_BUCKET_REGION=eu-central-1
N8N_EXTERNAL_STORAGE_S3_ACCESS_KEY=your-access-key
N8N_EXTERNAL_STORAGE_S3_ACCESS_SECRET=your-secret-key
```

### Рекомендации по масштабированию

| Нагрузка | Workers | Concurrency | RAM/Worker | PostgreSQL |
|----------|---------|-------------|------------|------------|
| 1-10K exec/день | 2 | 5 | 1GB | 2GB |
| 10-50K exec/день | 4 | 10 | 2GB | 4GB |
| 50K+ exec/день | 8+ | 10 | 4GB | 8GB+ RDS |

---

## Безопасность и миграция

### Критические уязвимости (CVE)

| CVE | CVSS | Описание | Исправлено в |
|-----|------|----------|--------------|
| **CVE-2026-21858** | 10.0 | RCE через Form Webhooks | 1.121.0 |
| **CVE-2026-21877** | 10.0 | Authenticated RCE | 1.121.3 |
| **CVE-2025-68668** | 9.9 | Pyodide sandbox bypass | 2.0.0 |
| **CVE-2025-68613** | 9.9 | Expression injection RCE | 1.120.4, 1.121.1 |

**Рекомендация:** Немедленное обновление до версии **1.121.3+** или **2.0+**.

### Критические переменные безопасности

```bash
# ОБЯЗАТЕЛЬНО для production
N8N_ENCRYPTION_KEY=your-32-character-key

# Безопасность
N8N_PUBLIC_API_DISABLED=true
N8N_BLOCK_ENV_ACCESS_IN_NODE=true
N8N_RUNNERS_ENABLED=true
N8N_GIT_NODE_DISABLE_BARE_REPOS=true
NODES_EXCLUDE='["n8n-nodes-base.executeCommand","n8n-nodes-base.localFileTrigger"]'
N8N_RESTRICT_FILE_ACCESS_TO=/home/node/.n8n-files

# Session
N8N_SESSION_TIMEOUT=3600

# Pruning
EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=168
```

### Nginx reverse proxy

```nginx
server {
    listen 443 ssl;
    server_name n8n.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Аутентификация

| Метод | Доступность |
|-------|-------------|
| User Management | Все версии |
| 2FA | Cloud native; self-hosted через reverse proxy |
| LDAP | Enterprise |
| OIDC/SAML | Enterprise |

### External Secrets (Enterprise)

Поддерживаемые провайдеры: AWS Secrets Manager, Azure Key Vault, GCP Secrets Manager, HashiCorp Vault.

```javascript
// Использование в credentials
{{ $secrets.awsSecretsManager.database_password }}
```

---

## Мониторинг

### Prometheus метрики

```bash
N8N_METRICS=true
N8N_METRICS_PREFIX=n8n_
```

**Ключевые метрики:**
- `n8n_execution_total` — общее количество выполнений
- `n8n_execution_failed_total` — failed executions
- `n8n_execution_duration_seconds` — время выполнения
- `n8n_queue_bull_queue_waiting` — глубина очереди

### Error Workflow паттерн

```json
{
  "nodes": [
    {"type": "n8n-nodes-base.errorTrigger", "name": "Error Trigger"},
    {
      "type": "n8n-nodes-base.slack",
      "name": "Alert Slack",
      "parameters": {
        "channel": "#alerts",
        "text": "🚨 Workflow failed: {{ $json.workflow.name }}\nError: {{ $json.execution.error.message }}"
      }
    }
  ]
}
```

---

## Ресурсы сообщества

### Основные ссылки

| Ресурс | URL |
|--------|-----|
| Документация | https://docs.n8n.io |
| Форум сообщества | https://community.n8n.io |
| Библиотека шаблонов | https://n8n.io/workflows/ |
| GitHub | https://github.com/n8n-io/n8n |
| Awesome n8n | https://github.com/restyler/awesome-n8n |

### Статистика экосистемы

- **156k+ звёзд** на GitHub
- **200k+ участников** в сообществе
- **7,889+ шаблонов** workflow
- **4,187+ community nodes**

### Популярные community nodes

1. **n8n-nodes-evolution-api** — WhatsApp (6.4M+ downloads)
2. **n8n-nodes-mcp** — MCP protocol (983k downloads)
3. **n8n-nodes-chatwoot** — ChatWoot (773k downloads)

### Рекомендуемый путь обучения

1. **Неделя 1:** Шаблон "Very Quick Quickstart" → базовый workflow
2. **Неделя 2:** Level One Course — Editor UI, концепции
3. **Неделя 3:** Практический проект автоматизации
4. **Неделя 4:** Level Two Course — data handling, error management
5. **Далее:** AI nodes, шаблоны, форум сообщества

---

## Заключение

n8n 2.0 представляет значительный шаг в развитии платформы с акцентом на безопасность enterprise-уровня. Ключевые изменения — обязательная миграция на PostgreSQL, изолированное выполнение кода через task runners, и новая система управления версиями workflow — требуют внимательного планирования при обновлении. Критически важно устранить обнаруженные уязвимости (CVE-2026-21858, CVE-2025-68668) обновлением до актуальной версии.

Платформа предоставляет мощные возможности для AI/LLM интеграции через LangChain nodes, поддержку RAG-паттернов с различными vector stores, и глубокую интеграцию с Telegram для создания ботов. Для production-развёртываний рекомендуется использовать queue mode с Redis workers, PostgreSQL в качестве базы данных, и S3 для binary data при горизонтальном масштабировании.