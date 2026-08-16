import { FormEvent, useEffect, useState } from 'react';
import { api } from './api';
import type { Bot, Client, NotificationType, RoutingRule } from './types';
import { Badge, Button, Field, Input, Select } from './ui';

export function RulesPage() {
  const [items, setItems] = useState<RoutingRule[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [types, setTypes] = useState<NotificationType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [botId, setBotId] = useState('');
  const [notificationTypeId, setNotificationTypeId] = useState('');
  const [chatId, setChatId] = useState('');
  const [threadId, setThreadId] = useState('0');

  async function load() {
    const [nextRules, nextClients, nextBots, nextTypes] = await Promise.all([
      api<RoutingRule[]>('/routing-rules'),
      api<Client[]>('/clients'),
      api<Bot[]>('/bots'),
      api<NotificationType[]>('/notification-types'),
    ]);
    setItems(nextRules);
    setClients(nextClients);
    setBots(nextBots);
    setTypes(nextTypes);
    setClientId((current) => current || nextClients[0]?.id || '');
    setBotId((current) => current || nextBots[0]?.id || '');
    setNotificationTypeId((current) => current || nextTypes[0]?.id || '');
  }

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, []);

  function resetForm() {
    setEditingId(null);
    setChatId('');
    setThreadId('0');
    setClientId(clients[0]?.id || '');
    setBotId(bots[0]?.id || '');
    setNotificationTypeId(types[0]?.id || '');
  }

  function startEdit(item: RoutingRule) {
    setError(null);
    setEditingId(item.id);
    setClientId(item.clientId);
    setBotId(item.botId);
    setNotificationTypeId(item.notificationTypeId);
    setChatId(item.chatId);
    setThreadId(String(item.threadId));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const payload = {
      clientId,
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
          body: JSON.stringify({ ...payload, isActive: true }),
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

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Маршруты</h1>
      <form
        onSubmit={(event) => void onSubmit(event)}
        className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-3"
      >
        <Field label="Клиент">
          <Select
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
          >
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
            {bots.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Тип">
          <Select
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
          <Button type="submit">{editingId ? 'Сохранить' : 'Добавить'}</Button>
          {editingId ? (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Отмена
            </Button>
          ) : null}
        </div>
      </form>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Клиент</th>
              <th className="px-3 py-2 font-medium">Бот</th>
              <th className="px-3 py-2 font-medium">Тип</th>
              <th className="px-3 py-2 font-medium">Чат / топик</th>
              <th className="px-3 py-2 font-medium">Статус</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className={`border-t border-border ${editingId === item.id ? 'bg-muted/60' : ''}`}
              >
                <td className="px-3 py-2 font-mono">{item.client.slug}</td>
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
          </tbody>
        </table>
      </div>
    </section>
  );
}
