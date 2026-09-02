'use client';

import { useEffect } from 'react';
import { setUserId } from '@/lib/analytics';

interface PublicUser {
  id: string;
}

export default function AnalyticsUserId() {
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/auth/session');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const user = (data.authenticated && data.user) as PublicUser | undefined;
        setUserId(user?.id ?? null);
      } catch {
        if (!cancelled) setUserId(null);
      }
    }
    load();
    return () => {
      cancelled = true;
      setUserId(null);
    };
  }, []);
  return null;
}
