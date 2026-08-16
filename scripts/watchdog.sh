#!/usr/bin/env bash
set -euo pipefail

# Внешний watchdog: если хаб не отвечает, пишет в Telegram напрямую
# (не через POST /events — иначе мёртвый хаб не сможет сообщить о себе).
#
# Cron / systemd timer раз в минуту:
#   HUB_HEALTH_URL=http://127.0.0.1:3040/health/ready bash scripts/watchdog.sh

URL="${HUB_HEALTH_URL:-http://127.0.0.1:3040/health/ready}"
TOKEN="${HUB_ALERT_BOT_TOKEN:-}"
CHAT="${HUB_ALERT_CHAT_ID:-}"
THREAD="${HUB_ALERT_THREAD_ID:-0}"
STATE_FILE="${HUB_WATCHDOG_STATE:-/tmp/notihub-watchdog-down}"

send_alert() {
  local text="$1"
  if [[ -z "$TOKEN" || -z "$CHAT" ]]; then
    echo "watchdog: $text (HUB_ALERT_BOT_TOKEN/CHAT_ID not set, skip Telegram)" >&2
    return 0
  fi
  local payload
  payload="$(jq -n --arg chat "$CHAT" --arg text "$text" --argjson thread "$THREAD" \
    '{chat_id:$chat, text:$text, parse_mode:"HTML", disable_web_page_preview:true} + (if $thread > 0 then {message_thread_id:$thread} else {} end)')"
  curl -fsS --max-time 10 \
    -H 'Content-Type: application/json' \
    -d "$payload" \
    "https://api.telegram.org/bot${TOKEN}/sendMessage" >/dev/null
}

if curl -fsS --max-time 5 "$URL" >/dev/null; then
  if [[ -f "$STATE_FILE" ]]; then
    rm -f "$STATE_FILE"
    send_alert "<b>Notification Hub:</b> снова отвечает (${URL})."
  fi
  exit 0
fi

echo "watchdog: $URL is down" >&2
if [[ -f "$STATE_FILE" ]]; then
  exit 1
fi
touch "$STATE_FILE"
send_alert "<b>Notification Hub не отвечает</b>\n\nGET ${URL} провалился. Проверьте процесс/Docker и логи."
exit 1
