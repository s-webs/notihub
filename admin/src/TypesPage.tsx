import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from './api';
import type { Client, NotificationType } from './types';
import { Button, Field, Input } from './ui';

function typeBase(clientId: string) {
  return `/clients/${clientId}/notification-types`;
}

function useTypeContext(clientId: string | undefined, typeId?: string) {
  const [project, setProject] = useState<Client | null>(null);
  const [type, setType] = useState<NotificationType | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = `${clientId}/${typeId ?? ''}`;

  useEffect(() => {
    if (!clientId) return;
    let current = true;
    setLoadedKey(null);
    setError(null);
    void Promise.all([
      api<Client>(`/clients/${clientId}`),
      typeId ? api<NotificationType>(`${typeBase(clientId)}/${typeId}`) : Promise.resolve(null),
    ])
      .then(([nextProject, nextType]) => {
        if (!current) return;
        setProject(nextProject);
        setType(nextType);
      })
      .catch((err: Error) => {
        if (current) setError(err.message);
      })
      .finally(() => {
        if (current) setLoadedKey(key);
      });
    return () => { current = false; };
  }, [clientId, typeId]);

  return {
    project: loadedKey === key ? project : null,
    type: loadedKey === key ? type : null,
    loading: loadedKey !== key,
    error: loadedKey === key ? error : null,
  };
}

function BackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
      <ArrowLeft className="size-4" aria-hidden="true" />
      {children}
    </Link>
  );
}

function LoadState({ loading, error }: { loading: boolean; error: string | null }) {
  if (loading) return <p className="text-sm text-muted-foreground">Загрузка…</p>;
  return <p className="text-sm text-destructive" role="alert">{error ?? 'Запись не найдена.'}</p>;
}

