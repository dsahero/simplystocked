const BASE_URL = 'http://localhost:8000';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
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
  }
  // 204 No Content — return empty object
  if (res.status === 204) return {} as T;
  return res.json();
}
