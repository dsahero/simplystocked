<<<<<<< HEAD
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'simplystocked_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
=======
const BASE_URL = 'http://localhost:8000';
>>>>>>> invoice

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
<<<<<<< HEAD
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `Request failed: ${res.status}`);
=======
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = err.detail;
    const message = Array.isArray(detail)
      ? detail.map((d: any) => {
          const loc = Array.isArray(d.loc) ? d.loc.join('.') : '';
          const msg = d.msg ?? JSON.stringify(d);
          return loc ? `${loc}: ${msg}` : msg;
        }).join('; ')
      : (typeof detail === 'string' ? detail : `Request failed: ${res.status}`);
    throw new Error(message);
>>>>>>> invoice
  }
  // 204 No Content — return empty object
  if (res.status === 204) return {} as T;
  return res.json();
}
