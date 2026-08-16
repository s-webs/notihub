# Notification Hub — план работ

Централизованный сервис распределения уведомлений в Telegram для нескольких клиентов (S-webs, Almaty-foods, SKMA и др.), с поддержкой множества ботов, чатов и топиков.

**Стек:** NestJS + BullMQ (Redis) + Prisma + PostgreSQL

---

## Этап 0. Подготовка

- [x] Инициализировать репозиторий, `docker-compose.yml` (Postgres, Redis) — используется общая Infra (`infra-postgres-1` / `infra-redis-1`); compose — fallback, если Infra не запущена
- [x] Настроить NestJS проект (CLI, структура модулей) — NestJS 11, pnpm, модули `Config` / `Prisma`
- [x] Настроить Prisma, подключение к БД — Prisma 7.8.0 (пин под nixpkgs `prisma-engines`), `@prisma/adapter-pg`, `PrismaService`
- [x] `.env` для секретов (токены ботов, DB URL, Redis URL) — не коммитить

---

## Этап 1. Данные и модели

- [x] Prisma-схема по ER-диаграмме:
  - `Client` (id, slug, name, is_active)
  - `Bot` (id, name, telegram_token, is_active)
  - `NotificationType` (id, code, name)
  - `RoutingRule` (id, client_id, bot_id, notification_type_id, chat_id, thread_id, is_active)
  - `NotificationLog` (id, routing_rule_id, status, error, sent_at)
- [x] Миграции + seed-данные (тестовый клиент, тестовый бот, пара типов уведомлений)
- [x] Проверить связи и уникальные ограничения (например, уникальность `client_id + bot_id + notification_type_id + chat_id + thread_id`)

---

## Этап 2. Приём событий (без очереди)

- [x] `POST /events` — валидация payload (`client`, `type`, `payload`)
- [x] Health-check эндпоинт (`GET /health`)
- [x] Поиск подходящих `RoutingRule` по `client + type`
- [x] Синхронная отправка в Telegram Bot API (без ретраев, для проверки маршрутизации end-to-end)
- [x] Логирование результата в `NotificationLog`
- [x] Ручное тестирование: событие → сообщение реально приходит в нужный чат/топик
  - Тестовый чат `-1004373958039`, топик `4`; `POST /events` вернул `SENT`

**Критерий готовности этапа:** можно вручную отправить событие через curl/Postman и получить сообщение в тестовом Telegram-чате. **Выполнено** (чат `-1004373958039`, топик `4`).

---

## Этап 3. Очередь и надёжность

- [x] Подключить BullMQ, вынести отправку в джобу
- [x] Настроить retry с exponential backoff (на случай сетевых сбоев и Telegram rate-limit) — 8 попыток, delay 2s exponential; 429 использует `retry_after`
- [x] Подключить Bull Board для мониторинга очереди — http://localhost:3040/queues
- [x] Идемпотентность: `idempotency_key` на входящих событиях, защита от дублей при ретраях со стороны Laravel
- [x] Rate-limiting на уровне бота (не более N сообщений/сек на один `telegram_token`) — `TELEGRAM_RATE_LIMIT_PER_SEC` (по умолчанию 20)
- [x] Обработка ошибок Telegram API (бот заблокирован, чат не найден, невалидный `thread_id`) — с логированием и без падения очереди (`UnrecoverableError`, лог `FAILED`)

**Критерий готовности этапа:** массовая отправка (пачка событий) не роняет сервис и не превышает лимиты Telegram. **Выполнено** (очередь + limiter + replay `idempotency_key`).

---

## Этап 4. Админка (CRUD)

