import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from './api';
import type { Bot, Client, NotificationType, RoutingRule } from './types';
import { Badge, Button, Field, Input, Select } from './ui';

export function RulesPage() {
  const { clientId = '' } = useParams();
  const [items, setItems] = useState<RoutingRule[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [loadedClientId, setLoadedClientId] = useState<string | null>(null);
  const [bots, setBots] = useState<Bot[]>([]);
  const [types, setTypes] = useState<NotificationType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [botId, setBotId] = useState('');
  const [notificationTypeId, setNotificationTypeId] = useState('');
  const [chatId, setChatId] = useState('');
  const [threadId, setThreadId] = useState('0');

  async function load() {
    const [nextRules, nextClients, nextBots, nextTypes] = await Promise.all([
      api<RoutingRule[]>(
        `/routing-rules?clientId=${encodeURIComponent(clientId)}`,
      ),
      api<Client[]>('/clients'),
      api<Bot[]>('/bots'),
      api<NotificationType[]>(`/clients/${clientId}/notification-types`),
    ]);
    setItems(nextRules);
    setClient(nextClients.find((item) => item.id === clientId) ?? null);
    setBots(nextBots);
    setTypes(nextTypes);
    setBotId((current) => current || nextBots[0]?.id || '');
    setNotificationTypeId((current) =>
      nextTypes.some((item) => item.id === current) ? current : nextTypes[0]?.id || '',
    );
    setLoadedClientId(clientId);
  }

  useEffect(() => {
    setEditingId(null);
    setChatId('');
    setThreadId('0');
    setError(null);
    setLoadedClientId(null);
    void load().catch((err: Error) => {
      setError(err.message);
      setLoadedClientId(clientId);
    });
  }, [clientId]);

  function resetForm() {
    setEditingId(null);
    setChatId('');
    setThreadId('0');
    setBotId(bots[0]?.id || '');
    setNotificationTypeId(types[0]?.id || '');
  }

  function startEdit(item: RoutingRule) {
    setError(null);
    setEditingId(item.id);
    setBotId(item.botId);
    setNotificationTypeId(item.notificationTypeId);
    setChatId(item.chatId);
    setThreadId(String(item.threadId));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const payload = {
      botId,
      notificationTypeId,
      chatId,
      threadId: Number(threadId) || 0,
    };
    try {
      if (editingId) {
        await api(`/routing-rules/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await api('/routing-rules', {
          method: 'POST',
          body: JSON.stringify({ ...payload, clientId, isActive: true }),
        });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  async function toggle(item: RoutingRule) {
    await api(`/routing-rules/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    await load();
  }

  async function remove(item: RoutingRule) {
    if (!confirm('Удалить правило маршрутизации?')) return;
    try {
      await api(`/routing-rules/${item.id}`, { method: 'DELETE' });
      if (editingId === item.id) {
        resetForm();
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  const selectedClient = loadedClientId === clientId ? client : null;
  const visibleItems = loadedClientId === clientId ? items : [];

  return (
    <section className="space-y-4">
      <div>
        <Link to={`/clients/${clientId}`} className="text-sm text-primary hover:underline">
          ← К проекту
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          Маршруты проекта {selectedClient?.name ?? ''}
        </h1>
        {selectedClient ? (
          <p className="text-sm text-muted-foreground">{selectedClient.slug}</p>
        ) : null}
      </div>
      {loadedClientId !== clientId ? (
        <p className="text-sm text-muted-foreground">Загрузка проекта…</p>
      ) : null}
      {loadedClientId === clientId && !selectedClient && !error ? (
        <p className="text-sm text-muted-foreground">Проект не найден.</p>
      ) : null}
      {selectedClient ? (
        <form
          onSubmit={(event) => void onSubmit(event)}
          className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-3"
        >
          <Field label="Бот">
            <Select
              required
              value={botId}
              onChange={(event) => setBotId(event.target.value)}
            >
              {bots.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Тип">
            <Select
              required
              value={notificationTypeId}
              onChange={(event) => setNotificationTypeId(event.target.value)}
            >
              {types.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="chat_id" htmlFor="chat">
            <Input
              id="chat"
              required
              value={chatId}
              onChange={(event) => setChatId(event.target.value)}
            />
          </Field>
          <Field label="thread_id" htmlFor="thread">
            <Input
              id="thread"
              type="number"
              min={0}
              value={threadId}
              onChange={(event) => setThreadId(event.target.value)}
            />
          </Field>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={bots.length === 0 || types.length === 0}>
              {editingId ? 'Сохранить' : 'Добавить'}
            </Button>
            {editingId ? (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Отмена
              </Button>
            ) : null}
          </div>
          {bots.length === 0 || types.length === 0 ? (
            <p className="text-sm text-muted-foreground md:col-span-3">
              Для маршрута сначала добавьте{' '}
              <Link to="/bots" className="text-primary hover:underline">
                бота
              </Link>{' '}
              и{' '}
              <Link to={`/clients/${clientId}/types`} className="text-primary hover:underline">
                тип уведомления
              </Link>
              .
            </p>
          ) : null}
        </form>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {selectedClient ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Бот</th>
                <th className="px-3 py-2 font-medium">Тип</th>
                <th className="px-3 py-2 font-medium">Чат / топик</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr
                  key={item.id}
                  className={`border-t border-border ${editingId === item.id ? 'bg-muted/60' : ''}`}
                >
                  <td className="px-3 py-2">{item.bot.name}</td>
                  <td className="px-3 py-2 font-mono">
                    {item.notificationType.code}
                  </td>
                  <td className="px-3 py-2 font-mono">
                    {item.chatId} / {item.threadId}
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={item.isActive ? 'ok' : 'muted'}>
                      {item.isActive ? 'active' : 'off'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" onClick={() => startEdit(item)}>
                      Изменить
                    </Button>
                    <Button variant="ghost" onClick={() => void toggle(item)}>
                      {item.isActive ? 'Выключить' : 'Включить'}
                    </Button>
                    <Button variant="ghost" onClick={() => void remove(item)}>
                      Удалить
                    </Button>
                  </td>
                </tr>
              ))}
              {visibleItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    У проекта пока нет маршрутов.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
