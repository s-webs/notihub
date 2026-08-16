export const APP_ERROR_TYPE = 'app_error';

export type GlitchTipMappedEvent = {
  client: string;
  type: typeof APP_ERROR_TYPE;
  payload: Record<string, unknown>;
  idempotency_key?: string;
};

export function mapGlitchTipPayload(
  client: string,
  body: unknown,
): GlitchTipMappedEvent {
  const root = asRecord(body);
  const issue = firstRecord(
    asRecord(root.data)?.issue,
    root.issue,
    asRecord(root.event),
    root,
  );

  const title =
    stringValue(issue.title) ??
    stringValue(issue.message) ??
    stringValue(root.message) ??
    'Application error';
  const culprit =
    stringValue(issue.culprit) ?? stringValue(root.culprit) ?? null;
  const url =
    stringValue(issue.permalink) ??
    stringValue(issue.url) ??
    stringValue(root.url) ??
    null;
  const level =
    stringValue(issue.level) ?? stringValue(root.level) ?? 'error';
  const project =
    stringValue(root.project_name) ??
    stringValue(root.project) ??
    stringValue(issue.project) ??
    null;
  const issueId =
    stringValue(issue.id) ??
    stringValue(root.id) ??
    stringValue(root.event_id) ??
    undefined;

  const lines = [
    '<b>Ошибка приложения</b>',
    '',
    `<b>Клиент:</b> ${escapeHtml(client)}`,
  ];
  if (project) {
    lines.push(`<b>Проект:</b> ${escapeHtml(project)}`);
  }
  lines.push(`<b>Уровень:</b> ${escapeHtml(level)}`);
  lines.push(`<b>Сообщение:</b> ${escapeHtml(title)}`);
  if (culprit) {
    lines.push(`<b>Источник:</b> ${escapeHtml(culprit)}`);
  }
  if (url) {
    lines.push(`<b>Ссылка:</b> ${escapeHtml(url)}`);
  }

  const payload: Record<string, unknown> = {
    message: lines.join('\n'),
    title,
    level,
    source: 'glitchtip',
  };
  if (project) {
    payload.project = project;
  }
  if (culprit) {
    payload.culprit = culprit;
  }
  if (url) {
    payload.url = url;
  }
  if (issueId) {
    payload.issue_id = issueId;
  }

  return {
    client,
    type: APP_ERROR_TYPE,
    payload,
    idempotency_key: issueId ? `glitchtip:${client}:${issueId}` : undefined,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function firstRecord(
  ...candidates: Array<unknown>
): Record<string, unknown> {
  for (const candidate of candidates) {
    const record = asRecord(candidate);
    if (Object.keys(record).length > 0) {
      return record;
    }
  }
  return {};
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
