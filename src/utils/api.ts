let cachedCsrfToken = '';

export async function ensureCsrfToken(): Promise<string> {
  if (cachedCsrfToken) return cachedCsrfToken;
  const res = await fetch('/api/csrf', { credentials: 'same-origin' });
  if (!res.ok) {
    throw new Error('Unable to initialize security token.');
  }
  const data = (await res.json()) as { csrfToken?: string };
  if (!data.csrfToken) {
    throw new Error('Security token missing.');
  }
  cachedCsrfToken = data.csrfToken;
  return cachedCsrfToken;
}

export async function apiJson<T>(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    requireCsrf?: boolean;
  } = {},
): Promise<{ status: number; ok: boolean; data: T }> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.requireCsrf || (method !== 'GET' && method !== 'HEAD')) {
    const token = await ensureCsrfToken();
    headers['X-CSRF-Token'] = token;
  }

  const res = await fetch(url, {
    method,
    headers,
    credentials: 'same-origin',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, ok: res.ok, data };
}

export async function apiUpload(url: string, file: File): Promise<{ ok: boolean; url?: string; error?: string }> {
  const token = await ensureCsrfToken();
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-CSRF-Token': token },
    credentials: 'same-origin',
    body: formData,
  });

  return (await res.json().catch(() => ({ ok: false, error: 'Upload failed.' }))) as {
    ok: boolean;
    url?: string;
    error?: string;
  };
}
