# Notification Hub

Централизованный сервис распределения Telegram-уведомлений (NestJS + Prisma + PostgreSQL + Redis/BullMQ).

Хаб **не содержит SDK**. Любой источник (Laravel, Python, Go, n8n, Zapier) шлёт HTTP.

## Требования

- NixOS + [direnv](https://direnv.net/) (`use nix` в `.envrc`)
- Docker (общая Infra или `docker-compose.yml` в этом репозитории)

## Локальный запуск

```bash
direnv allow
cp .env.example .env   # при необходимости поправь URL
pnpm install

# Postgres/Redis: по умолчанию общая Infra (localhost:5432 / :6379).
# Если Infra не запущена:
docker compose up -d

pnpm prisma:migrate
pnpm start:dev
```

Сервис слушает `PORT` из `.env` (по умолчанию 3040).

- Health: http://localhost:3040/health
- OpenAPI UI: http://localhost:3040/docs
- Очередь: http://localhost:3040/queues
- Админка: http://localhost:3041/admin/ (`pnpm admin:dev`) или http://localhost:3040/admin/ после `pnpm admin:build`

Маршрутизация в чат появляется после `RoutingRule` (клиент + тип + bot + chat_id). Токен бота — в таблице `bots` или через seed (`TELEGRAM_BOT_TOKEN` в `.env`).

`POST /events` ставит отправку в BullMQ (ответ `queued: true`, статус лога `PENDING`). Повтор с тем же `idempotency_key` не создаёт дубль.

## Интеграция: `POST /events`

Тело: `{ "client", "type", "payload", "idempotency_key?" }`.

Типы из seed: `price_changed`, `stock_threshold`, `debtor`, `stock_replenished`, `app_error`. Если в `payload` есть `message` или `text`, хаб отправляет его в Telegram как HTML.

Если задан `EVENTS_API_TOKEN`, нужен заголовок `Authorization: Bearer <token>` или `X-Notihub-Token`.

### Минимальный запрос

```bash
curl -sS -X POST http://localhost:3040/events \
  -H 'Content-Type: application/json' \
  -d '{"client":"s-webs","type":"price_changed","payload":{"message":"Тест"}}'
```

### С токеном и idempotency key

```bash
curl -sS -X POST http://localhost:3040/events \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $EVENTS_API_TOKEN" \
  -d '{
    "client": "almaty-foods",
    "type": "stock_threshold",
    "idempotency_key": "stock:42:2026-08-16",
    "payload": { "message": "<b>Низкий остаток</b>\nТовар: Соус" }
  }'
```

Успех — HTTP 200:

```json
{ "matched": 1, "queued": true, "deliveries": [{ "logId": "...", "status": "PENDING" }] }
```

Повтор с тем же ключом добавляет `"idempotent": true` и не ставит новую джобу.

### Ошибки

| HTTP | Когда |
| --- | --- |
| 400 | Нет `client`/`type`/`payload`, лишние поля, клиент неактивен |
| 401 | Задан `EVENTS_API_TOKEN`, а Bearer неверный или отсутствует |
| 404 | Неизвестный `client` или `type` |

```bash
# 400 — нет type/payload
curl -sS -o /tmp/nh-body -w '%{http_code}\n' -X POST http://localhost:3040/events \
  -H 'Content-Type: application/json' \
  -d '{"client":"s-webs"}'

# 401 — неверный токен (если EVENTS_API_TOKEN задан)
curl -sS -o /tmp/nh-body -w '%{http_code}\n' -X POST http://localhost:3040/events \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wrong' \
  -d '{"client":"s-webs","type":"price_changed","payload":{}}'
```

Laravel / Python без клиентской библиотеки:

```php
Http::withToken($token)->post($hubUrl.'/events', [
    'client' => 'almaty-foods',
    'type' => 'stock_threshold',
    'idempotency_key' => 'stock:'.$product->id.':'.now()->toDateString(),
    'payload' => ['message' => $html],
])->throw();
```

```python
requests.post(
    f"{hub}/events",
    headers={"Authorization": f"Bearer {token}"},
    json={"client": "s-webs", "type": "app_error", "payload": {"message": "boom"}},
    timeout=10,
).raise_for_status()
```

## Webhook GlitchTip

Для сервисов со своим форматом тела — адаптер. GlitchTip: `POST /webhooks/glitchtip?client=<slug>`.

Секрет `GLITCHTIP_WEBHOOK_SECRET`: заголовок `X-Notihub-Webhook-Secret`, `Authorization: Bearer`, или query `secret`. Хаб мапит payload в событие `app_error`.

```bash
curl -sS -X POST "http://localhost:3040/webhooks/glitchtip?client=almaty-foods" \
  -H 'Content-Type: application/json' \
  -H "X-Notihub-Webhook-Secret: $GLITCHTIP_WEBHOOK_SECRET" \
  -d '{"project_name":"backend","message":"Undefined variable","url":"https://glitchtip.example/issues/42","id":"42"}'
```

Новые адаптеры (Grafana, Uptime Kuma, GitHub Actions) — отдельные контроллеры в `src/webhooks/`. Если источник может слать JSON хаба, используйте `POST /events`.

## Документация

- [docs/integration.md](docs/integration.md) — для команд, подключающих свой сервис к хабу (auth, `POST /events`, идемпотентность, форматирование сообщений, webhook-адаптеры, готовые примеры на PHP/Python/Node).
- [docs/operations.md](docs/operations.md) — для тех, кто администрирует сам хаб (боты/клиенты/маршруты, логи, мониторинг, Docker, бэкапы).

## Продакшен

Логи, health/ready, watchdog, Docker, бэкапы БД и как завести бота/клиента/тип — в [docs/operations.md](docs/operations.md).

```bash
pnpm backup     # pg_dump в backups/
pnpm watchdog   # внешняя проверка /health/ready → Telegram напрямую
docker build -t notihub:local .
```

## Секреты

Файл `.env` не коммитится. Шаблон — `.env.example`.
