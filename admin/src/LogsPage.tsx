import { Fragment, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { api } from './api';
import { previewMessage, sanitizeTelegramHtml } from './format-message';
import type { Bot, Client, LogItem } from './types';
import { Badge, Field, Select } from './ui';

export function LogsPage() {
  const [items, setItems] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [clients, setClients] = useState<Client[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [clientId, setClientId] = useState('');
  const [botId, setBotId] = useState('');
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (clientId) params.set('clientId', clientId);
    if (botId) params.set('botId', botId);
    if (status) params.set('status', status);
    params.set('take', '50');
    const data = await api<{ total: number; items: LogItem[] }>(
      `/logs?${params.toString()}`,
    );
    setItems(data.items);
    setTotal(data.total);
  }

  useEffect(() => {
    void Promise.all([api<Client[]>('/clients'), api<Bot[]>('/bots')])
      .then(([nextClients, nextBots]) => {
        setClients(nextClients);
        setBots(nextBots);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, [clientId, botId, status]);

  const tone = {
    SENT: 'ok',
    FAILED: 'bad',
    PENDING: 'warn',
  } as const;

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-xl font-semibold">Логи</h1>
        <p className="text-sm text-muted-foreground">{total} записей</p>
      </div>
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-3">
        <Field label="Клиент">
          <Select
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
          >
            <option value="">Все</option>
            {clients.map((item) => (
              <option key={item.id} value={item.id}>
                {item.slug}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Бот">
          <Select
            value={botId}
            onChange={(event) => setBotId(event.target.value)}
          >
            <option value="">Все</option>
            {bots.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Статус">
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Все</option>
            <option value="PENDING">PENDING</option>
            <option value="SENT">SENT</option>
            <option value="FAILED">FAILED</option>
          </Select>
        </Field>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="w-8 px-3 py-2 font-medium" />
              <th className="px-3 py-2 font-medium">Время</th>
              <th className="px-3 py-2 font-medium">Клиент</th>
              <th className="px-3 py-2 font-medium">Тип</th>
              <th className="px-3 py-2 font-medium">Сообщение</th>
              <th className="px-3 py-2 font-medium">Статус</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const open = openId === item.id;
              return (
                <Fragment key={item.id}>
                  <tr
                    className={`cursor-pointer border-t border-border hover:bg-muted/50 ${open ? 'bg-muted/60' : ''}`}
                    onClick={() => setOpenId(open ? null : item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setOpenId(open ? null : item.id);
                      }
                    }}
                    tabIndex={0}
                    aria-expanded={open}
                  >
                    <td className="px-3 py-2">
                      <ChevronDown
                        className={`size-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {item.routingRule.client.slug}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {item.routingRule.notificationType.code}
                    </td>
                    <td className="max-w-sm truncate px-3 py-2 text-muted-foreground">
                      {previewMessage(item.message)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={tone[item.status]}>{item.status}</Badge>
                    </td>
                  </tr>
                  {open ? (
                    <tr className="border-t border-border">
                      <td colSpan={6} className="bg-muted/40 px-4 py-4">
                        <LogDetails item={item} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LogDetails({ item }: { item: LogItem }) {
  const requestJson = item.request
    ? JSON.stringify(item.request, null, 2)
    : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="space-y-2">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Сообщение
        </h2>
        {item.message ? (
          <div
            className="log-message rounded-md border border-border bg-card p-3 text-sm leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html: sanitizeTelegramHtml(item.message),
            }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Тело сообщения не сохранено (лог создан до этой доработки).
          </p>
        )}
        {item.error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 font-mono text-xs text-destructive whitespace-pre-wrap">
            {item.error}
          </p>
        ) : null}
        <p className="font-mono text-xs text-muted-foreground">
          чат {item.routingRule.chatId} / топик {item.routingRule.threadId}
          {item.sentAt
            ? ` · отправлено ${new Date(item.sentAt).toLocaleString()}`
            : ''}
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Запрос
        </h2>
        {requestJson ? (
          <pre className="overflow-x-auto rounded-md border border-border bg-card p-3 font-mono text-xs leading-relaxed">
            {requestJson}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">
            Входящий запрос не сохранён (лог создан до этой доработки).
          </p>
        )}
      </section>
    </div>
  );
}
