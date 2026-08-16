# Эксплуатация Notification Hub

## Как добавить и изменить клиента, бота, тип и маршрут

Всё делается в админке, без деплоя кода. Dev UI: http://localhost:3041/admin/ (`pnpm admin:dev`). После `pnpm admin:build` — http://localhost:3040/admin/. Логин: `ADMIN_USER` / `ADMIN_PASSWORD`.

1. **Client** — slug источника (`almaty-foods`, `skma`). Его же передают в `POST /events` как `client`. «Изменить» правит slug и имя.
2. **Bot** — имя и `telegram_token`. В API токен всегда masked. При редактировании пустой token не перезаписывает текущий. Бот должен быть админом супергруппы, если нужны топики.
3. **Notification type** — `code` (стабильный, латиница) и человекочитаемое имя. Источник шлёт этот `code` в поле `type`. «Изменить» правит code и имя.
   - Уже есть: `price_changed`, `stock_threshold`, `debtor`, `stock_replenished`, `app_error`.
4. **Routing rule** — client + bot + type + `chat_id` + `thread_id` (0 = без топика). Можно несколько правил на один тип (несколько чатов). «Изменить» правит все поля маршрута.
5. Проверка: `POST /events` с этим `client`/`type` и `payload.message`. В **Logs** статус `PENDING` → `SENT` (или `FAILED` с текстом Telegram). Клик по строке лога раскрывает читаемое сообщение и JSON исходного запроса.

OpenAPI: http://localhost:3040/docs

Текст сообщения формируется источником (`payload.message` / `payload.text`, HTML). Хаб только маршрутизирует.

## Логи

В production — JSON в stdout (`NODE_ENV=production`, `LOG_LEVEL=info|warn|error`). Локально — pino-pretty.

Заголовки `Authorization`, `X-Notihub-Token`, `X-Notihub-Webhook-Secret` редактируются и в лог не попадают.

Пример:

```bash
LOG_LEVEL=debug pnpm start:dev
```

## Мониторинг: кто узнает, если хаб упадёт

`GET /health` — процесс жив (для Docker HEALTHCHECK).  
`GET /health/ready` — Postgres + Redis, иначе HTTP 503.

Это недостаточно само по себе: мёртвый процесс не дернет Telegram через очередь хаба.

1. **Внешний watchdog** (обязателен в проде) — cron/systemd каждую минуту, Telegram **напрямую** в Bot API:

```bash
# .env: HUB_ALERT_BOT_TOKEN, HUB_ALERT_CHAT_ID, опционально HUB_ALERT_THREAD_ID
HUB_HEALTH_URL=http://127.0.0.1:3040/health/ready pnpm watchdog
```

systemd timer: `OnCalendar=*:*:00` (раз в минуту), `EnvironmentFile=/path/to/notihub/.env`.

2. **Внутри процесса** — если Node ещё жив, а Postgres/Redis нет, или за 15 минут накопилось ≥ `HUB_ALERT_FAIL_THRESHOLD` FAILED-доставок, хаб сам пишет в тот же alert-чат (минуя очередь BullMQ).

3. **Uptime Kuma / Grafana** — HTTP-монитор на `/health/ready`. При падении можно слать в хаб (`POST /events`, type `app_error`) **только если мониторинг живёт на другой машине**. Watchdog всё равно нужен.

4. Очередь: http://localhost:3040/queues — за reverse-proxy с авторизацией, эндпоинт без basic auth.

## Docker и деплой

Образ:

```bash
docker build -t notihub:local .
```

Полный стек (Postgres + Redis + app), если нет общей Infra:

```bash
docker compose --profile app up -d --build
```

Только приложение к уже бегущим Infra Postgres/Redis:

```bash
docker build -t notihub:local .
docker run --rm --env-file .env --network host notihub:local
```

На хосте с Docker bridge подставьте `DATABASE_URL`/`REDIS_URL` на IP Infra, не `localhost` контейнера.

Entrypoint по умолчанию делает `prisma migrate deploy`. Отключить: `RUN_MIGRATIONS=false`.

CI: `.github/workflows/ci.yml` — тесты + `docker build`. Публикация образа на registry — вручную, когда появится registry.

Переменные продакшена (минимум): `DATABASE_URL`, `REDIS_URL`, `NODE_ENV=production`, `ADMIN_USER`, `ADMIN_PASSWORD`, `EVENTS_API_TOKEN`, `HUB_ALERT_BOT_TOKEN`, `HUB_ALERT_CHAT_ID`. Смените дефолтный `changeme`.

## Бэкапы БД

Правила маршрутизации и токены ботов живут в Postgres.

```bash
pnpm backup
# файл: backups/notihub-YYYYMMDDTHHMMSSZ.dump (хранятся последние BACKUP_KEEP=14)
```

Cron раз в сутки, например 03:15:

```
15 3 * * * cd /path/to/notihub && eval "$(direnv export bash)" && pnpm backup
```

Восстановление:

```bash
pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" backups/notihub-YYYYMMDDTHHMMSSZ.dump
```

Копируйте дампы с сервера (не только локальный диск). Redis можно не бэкапить: очередь восстановится из новых событий, идемпотентность — в Postgres (`event_idempotency`).
