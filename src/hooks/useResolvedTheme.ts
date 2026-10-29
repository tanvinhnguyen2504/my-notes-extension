import { useEffect, useState } from 'react';
import { Theme, ThemePreference } from '@/src/core/types';
import { resolveTheme } from '@/src/core/utils';

// public/theme-init.js hard-codes this same string. That script runs before any
// module is loaded, so it cannot import the constant -- changing one name means
// changing both, and nothing will report the mismatch.
export const THEME_CACHE_KEY = 'theme.pref.v1';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(DARK_QUERY).matches;
}

export function useResolvedTheme(preference: ThemePreference): Theme {
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark);

  // The listener is what makes SYSTEM live: without it the OS preference is
  // read once at mount, so switching appearance with the popup open does
  // nothing until it is reopened.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const query = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent): void => {
      setPrefersDark(event.matches);
    };
    query.addEventListener('change', onChange);
    return () => {
      query.removeEventListener('change', onChange);
    };
  }, []);

  const theme = resolveTheme(preference, prefersDark);

  // Both attributes, always together. `data-theme` selects the token block in
  // styles.css; `color-scheme` hands the same choice to Chrome's own widgets --
  // the time and date inputs, and the scrollbars -- which no rule here reaches.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  // The pre-paint script reads the PREFERENCE, never the resolved value: a
  // cached 'light' would paint wrongly on the next open if the OS flipped to
  // dark while the popup was shut, which is the flash this cache exists to stop.
  useEffect(() => {
    try {
      localStorage.setItem(THEME_CACHE_KEY, preference);
    } catch (_) {
      // A full localStorage costs the flash guard, nothing else.
    }
  }, [preference]);

  return theme;
}
