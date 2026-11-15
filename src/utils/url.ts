export function normalizeBasePath(base?: string): string {
  const raw = (base || '/').trim();
  if (!raw || raw === '/') return '/';
  if (raw === '.' || raw === './') return './';
  return `/${raw.replace(/^\/+|\/+$/g, '')}/`;
}

export function resolveAssetUrl(
  url: string,
  baseUrl = import.meta.env?.BASE_URL || '/',
  apiBaseUrl = import.meta.env?.VITE_API_BASE_URL || '',
): string {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;

  const trimmedApiBase = apiBaseUrl.trim().replace(/\/+$/, '');
  if (url.startsWith('/uploads/') && trimmedApiBase) {
    return `${trimmedApiBase}${url}`;
  }

  if (url.startsWith('/')) {
    const normBase = normalizeBasePath(baseUrl);
    if (normBase === '/') return url;
    if (normBase === './') return `.${url}`;
    return `${normBase.replace(/\/+$/, '')}${url}`;
  }

  return url;
}

export function resolveApiUrl(
  path: string,
  apiBaseUrl = import.meta.env?.VITE_API_BASE_URL || '',
): string {
  const trimmedApiBase = apiBaseUrl.trim().replace(/\/+$/, '');
  if (!trimmedApiBase) return path;
  return `${trimmedApiBase}${path.startsWith('/') ? path : `/${path}`}`;
}

export function resolveAppRoutePath(
  pathname: string,
  baseUrl = import.meta.env?.BASE_URL || '/',
): string {
  const normBase = normalizeBasePath(baseUrl).replace(/\/+$/, '');
  if (normBase && normBase !== '.' && pathname.startsWith(normBase)) {
    const stripped = pathname.slice(normBase.length);
    return stripped.startsWith('/') ? stripped : `/${stripped}`;
  }
  if (normBase === '.' && /\/admin(?:\/.*)?$/.test(pathname)) {
    return pathname.slice(pathname.indexOf('/admin'));
  }
  return pathname || '/';
}

export function resolveAppHref(
  route: string,
  baseUrl = import.meta.env?.BASE_URL || '/',
): string {
  const normBase = normalizeBasePath(baseUrl);
  const cleanRoute = route.startsWith('/') ? route : `/${route}`;
  if (normBase === '/') return cleanRoute;
  if (normBase === './') return `.${cleanRoute}`;
  return `${normBase.replace(/\/+$/, '')}${cleanRoute}`;
}