- [x] Простой веб-интерфейс (React/Next.js или AdminJS поверх Prisma) — Vite + React + Tailwind, `admin/`
- [x] CRUD для `Bot` (добавить бота, токен, активность) — токен в API только masked
- [x] CRUD для `Client`
- [x] CRUD для `NotificationType`
- [x] CRUD для `RoutingRule`: выбор бота → клиента → типа → chat_id/thread_id
- [x] Редактирование всех сущностей в UI (не только вкл/выкл): Client (slug/имя), Bot (имя/токен), NotificationType (code/имя), RoutingRule (клиент/бот/тип/чат/топик)
- [x] Просмотр `NotificationLog` (что ушло, что зафейлилось, фильтры по клиенту/боту/статусу) — клик по строке раскрывает сообщение и JSON входящего запроса
- [x] Базовая аутентификация в админку (даже простой basic auth/логин-пароль для старта) — `ADMIN_USER` / `ADMIN_PASSWORD`

**Критерий готовности этапа:** можно завести нового бота и настроить маршрутизацию без правки кода. **Выполнено** (`/api/admin/*` + UI).

---

## Этап 5. Источники событий: API и вебхуки

Концепция: хаб принимает события через два универсальных интерфейса — **прямой API** и **webhook-адаптеры**. Никаких SDK в репозитории хаба; любой источник (Laravel, Python, Go, n8n, Zapier) интегрируется по HTTP без клиентской библиотеки.

- [x] `POST /events` — универсальный эндпоинт: `{ client, type, payload, idempotency_key? }` + Bearer-токен. Любой стек, любой язык.
- [x] Webhook-адаптер GlitchTip — `POST /webhooks/glitchtip?client=…` маппит payload стороннего сервиса в формат события; тип `app_error`.
- [x] Удалить `clients/laravel/` из репозитория — PHP-клиент дублирует то, что Laravel делает одной строкой `Http::post(…)`.
- [x] OpenAPI / Swagger документация для `POST /events` и webhook-эндпоинтов (NestJS `@nestjs/swagger`) — http://localhost:3040/docs
- [x] README с curl-примерами интеграции (минимальный запрос, с idempotency key, с обработкой ошибок).
- [x] Новые webhook-адаптеры по необходимости (Grafana Alerting, Uptime Kuma, Sentry, GitHub Actions) — каркас `src/webhooks/`; пока нужен только GlitchTip (Sentry-совместимый payload). Остальные — когда появится источник.

**Критерий готовности этапа:** любой сервис (PHP, Python, Go, no-code) может отправить событие через `POST /events` или webhook-эндпоинт без клиентской библиотеки. `clients/laravel/` в репозитории нет. **Выполнено.**

- [x] Отдельная документация для интеграторов (auth, идемпотентность, форматирование сообщений, статусы доставки, готовые примеры PHP/Python/Node, webhook GlitchTip) — [docs/integration.md](integration.md)

---

## Этап 6. Продакшен-готовность

- [x] Логирование (структурированные логи, уровень ошибок) — Pino (`nestjs-pino`), JSON в production, `LOG_LEVEL`, redact секретов в заголовках
- [x] Мониторинг/алерты на сам хаб (если он упадёт — кто узнает?) — `GET /health` (live) + `GET /health/ready`; внешний `scripts/watchdog.sh` пишет в Telegram напрямую; внутри процесса — алерт при падении Postgres/Redis и всплеске FAILED
- [x] Docker-образ, деплой (CI/CD или ручной, в зависимости от инфраструктуры) — `Dockerfile`, `docker compose --profile app`, GitHub Actions (тесты + `docker build`)
- [x] Бэкапы БД (правила маршрутизации — критичные данные) — `pnpm backup` (`scripts/backup-db.sh`, pg_dump custom, ротация)
- [x] Документация: как добавить нового бота/клиента/тип уведомления — [docs/operations.md](operations.md)

**Критерий готовности этапа:** сервис можно задеплоить, логи наблюдаемы, падение хаба видно снаружи, маршруты восстанавливаются из бэкапа. **Выполнено.**

---

## Открытые вопросы (решить по ходу)

- Нужны ли шаблоны сообщений (Markdown/HTML-форматирование) в `RoutingRule` или `NotificationType`, или payload формируется на стороне источника?
- Нужна ли поддержка нескольких получателей на одно правило (например, дублирование в чат владельца + чат менеджеров)?
- Нужна ли агрегация/дедупликация уведомлений (например, не слать 50 алертов об остатках подряд)?
