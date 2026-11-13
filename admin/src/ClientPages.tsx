import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, Bell, Route } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from './api';
import type { Client } from './types';
import { Badge, Button, Field, Input } from './ui';

function useProject(clientId: string | undefined) {
  const [project, setProject] = useState<Client | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let current = true;
    setLoadedId(null);
    setProject(null);
    setError(null);
    void api<Client>(`/clients/${clientId}`)
      .then((item) => {
        if (current) setProject(item);
      })
      .catch((err: Error) => {
        if (current) setError(err.message);
      })
      .finally(() => {
        if (current) setLoadedId(clientId);
      });
    return () => { current = false; };
  }, [clientId]);

  return {
    project: loadedId === clientId ? project : null,
    setProject,
    loading: Boolean(clientId && loadedId !== clientId),
    error: loadedId === clientId ? error : null,
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

function ProjectLoadState({ loading, error }: { loading: boolean; error: string | null }) {
  if (loading) return <p className="text-sm text-muted-foreground">Загрузка проекта…</p>;
  return (
    <div className="space-y-2">
      <p className={error ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'} role={error ? 'alert' : undefined}>
        {error ?? 'Проект не найден.'}
      </p>
      <Link to="/clients" className="text-sm text-primary hover:underline">Вернуться к проектам</Link>
    </div>
  );
}

export function ClientDetailsPage() {
  const { clientId } = useParams();
  const { project, setProject, loading, error } = useProject(clientId);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!project) return;
    setBusy(true);
    setActionError(null);
    try {
      const updated = await api<Client>(`/clients/${project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !project.isActive }),
      });
      setProject(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div>
        <BackLink to="/clients">Проекты</BackLink>
        <h1 className="mt-2 text-2xl font-semibold">{project?.name ?? 'Проект'}</h1>
      </div>
      {!project ? <ProjectLoadState loading={loading} error={error} /> : (
        <>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Slug</dt>
                <dd className="mt-1 break-all font-mono text-sm">{project.slug}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Статус</dt>
                <dd className="mt-1"><Badge tone={project.isActive ? 'ok' : 'muted'}>{project.isActive ? 'active' : 'off'}</Badge></dd>
              </div>
            </dl>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link to={`/clients/${project.id}/rules`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">
              <Route className="size-4" aria-hidden="true" /> Маршруты
            </Link>
            <Link to={`/clients/${project.id}/types`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
              <Bell className="size-4" aria-hidden="true" /> Типы уведомлений
            </Link>
            <Link to={`/clients/${project.id}/edit`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
              Изменить проект
            </Link>
            <Button type="button" variant="ghost" className="min-h-11 border border-border bg-card" disabled={busy} onClick={() => void toggle()}>
              {project.isActive ? 'Выключить проект' : 'Включить проект'}
            </Button>
            <Link to={`/clients/${project.id}/delete`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-destructive px-4 text-sm font-medium text-destructive hover:bg-red-50">
              Удалить проект
            </Link>
          </div>
          {actionError ? <p className="text-sm text-destructive" role="alert">{actionError}</p> : null}
        </>
      )}
    </section>
  );
}

export function ClientFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { project, loading, error: loadError } = useProject(mode === 'edit' ? clientId : undefined);
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!project) return;
    setSlug(project.slug);
    setName(project.name);
  }, [project?.id]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === 'edit' && !project) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await api<Client>(mode === 'create' ? '/clients' : `/clients/${project!.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        body: JSON.stringify(mode === 'create' ? { slug: slug.trim(), name: name.trim(), isActive: true } : { slug: slug.trim(), name: name.trim() }),
      });
      navigate(`/clients/${saved.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  }

  const isEdit = mode === 'edit';
  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div>
        <BackLink to={isEdit && project ? `/clients/${project.id}` : '/clients'}>{isEdit && project ? 'К проекту' : 'Проекты'}</BackLink>
        <h1 className="mt-2 text-2xl font-semibold">{isEdit ? 'Изменить проект' : 'Создать проект'}</h1>
      </div>
      {isEdit && !project ? <ProjectLoadState loading={loading} error={loadError} /> : (
        <form onSubmit={(event) => void onSubmit(event)} className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm">
          <Field label="Slug" htmlFor="project-slug">
            <Input id="project-slug" required autoComplete="off" value={slug} onChange={(event) => setSlug(event.target.value)} className="min-h-11" />
          </Field>
          <Field label="Имя" htmlFor="project-name">
            <Input id="project-name" required value={name} onChange={(event) => setName(event.target.value)} className="min-h-11" />
          </Field>
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy} className="min-h-11 px-5">{busy ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Создать проект'}</Button>
            <Link to={isEdit && clientId ? `/clients/${clientId}` : '/clients'} className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium hover:bg-muted">Отмена</Link>
          </div>
        </form>
      )}
    </section>
  );
}

export function ClientDeletePage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { project, loading, error: loadError } = useProject(clientId);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!project) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/clients/${project.id}`, { method: 'DELETE' });
      navigate('/clients', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div>
        <BackLink to={project ? `/clients/${project.id}` : '/clients'}>{project ? 'К проекту' : 'Проекты'}</BackLink>
        <h1 className="mt-2 text-2xl font-semibold">Удалить проект</h1>
      </div>
      {!project ? <ProjectLoadState loading={loading} error={loadError} /> : (
        <div className="space-y-4 rounded-xl border border-destructive bg-card p-5 shadow-sm">
          <p>Вы собираетесь удалить проект <strong>{project.name}</strong> <span className="break-all font-mono text-sm">({project.slug})</span>.</p>
          <p className="text-sm text-muted-foreground">Удаление нельзя отменить. Если у проекта есть маршруты, сначала удалите их.</p>
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="danger" disabled={busy} className="min-h-11 px-5" onClick={() => void remove()}>{busy ? 'Удаление…' : 'Удалить проект'}</Button>
            <Link to={`/clients/${project.id}`} className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium hover:bg-muted">Отмена</Link>
          </div>
        </div>
      )}
    </section>
  );
}
