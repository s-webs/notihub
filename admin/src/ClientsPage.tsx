import { useEffect, useState } from 'react';
import { ArrowRight, Plus, Route } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from './api';
import type { Client } from './types';
import { Badge } from './ui';

export function ClientsPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    void api<Client[]>('/clients')
      .then((clients) => {
        if (current) setItems(clients);
      })
      .catch((err: Error) => {
        if (current) setError(err.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => { current = false; };
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Проекты</h1>
        <Link
          to="/clients/new"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover"
        >
          <Plus className="size-4" aria-hidden="true" />
          Создать проект
        </Link>
      </div>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Загрузка проектов…</p> : null}
      {!loading && !error && items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Проектов пока нет. Создайте первый проект.
        </div>
      ) : null}
      {items.length > 0 ? (
        <>
          <div className="grid gap-3 lg:hidden">
            {items.map((item) => (
              <article key={item.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold leading-snug break-words">{item.name}</h2>
                    <p className="mt-1 font-mono text-xs text-muted-foreground break-all">{item.slug}</p>
                  </div>
                  <div className="shrink-0">
                    <Badge tone={item.isActive ? 'ok' : 'muted'}>
                      {item.isActive ? 'active' : 'off'}
                    </Badge>
                  </div>
                </div>
                <Link
                  to={`/clients/${item.id}`}
                  className="mt-4 flex min-h-11 items-center justify-between rounded-md bg-primary px-3 text-sm font-medium text-white hover:bg-primary-hover"
                >
                  Открыть проект
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  to={`/clients/${item.id}/rules`}
                  className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-md border border-border text-sm font-medium hover:bg-muted"
                >
                  <Route className="size-4" aria-hidden="true" />
                  Маршруты
                </Link>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-card lg:block">
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
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-3 py-3 font-mono">{item.slug}</td>
                    <td className="px-3 py-3">{item.name}</td>
                    <td className="px-3 py-3">
                      <Badge tone={item.isActive ? 'ok' : 'muted'}>
                        {item.isActive ? 'active' : 'off'}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link to={`/clients/${item.id}`} className="rounded-md px-3 py-2 font-medium text-primary hover:bg-muted">
                        Открыть
                      </Link>
                      <Link to={`/clients/${item.id}/rules`} className="rounded-md px-3 py-2 font-medium text-primary hover:bg-muted">
                        Маршруты
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