export function TypesPage() {
  const { clientId = '' } = useParams();
  const { project, loading: projectLoading, error: projectError } = useTypeContext(clientId);
  const [items, setItems] = useState<NotificationType[]>([]);
  const [loadedClientId, setLoadedClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let current = true;
    setLoadedClientId(null);
    setError(null);
    void api<NotificationType[]>(typeBase(clientId))
      .then((types) => {
        if (current) setItems(types);
      })
      .catch((err: Error) => {
        if (current) setError(err.message);
      })
      .finally(() => {
        if (current) setLoadedClientId(clientId);
      });
    return () => { current = false; };
  }, [clientId]);

  const visibleItems = loadedClientId === clientId ? items : [];
  return (
    <section className="space-y-4">
      <div>
        <BackLink to={clientId ? `/clients/${clientId}` : '/clients'}>К проекту</BackLink>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Типы уведомлений</h1>
            {project ? <p className="text-sm text-muted-foreground">{project.name}</p> : null}
          </div>
          {project ? (
            <Link to={`/clients/${clientId}/types/new`} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">
              <Plus className="size-4" aria-hidden="true" /> Создать тип
            </Link>
          ) : null}
        </div>
      </div>
      {!project ? <LoadState loading={projectLoading} error={projectError} /> : null}
      {project && loadedClientId !== clientId ? <p className="text-sm text-muted-foreground">Загрузка типов…</p> : null}
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      {project && loadedClientId === clientId && !error && visibleItems.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">В проекте пока нет типов уведомлений.</div>
      ) : null}
      {project && visibleItems.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) => (
            <Link key={item.id} to={`/clients/${clientId}/types/${item.id}`} className="block rounded-xl border border-border bg-card p-4 shadow-sm hover:border-primary">
              <h2 className="break-all font-mono text-sm font-semibold text-primary">{item.code}</h2>
              <p className="mt-2 break-words text-sm">{item.name}</p>
              <span className="mt-4 block text-sm font-medium text-primary">Открыть →</span>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function TypeDetailsPage() {
  const { clientId = '', typeId = '' } = useParams();
  const { project, type, loading, error } = useTypeContext(clientId, typeId);
  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div>
        <BackLink to={`/clients/${clientId}/types`}>Типы уведомлений</BackLink>
        <h1 className="mt-2 break-all text-2xl font-semibold">{type?.code ?? 'Тип уведомления'}</h1>
        {project ? <p className="text-sm text-muted-foreground">Проект: {project.name}</p> : null}
      </div>
      {!type ? <LoadState loading={loading} error={error} /> : (
        <>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">Имя</p>
            <p className="mt-1 text-sm">{type.name}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link to={`/clients/${clientId}/types/${type.id}/edit`} className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">Изменить тип</Link>
            <Link to={`/clients/${clientId}/types/${type.id}/delete`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-destructive px-4 text-sm font-medium text-destructive hover:bg-red-50">Удалить тип</Link>
          </div>
        </>
      )}
    </section>
  );
}

export function TypeFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { clientId = '', typeId = '' } = useParams();
  const navigate = useNavigate();
  const isEdit = mode === 'edit';
  const { project, type, loading, error: loadError } = useTypeContext(clientId, isEdit ? typeId : undefined);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!type) return;
    setCode(type.code);
    setName(type.name);
  }, [type?.id]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || (isEdit && !type)) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await api<NotificationType>(isEdit ? `${typeBase(clientId)}/${type!.id}` : typeBase(clientId), {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify({ code: code.trim(), name: name.trim() }),
      });
      navigate(`/clients/${clientId}/types/${saved.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  }

  const backTo = isEdit && type ? `/clients/${clientId}/types/${type.id}` : `/clients/${clientId}/types`;
  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div>
        <BackLink to={backTo}>{isEdit && type ? 'К типу' : 'Типы уведомлений'}</BackLink>
        <h1 className="mt-2 text-2xl font-semibold">{isEdit ? 'Изменить тип' : 'Создать тип уведомления'}</h1>
        {project ? <p className="text-sm text-muted-foreground">Проект: {project.name}</p> : null}
      </div>
      {!project || (isEdit && !type) ? <LoadState loading={loading} error={loadError} /> : (
        <form onSubmit={(event) => void onSubmit(event)} className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm">
          <Field label="Код" htmlFor="type-code">
            <Input id="type-code" required autoComplete="off" className="min-h-11" value={code} onChange={(event) => setCode(event.target.value)} />
          </Field>
          <Field label="Имя" htmlFor="type-name">
            <Input id="type-name" required className="min-h-11" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy} className="min-h-11 px-5">{busy ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Создать тип'}</Button>
            <Link to={backTo} className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium hover:bg-muted">Отмена</Link>
          </div>
        </form>
      )}
    </section>
  );
}

export function TypeDeletePage() {
  const { clientId = '', typeId = '' } = useParams();
  const navigate = useNavigate();
  const { project, type, loading, error: loadError } = useTypeContext(clientId, typeId);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!type) return;
    setBusy(true);
    setError(null);
    try {
      await api(`${typeBase(clientId)}/${type.id}`, { method: 'DELETE' });
      navigate(`/clients/${clientId}/types`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div>
        <BackLink to={type ? `/clients/${clientId}/types/${type.id}` : `/clients/${clientId}/types`}>{type ? 'К типу' : 'Типы уведомлений'}</BackLink>
        <h1 className="mt-2 text-2xl font-semibold">Удалить тип уведомления</h1>
        {project ? <p className="text-sm text-muted-foreground">Проект: {project.name}</p> : null}
      </div>
      {!type ? <LoadState loading={loading} error={loadError} /> : (
        <div className="space-y-4 rounded-xl border border-destructive bg-card p-5 shadow-sm">
          <p>Вы собираетесь удалить тип <strong className="break-all font-mono">{type.code}</strong>.</p>
          <p className="text-sm text-muted-foreground">Удаление нельзя отменить. Если тип используется в маршрутах, сначала удалите эти маршруты.</p>
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="danger" disabled={busy} className="min-h-11 px-5" onClick={() => void remove()}>{busy ? 'Удаление…' : 'Удалить тип'}</Button>
            <Link to={`/clients/${clientId}/types/${type.id}`} className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium hover:bg-muted">Отмена</Link>
          </div>
        </div>
      )}
    </section>
  );
}
