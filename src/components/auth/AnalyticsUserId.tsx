'use client';

import { useEffect } from 'react';
import { setUserId } from '@/lib/analytics';

export default function AnalyticsUserId({ userId }: { userId: string | null }) {
  useEffect(() => {
    setUserId(userId);
    return () => setUserId(null);
  }, [userId]);
  return null;
}
