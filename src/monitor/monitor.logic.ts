import { ReadyStatus } from '../health/health.service';

export type MonitorTransition = 'down' | 'recovered' | null;

export function readyTransition(
  wasDown: boolean,
  snapshot: ReadyStatus,
): MonitorTransition {
  const isDown = snapshot.status !== 'ok';
  if (isDown && !wasDown) {
    return 'down';
  }
  if (!isDown && wasDown) {
    return 'recovered';
  }
  return null;
}

export function formatReadyAlert(snapshot: ReadyStatus): string {
  return [
    '<b>Notification Hub: зависимости недоступны</b>',
    '',
    `<b>Postgres:</b> ${snapshot.postgres ? 'ok' : 'FAIL'}`,
    `<b>Redis:</b> ${snapshot.redis ? 'ok' : 'FAIL'}`,
  ].join('\n');
}

export function formatRecoveredAlert(): string {
  return '<b>Notification Hub:</b> Postgres и Redis снова доступны.';
}

export function formatFailureSpikeAlert(
  count: number,
  minutes: number,
): string {
  return [
    '<b>Notification Hub: всплеск FAILED</b>',
    '',
    `За ${minutes} мин. доставок со статусом FAILED: <b>${count}</b>.`,
    'Проверьте /queues и логи процессора Telegram.',
  ].join('\n');
}
