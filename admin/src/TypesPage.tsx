import { FormEvent, useEffect, useState } from 'react';
import { api } from './api';
import type { NotificationType } from './types';
import { Button, Field, Input } from './ui';

export function TypesPage() {
  const [items, setItems] = useState<NotificationType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  async function load() {
    setItems(await api<NotificationType[]>('/notification-types'));
  }

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, []);

  function resetForm() {
    setEditingId(null);
    setCode('');
    setName('');
  }

  function startEdit(item: NotificationType) {
    setError(null);
    setEditingId(item.id);
    setCode(item.code);
    setName(item.name);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await api(`/notification-types/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({ code, name }),
        });
      } else {
        await api('/notification-types', {
          method: 'POST',
          body: JSON.stringify({ code, name }),
        });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  async function remove(item: NotificationType) {
    if (!confirm(`Удалить тип ${item.code}?`)) return;
    try {
      await api(`/notification-types/${item.id}`, { method: 'DELETE' });
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
      <h1 className="text-xl font-semibold">Типы уведомлений</h1>
      <form
        onSubmit={(event) => void onSubmit(event)}
        className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-3"
      >
        <Field label="Code" htmlFor="code">
          <Input
            id="code"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </Field>
        <Field label="Имя" htmlFor="type-name">
          <Input
            id="type-name"
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
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Имя</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className={`border-t border-border ${editingId === item.id ? 'bg-muted/60' : ''}`}
              >
                <td className="px-3 py-2 font-mono">{item.code}</td>
                <td className="px-3 py-2">{item.name}</td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" onClick={() => startEdit(item)}>
                    Изменить
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
