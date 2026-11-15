import { useCallback, useEffect, useState } from 'react';
import {
  applyThemeToDocument,
  resolveInitialTheme,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from '../utils/theme';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      stored = null;
    }
    const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    return resolveInitialTheme(stored, systemDark);
  });

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onSystemChange = (e: MediaQueryListEvent) => {
      try {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (stored !== 'light' && stored !== 'dark') {
          setTheme(e.matches ? 'dark' : 'light');
        }
      } catch {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', onSystemChange);
    return () => mq.removeEventListener('change', onSystemChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // ignore storage restrictions
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
