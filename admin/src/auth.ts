const KEY = 'notihub.admin.auth';

export function getAuthHeader(): string | null {
  return sessionStorage.getItem(KEY);
}

export function setAuth(user: string, password: string) {
  sessionStorage.setItem(KEY, btoa(`${user}:${password}`));
}

export function clearAuth() {
  sessionStorage.removeItem(KEY);
}

export function isLoggedIn() {
  return Boolean(getAuthHeader());
}
