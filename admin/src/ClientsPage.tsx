import { FormEvent, useEffect, useState } from 'react';
import { api } from './api';
import type { Client } from './types';
import { Badge, Button, Field, Input } from './ui';

export function ClientsPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');

  async function load() {
    setItems(await api<Client[]>('/clients'));
  }

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, []);

  function resetForm() {
    setEditingId(null);
    setSlug('');
    setName('');
  }

  function startEdit(item: Client) {
    setError(null);
    setEditingId(item.id);
    setSlug(item.slug);
    setName(item.name);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await api(`/clients/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({ slug, name }),
        });
      } else {
        await api('/clients', {
          method: 'POST',
          body: JSON.stringify({ slug, name, isActive: true }),
        });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  async function toggle(item: Client) {
    await api(`/clients/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    await load();
  }

  async function remove(item: Client) {
    if (!confirm(`Удалить клиента ${item.slug}?`)) return;
    try {
      await api(`/clients/${item.id}`, { method: 'DELETE' });
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
      <h1 className="text-xl font-semibold">Клиенты</h1>
      <form
        onSubmit={(event) => void onSubmit(event)}
        className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-3"
      >
        <Field label="Slug" htmlFor="slug">
          <Input
            id="slug"
            required
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
          />
        </Field>
        <Field label="Имя" htmlFor="name">
          <Input
            id="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
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
              <th className="px-3 py-2 font-medium">Slug</th>
              <th className="px-3 py-2 font-medium">Имя</th>
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
                <td className="px-3 py-2 font-mono">{item.slug}</td>
                <td className="px-3 py-2">{item.name}</td>
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
