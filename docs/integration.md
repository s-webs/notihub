# Notification Hub — документация для интеграторов

Это гайд для команд, которые подключают **свой сервис** к хабу как источник событий (Laravel-бэкенд, Python-скрипт, no-code инструмент и т.д.).

Если вы настраиваете сам хаб (боты, деплой, бэкапы) — см. [docs/operations.md](operations.md). Если нужна интерактивная схема запросов — [OpenAPI /docs](http://localhost:3040/docs).

## Как это работает

```
ваш сервис → POST /events (или webhook-адаптер) → хаб находит RoutingRule → BullMQ → Telegram
```

Хаб не хранит шаблоны сообщений — текст формируете вы. Хаб только: проверяет `client`/`type`, находит подходящие чаты (`RoutingRule`), ставит отправку в очередь и логирует результат. Ответ `200 OK` означает **«принято и поставлено в очередь»**, а не «доставлено в Telegram» — доставка асинхронная (см. [«Асинхронная доставка»](#асинхронная-доставка-и-статусы)).

## 0. Что должно быть настроено заранее

Прежде чем слать события, в админке (http://localhost:3040/admin/ или :3041 в dev) должны существовать:

1. **Client** — ваш slug (например `almaty-foods`). Заведите у администратора хаба, если его нет.
2. **Notification type** — код события (например `stock_threshold`). Список текущих кодов — в разделе «Типы» админки или в таблице ниже.
3. **Routing rule** — связка client + type + bot + `chat_id` (+ `thread_id`), иначе событие примется, но никуда не уйдёт (`matched: 0`).

Если чего-то из этого нет — событие вернёт `404` или `matched: 0` в ответе. Это не баг интеграции, а отсутствие настройки на стороне хаба.

Типы, зашитые в seed (могут отличаться — сверяйтесь с админкой):

| code | назначение |
| --- | --- |
| `price_changed` | изменение цены/закупочной цены товара |
| `stock_threshold` | остаток товара опустился до порога |
| `stock_replenished` | остаток восстановлен выше порога |
| `debtor` | продажа в долг / новый должник |
| `app_error` | ошибка приложения (обычно через webhook GlitchTip) |

Если нужен новый тип — попросите администратора хаба завести его в разделе «Типы» (без деплоя кода).

## 1. Аутентификация

Если у хаба задан `EVENTS_API_TOKEN`, каждый запрос к `POST /events` должен нести токен:

- `Authorization: Bearer <token>`, **или**
- `X-Notihub-Token: <token>`

Если `EVENTS_API_TOKEN` не задан (dev-стенд) — авторизация не требуется. Уточните у администратора, какой режим на вашем окружении.

Webhook-эндпоинты (`/webhooks/*`) используют отдельный секрет — см. [раздел про webhook](#вариант-b-webhook-адаптер-без-json-хаба).

## 2. `POST /events` — универсальный вход

```
POST {HUB_URL}/events
Content-Type: application/json
Authorization: Bearer {EVENTS_API_TOKEN}   # если включён
```

### Тело запроса

| Поле | Тип | Обязательное | Описание |
| --- | --- | --- | --- |
| `client` | string | да | slug клиента из админки |
| `type` | string | да | code типа уведомления из админки |
| `payload` | object | да | произвольный JSON; см. [форматирование сообщения](#3-как-формируется-текст-сообщения) |
| `idempotency_key` | string, ≤128 симв. | нет | защита от дублей при повторной отправке (ретраи, at-least-once очереди и т.п.) |

Схема строгая (`whitelist + forbidNonWhitelisted`): лишние поля на верхнем уровне вызовут `400`. Внутри `payload` можно передавать что угодно.

```json
{
  "client": "almaty-foods",
  "type": "stock_threshold",
  "idempotency_key": "stock:42:2026-08-16",
  "payload": {
    "message": "<b>Низкий остаток</b>\nТовар: Соус\nОстаток: 3 шт"
  }
}
```

### Ответ `200 OK`

```json
{
  "matched": 1,
  "queued": true,
  "deliveries": [
    { "routingRuleId": "…", "logId": "…", "status": "PENDING", "error": null }
  ]
}
```

| Поле | Значение |
| --- | --- |
| `matched` | сколько активных `RoutingRule` подошло под `client` + `type`. `0` — событие принято, но маршрут не настроен (не ошибка интеграции) |
| `queued` | `true`, если доставки поставлены в BullMQ |
| `deliveries[].status` | `PENDING` сразу после ответа; финальный статус смотрите в логах админки, статус в самом ответе **не обновляется** |
| `deliveries[].logId` | id записи `NotificationLog` — по нему ищите статус в UI |
| `idempotent` | присутствует и `true`, если это повтор с уже виденным `idempotency_key` (см. ниже) |

Одно событие может уйти в **несколько чатов** — если под `client`+`type` настроено несколько `RoutingRule`, в `deliveries` будет несколько элементов.

### Идемпотентность

Передавайте `idempotency_key`, если ваш источник может повторить отправку одного и того же события (ретраи HTTP-клиента, at-least-once очередь, ручной replay). Рекомендуемый формат — стабильный и уникальный на конкретное событие:

```
{тип}:{id_сущности}:{дата_или_версия}
# stock:42:2026-08-16
# price:1091:1737000000
# debtor:sale:5821
```

Повтор с тем же `client` + `idempotency_key`:
- не создаёт новую запись `NotificationLog` и не ставит новую джобу;
- возвращает **тот же** ответ, что и первый вызов, плюс `"idempotent": true`;
- безопасен для повторных вызовов (webhook retries, «упал после отправки — не знаю, дошло ли»).

Без `idempotency_key` каждый вызов `POST /events` создаёт новую доставку — при ретраях будет дубль сообщения в Telegram.

### Асинхронная доставка и статусы

`200 OK` от `/events` — это подтверждение приёма, не подтверждение отправки в Telegram. Реальная отправка происходит в фоне (BullMQ), с ретраями при сетевых ошибках и Telegram rate-limit.

Жизненный цикл `NotificationLog`:

```
PENDING → SENT     (успешно доставлено)
PENDING → FAILED   (Telegram отверг сообщение окончательно: бот заблокирован,
                     чат не найден, невалидный thread_id — ретраи не помогут)
```

Проверить статус:
- в админке → **Логи**, фильтр по клиенту/боту/статусу; клик по строке раскрывает текст сообщения и исходный JSON запроса;
- если у вас есть доступ к БД — таблица `notification_logs`, поле `id` = `logId` из ответа.

Если интеграции критично знать «дошло ли» — polling `logId` через админ-API не предусмотрен публично; договоритесь с администратором хаба про callback/webhook, если это нужно регулярно.

### Ошибки

| HTTP | Причина | Что делать |
| --- | --- | --- |
| `400` | Нет `client`/`type`/`payload`, лишние поля на верхнем уровне, `client` найден но `isActive: false` | Проверить тело запроса; если клиент неактивен — обратиться к администратору хаба |
| `401` | Задан `EVENTS_API_TOKEN`, а заголовок отсутствует/неверный | Проверить `Authorization`/`X-Notihub-Token` |
| `404` | Неизвестный `client` или `type` (нет такой записи в БД хаба) | Сверить slug/code с админкой; если сущности не существует — завести её там |

`matched: 0` в успешном (`200`) ответе — это **не ошибка**: `client` и `type` существуют, но для них нет активного `RoutingRule`. Просите администратора добавить маршрут.

### Примеры

**curl:**

```bash
curl -sS -X POST https://hub.example.com/events \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $EVENTS_API_TOKEN" \
  -d '{
    "client": "almaty-foods",
    "type": "stock_threshold",
    "idempotency_key": "stock:42:2026-08-16",
    "payload": { "message": "<b>Низкий остаток</b>\nТовар: Соус" }
  }'
```

**PHP / Laravel** (без SDK, обычный `Http`-клиент):

```php
use Illuminate\Support\Facades\Http;

Http::withToken(config('services.notihub.token'))
    ->acceptJson()
    ->asJson()
    ->post(config('services.notihub.url').'/events', [
        'client' => 'almaty-foods',
        'type' => 'stock_threshold',
        'idempotency_key' => 'stock:'.$product->id.':'.now()->toDateString(),
        'payload' => ['message' => $html],
    ])
    ->throw(); // 4xx/5xx -> исключение; ловите и логируйте, не роняйте бизнес-транзакцию
```

**Python:**

```python
import requests

response = requests.post(
    f"{HUB_URL}/events",
    headers={"Authorization": f"Bearer {TOKEN}"},
    json={
        "client": "s-webs",
        "type": "app_error",
        "payload": {"message": "boom"},
    },
    timeout=10,
)
response.raise_for_status()
```

**Node.js / TypeScript:**

```ts
const response = await fetch(`${HUB_URL}/events`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  },
  body: JSON.stringify({
    client: 's-webs',
    type: 'price_changed',
    payload: { message: 'Цена изменена' },
  }),
  signal: AbortSignal.timeout(10_000),
});
if (!response.ok) {
  throw new Error(`NotiHub ${response.status}: ${await response.text()}`);
}
```

**Обработка ошибок — общая рекомендация:** не давайте сбою хаба (сеть, 5xx, таймаут) ронять вашу основную бизнес-операцию (продажу, обновление товара). Оборачивайте вызов в try/catch, логируйте и продолжайте — уведомление не должно быть точкой отказа основного процесса.

## 3. Как формируется текст сообщения

Хаб не рендерит шаблоны — берёт готовый текст из `payload`:

1. Если в `payload` есть `message` или `text` (строка, непустая) — оно отправляется в Telegram как есть, с `parse_mode: HTML`.
2. Если ни того, ни другого нет — хаб сам собирает читаемый дамп: `[client] type`, затем `key: value` по всем полям `payload` (значения-объекты сериализуются в JSON), все значения HTML-эскейпятся. Подходит для отладки, но для продакшена лучше явно передавать `message`.

### HTML-разметка

Telegram Bot API поддерживает ограниченный набор тегов в режиме `HTML`. Хаб не проверяет и не переэскейпливает ваш `message` — что передали, то и уйдёт в Telegram API. Используйте только поддерживаемые теги:

```
<b>жирный</b>   <i>курсив</i>   <u>подчёркнутый</u>   <s>зачёркнутый</s>
<code>код</code>   <pre>блок кода</pre>
<a href="https://…">ссылка</a>
```

Перевод строки — обычный `\n` (не `<br>`). Если в тексте есть пользовательские данные (имя товара, контрагента и т.п.) — экранируйте `&`, `<`, `>` сами, иначе Telegram может вернуть ошибку парсинга разметки и доставка попадёт в `FAILED`.

```php
$safeName = htmlspecialchars($product->name, ENT_NOQUOTES);
$message = "<b>Товар:</b> {$safeName}";
```

## Вариант B: webhook-адаптер (без JSON хаба)

Если источник — стороннее SaaS с фиксированным форматом вебхука (например error-tracking), которое вы не контролируете, используйте адаптер вместо `POST /events`.

Сейчас есть один адаптер — **GlitchTip** (совместим и с классическим Sentry webhook payload):

```
POST {HUB_URL}/webhooks/glitchtip?client=<slug>
```

Секрет (`GLITCHTIP_WEBHOOK_SECRET`) передаётся одним из трёх способов:

- заголовок `X-Notihub-Webhook-Secret: <secret>`
- `Authorization: Bearer <secret>`
- query-параметр `?secret=<secret>` (используйте, если сервис не даёт настроить заголовки)

Хаб маппит issue/event в событие `type: app_error` и дальше обрабатывает его как обычный `POST /events` (включая идемпотентность по `issue_id`, если он есть в payload).

```bash
curl -sS -X POST "https://hub.example.com/webhooks/glitchtip?client=almaty-foods" \
  -H 'Content-Type: application/json' \
  -H "X-Notihub-Webhook-Secret: $GLITCHTIP_WEBHOOK_SECRET" \
  -d '{"project_name":"backend","message":"Undefined variable","url":"https://glitchtip.example/issues/42","id":"42"}'
```

Если вашего сервиса нет в списке адаптеров и у него нельзя настроить произвольный JSON — попросите администратора хаба добавить новый контроллер в `src/webhooks/` (это одна маленькая функция-маппер, не архитектурная задача).

## Проверка перед продакшеном

1. `client` и `type` существуют в админке, `RoutingRule` активен → в тестовом чате.
2. Один тестовый вызов с `payload.message` и `idempotency_key` → `200`, `matched >= 1`.
3. Повторный вызов с тем же `idempotency_key` → тот же ответ + `"idempotent": true`, в Telegram **не** пришло второе сообщение.
4. В админке → Логи: статус дошёл до `SENT`; текст сообщения читаемый (HTML-теги отрендерились, а не показались как есть).
5. Ошибочный вызов (неверный `type`) → `404`, ваш код это отрабатывает без падения бизнес-процесса.

## Справочно

- Интерактивная схема и “Try it out”: `{HUB_URL}/docs`
- Настройка ботов/клиентов/маршрутов, мониторинг хаба: [docs/operations.md](operations.md)
- Общий обзор проекта и локальный запуск: [README.md](../README.md)
