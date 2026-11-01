# PDF-вложения из Rentory

NotiHub принимает обычное событие `POST /events`. Если `payload.document` содержит
`url` и `filename`, Telegram-маршрут отправляет файл через `sendDocument`, а
`payload.message` использует как подпись. Без `document` отправляется текстовое
сообщение. Подпись Telegram ограничена 1024 символами.

```json
{
  "client": "rentory-almatyfoods",
  "type": "receipt_received",
  "idempotency_key": "receipt:received:...",
  "payload": {
    "message": "📄 <b>Поступила квитанция</b>\nЛицевой счёт: <b>1690990</b>",
    "document": {
      "url": "https://rentory.example/receipts/public/.../document?expires=...&signature=...",
      "filename": "alseco_bill.pdf"
    }
  }
}
```

Для защиты от загрузки посторонних адресов задайте в контейнере NotiHub точный
origin Rentory API:

```dotenv
DOCUMENT_ALLOWED_ORIGINS=https://rentory.example
```

Можно указать несколько origin через запятую. По умолчанию загрузка документов
выключена. NotiHub не следует перенаправлениям, принимает только PDF до 25 МБ
и скачивает файл в момент отправки. Источник должен отдавать файл по HTTPS
или по доступному контейнеру внутреннему HTTP-адресу. Подписанные ссылки
Rentory действуют один час; долгая остановка очереди может привести к
ошибке скачивания, которую видно в журнале отправок.
