import { clearAuth, getAuthHeader } from './auth';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = getAuthHeader();
  const response = await fetch(`/api/admin${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(auth ? { Authorization: `Basic ${auth}` } : {}),
      ...init.headers,
    },
  });

  if (response.status === 401) {
    clearAuth();
    throw new ApiError('Нужна авторизация', 401);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof data.message === 'string'
        ? data.message
        : `Ошибка ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}
