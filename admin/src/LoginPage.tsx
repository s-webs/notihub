import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';
import { setAuth } from './auth';
import { Button, Field, Input } from './ui';

export function LoginPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setAuth(user, password);
    try {
      await api('/clients');
      navigate('/clients');
    } catch {
      setError('Неверный логин или пароль');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={(event) => void onSubmit(event)}
        className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm"
      >
        <div>
          <h1 className="text-lg font-semibold">NotiHub</h1>
          <p className="text-sm text-muted-foreground">Вход в админку</p>
        </div>
        <Field label="Логин" htmlFor="user">
          <Input
            id="user"
            autoComplete="username"
            value={user}
            onChange={(event) => setUser(event.target.value)}
          />
        </Field>
        <Field label="Пароль" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full">
          Войти
        </Button>
      </form>
    </main>
  );
}
