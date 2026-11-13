# Notification Hub

Централизованный сервис распределения Telegram-уведомлений (NestJS + Prisma + PostgreSQL + Redis/BullMQ).

Хаб **не содержит SDK**. Любой источник (Laravel, Python, Go, n8n, Zapier) шлёт HTTP.

## Быстрый запуск в Docker

```bash
cp .env.example .env
# Задайте ADMIN_USER, ADMIN_PASSWORD и EVENTS_API_TOKEN в .env.
docker compose up -d --build
```

Compose поднимает приложение, PostgreSQL и Redis; Docker entrypoint применяет миграции. PostgreSQL и Redis в этом compose доступны только внутри Docker-сети. Для разработки backend на хосте нужны отдельно доступные экземпляры PostgreSQL и Redis с адресами в `.env`, затем `pnpm install`, `pnpm prisma:migrate`, `pnpm start:dev` и `pnpm admin:dev`. NixOS/direnv поддерживаются через `.envrc`, но не обязательны для Docker-запуска.

Сервис слушает `PORT` из `.env` (по умолчанию 3040); compose публикует порт 3040.

- Health: http://localhost:3040/health
- OpenAPI UI: http://localhost:3040/docs
- Очередь: http://localhost:3040/queues
- Админка: http://localhost:3040/admin/ в Docker; http://localhost:3041/admin/ при `pnpm admin:dev`

Маршрутизация в чат появляется после `RoutingRule` (клиент + тип + bot + chat_id). Токен бота — в таблице `bots` или через seed (`TELEGRAM_BOT_TOKEN` в `.env`).

`POST /events` ставит найденные доставки в BullMQ (ответ `queued: true`, начальный статус лога `PENDING`). Проверяйте `matched`: при нуле маршрутов заданий нет. Последовательный повтор с тем же `idempotency_key` возвращает прежний ответ; строгой дедупликации одновременных запросов пока нет.

## Интеграция: `POST /events`

Тело: `{ "client", "type", "payload", "idempotency_key?" }`.

Типы уведомлений настраиваются внутри проекта; один `type` может использоваться в нескольких проектах независимо. Типы из seed: `price_changed`, `stock_threshold`, `debtor`, `stock_replenished`, `app_error`. Для готового HTML-текста передайте непустой `payload.message` (или `payload.text`, если `message` отсутствует).

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
- [docs/architecture.md](docs/architecture.md) — схема компонентов, модель данных, поток события и гарантии доставки.
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
