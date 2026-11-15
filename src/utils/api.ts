import { resolveApiUrl } from './url';

let cachedCsrfToken = '';

function getCredentialsMode(): RequestCredentials {
  const apiBase = (import.meta.env?.VITE_API_BASE_URL || '').trim();
  return apiBase ? 'include' : 'same-origin';
}

function isJsonResponse(res: Response): boolean {
  const contentType = res.headers.get('content-type') || '';
  return contentType.toLowerCase().includes('application/json');
}

export class StaticBackendUnavailableError extends Error {
  constructor() {
    super('Backend API is unavailable on static hosting.');
    this.name = 'StaticBackendUnavailableError';
  }
}

export async function ensureCsrfToken(): Promise<string> {
  if (cachedCsrfToken) return cachedCsrfToken;
  const res = await fetch(resolveApiUrl('/api/csrf'), { credentials: getCredentialsMode() });
  if (!isJsonResponse(res)) {
    throw new StaticBackendUnavailableError();
  }
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
): Promise<{ status: number; ok: boolean; staticBackendMissing?: boolean; data: T }> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.requireCsrf || (method !== 'GET' && method !== 'HEAD')) {
    const token = await ensureCsrfToken();
    headers['X-CSRF-Token'] = token;
  }

  const res = await fetch(resolveApiUrl(url), {
    method,
    headers,
    credentials: getCredentialsMode(),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!isJsonResponse(res)) {
    return {
      status: res.status,
      ok: false,
      staticBackendMissing: true,
      data: {} as T,
    };
  }

  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, ok: res.ok, data };
}

export async function apiUpload(url: string, file: File): Promise<{ ok: boolean; url?: string; error?: string }> {
  const token = await ensureCsrfToken();
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(resolveApiUrl(url), {
    method: 'POST',
    headers: { 'X-CSRF-Token': token },
    credentials: getCredentialsMode(),
    body: formData,
  });

  if (!isJsonResponse(res)) {
    return { ok: false, error: 'Backend API is unavailable on static hosting.' };
  }

  return (await res.json().catch(() => ({ ok: false, error: 'Upload failed.' }))) as {
    ok: boolean;
    url?: string;
    error?: string;
  };
}
