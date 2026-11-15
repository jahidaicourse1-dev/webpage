export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'portfolio-theme';

export function resolveInitialTheme(
  stored: string | null | undefined,
  systemPrefersDark: boolean,
): ThemeMode {
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return systemPrefersDark ? 'dark' : 'light';
}

export function applyThemeToDocument(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
