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
    let msg = `Request failed (${res.status})`;
    
    if (typeof err.detail === 'string') {
      msg = err.detail;
    } else if (Array.isArray(err.detail)) {
      // Handle Pydantic validation error arrays
      msg = err.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
    } else if (err.detail) {
      msg = JSON.stringify(err.detail);
    }
    
    throw new Error(msg);
  }
  // 204 No Content — return empty object
  if (res.status === 204) return {} as T;
  return res.json();
}
