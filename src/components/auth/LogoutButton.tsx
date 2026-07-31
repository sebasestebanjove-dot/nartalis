'use client'

import { useState } from 'react';
import { track } from '@/lib/analytics';

export default function LogoutButton({ style }: { style?: React.CSSProperties }) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      track('logout');
    } catch {
      // silencioso: la sesión se destruye igualmente en el siguiente intento
    } finally {
      window.location.href = '/';
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      style={style || {
        background: 'none',
        border: 'none',
        padding: 0,
        color: '#A1A1AA',
        fontSize: 14,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {loading ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </button>
  );
}
