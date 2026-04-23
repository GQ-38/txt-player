import type { AuthResponse } from '../types';

const TOKEN_KEY = 'haven_access_token';
const REFRESH_KEY = 'haven_refresh_token';

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setSessionTokens(response: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, response.session.accessToken);
  localStorage.setItem(REFRESH_KEY, response.session.refreshToken);
}

export function clearSessionTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function parseResponse<T>(res: Response): Promise<T> {
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error || payload.message || '请求失败');
  }
  return payload as T;
}

let refreshingPromise: Promise<boolean> | null = null;

async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (!refreshingPromise) {
    refreshingPromise = fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        const payload = await parseResponse<AuthResponse>(res);
        setSessionTokens(payload);
        return true;
      })
      .catch(() => {
        clearSessionTokens();
        return false;
      })
      .finally(() => {
        refreshingPromise = null;
      });
  }
  return refreshingPromise;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init.headers || {});
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;

  if (!isFormData) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(path, {
    ...init,
    headers,
  });

  if (res.status === 401 && retry && getRefreshToken()) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiFetch<T>(path, init, false);
    }
  }

  return parseResponse<T>(res);
}
