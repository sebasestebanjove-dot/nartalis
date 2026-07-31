'use client'

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { track } from '@/lib/analytics';

const INTENT_KEY = 'nartalis_auth_intent';

// Registra los eventos completed/failed de los flujos OAuth (Google).
// El intento (register|login) se guardó en sessionStorage antes de redirigir
// a /api/auth/google; el callback redirige aquí con ?auth=success o ?auth=error.
export default function AuthResultTracker({ result }: { result: 'success' | 'error' }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('auth') !== result) return;
    let intent = 'login';
    try {
      intent = sessionStorage.getItem(INTENT_KEY) || 'login';
    } catch {
      // sin almacenamiento disponible
    }
    const provider = searchParams.get('provider') || 'google';
    if (result === 'success') {
      track(intent === 'register' ? 'registration_completed' : 'login_completed', { provider });
    } else {
      track(intent === 'register' ? 'registration_failed' : 'login_failed', { provider });
    }
    try {
      sessionStorage.removeItem(INTENT_KEY);
    } catch {
      // sin almacenamiento disponible
    }
  }, [searchParams, result]);

  return null;
}
