'use client';

import { useEffect } from 'react';

export default function Eruda() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const enableFromQuery = params.has('eruda');
    const enableFromStorage = window.localStorage.getItem('eruda') === 'true';
    const enabled = enableFromQuery || enableFromStorage;

    if (enableFromQuery) {
      window.localStorage.setItem('eruda', 'true');
    }

    if (!enabled) return;

    let cancelled = false;
    (async () => {
      const mod = await import('eruda');
      if (cancelled) return;
      mod.default.init();
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
