'use client'

import { Suspense } from 'react';
import AuthFlow, { type AuthMode } from './AuthFlow';
import AuthResultTracker from './AuthResultTracker';
import { styles } from './styles';

// Página standalone de auth (client): conecta el éxito del flujo con la
// navegación a /espacio (primera llegada tras registro → ?welcome=1).
export default function AuthPage({ initialMode }: { initialMode: AuthMode }) {
  const handleSuccess = (mode: AuthMode) => {
    window.location.href = mode === 'register' ? '/espacio?welcome=1' : '/espacio';
  };

  return (
    <div style={styles.pageWrap}>
      <div style={styles.brand}>Nartalis</div>
      <AuthFlow initialMode={initialMode} onSuccess={handleSuccess} />
      <Suspense fallback={null}>
        <AuthResultTracker result="error" />
      </Suspense>
    </div>
  );
}
