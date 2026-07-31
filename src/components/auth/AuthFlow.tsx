'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { track } from '@/lib/analytics';
import { styles } from './styles';

export type AuthMode = 'login' | 'register';
export type AuthResult = 'success' | 'error' | 'notice';

export interface AuthPayload {
  name?: string;
  email: string;
  password: string;
}

interface AuthFlowProps {
  initialMode?: AuthMode;
  onSuccess?: (mode: AuthMode) => void;
  onBack?: () => void;
  titleId?: string;
}

// Intención del flujo para los eventos completados/fallidos de OAuth (sin PII).
const INTENT_KEY = 'nartalis_auth_intent';

export default function AuthFlow({ initialMode = 'register', onSuccess, onBack, titleId }: AuthFlowProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<AuthResult | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'register') {
      track('registration_view');
    } else {
      track('login_view');
    }
  }, [mode]);

  const switchMode = (m: AuthMode) => {
    setStatus(null);
    setMessage('');
    setMode(m);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setStatus(null);
    setMessage('');
    setLoading(true);

    const payload: AuthPayload = { email, password };
    if (mode === 'register') {
      track('registration_started', { provider: 'email' });
      payload.name = name;
    } else {
      track('login_started', { provider: 'email' });
    }

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'Algo salió mal. Inténtalo de nuevo.');
        if (mode === 'register') {
          track('registration_failed', { provider: 'email' });
        } else {
          track('login_failed', { provider: 'email' });
        }
        return;
      }

      if (mode === 'register') {
        track('registration_completed', { provider: 'email' });
      } else {
        track('login_completed', { provider: 'email' });
      }
      onSuccess?.(mode);
    } catch {
      setStatus('error');
      setMessage('No hay conexión con el servidor. Inténtalo de nuevo.');
      if (mode === 'register') {
        track('registration_failed', { provider: 'email' });
      } else {
        track('login_failed', { provider: 'email' });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (loading) return;
    setStatus(null);
    setMessage('');
    setLoading(true);
    track(mode === 'register' ? 'registration_started' : 'login_started', { provider: 'google' });
    // Persistir intención para registrar completed/failed tras el callback (sin PII).
    try {
      sessionStorage.setItem(INTENT_KEY, mode);
    } catch {
      // sin almacenamiento disponible: se asume login en el tracker
    }
    window.location.href = '/api/auth/google';
  }

  async function handleApple() {
    track(mode === 'register' ? 'registration_started' : 'login_started', { provider: 'apple' });
    setStatus('notice');
    setMessage('Apple estará disponible próximamente.');
  }

  return (
    <form onSubmit={handleSubmit} style={styles.card}>
      <h1 id={titleId} style={styles.title}>{mode === 'register' ? 'Crea tu espacio personal' : 'Bienvenido de nuevo'}</h1>
      <p style={styles.subtitle}>
        {mode === 'register'
          ? 'Guarda tus medicamentos, organiza tu botiquín y ten tu información siempre contigo.'
          : 'Accede a tu espacio personal para gestionar tus medicamentos y preferencias.'}
      </p>

      <div style={styles.providerRow}>
        <button type="button" style={styles.providerBtn} onClick={handleGoogle} disabled={loading}>
          Continuar con Google
        </button>
        <button type="button" style={styles.providerBtn} onClick={handleApple} disabled={loading}>
          Continuar con Apple
        </button>
      </div>

      <div style={styles.divider}>
        <span style={styles.dividerLine} />
        <span>o con tu correo</span>
        <span style={styles.dividerLine} />
      </div>

      {mode === 'register' && (
        <div style={styles.field}>
          <label style={styles.label} htmlFor="nf-name">Nombre</label>
          <input
            id="nf-name"
            style={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            autoComplete="name"
            disabled={loading}
          />
        </div>
      )}

      <div style={styles.field}>
        <label style={styles.label} htmlFor="nf-email">Correo electrónico</label>
        <input
          id="nf-email"
          style={styles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          autoComplete="email"
          disabled={loading}
          required
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="nf-password">Contraseña</label>
        <input
          id="nf-password"
          style={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          disabled={loading}
          required
        />
      </div>

      {status === 'error' && <p style={styles.error}>{message}</p>}
      {status === 'notice' && <p style={styles.notice}>{message}</p>}

      <button type="submit" style={{ ...styles.submitBtn, ...(loading ? styles.submitBtnDisabled : {}) }} disabled={loading}>
        {mode === 'register' ? 'Crear mi espacio gratis' : 'Iniciar sesión'}
      </button>

      <p style={styles.legal}>
        Al continuar aceptas los{' '}
        <Link href="/terminos-y-condiciones" style={styles.legalLink}>Términos de uso</Link> y la{' '}
        <Link href="/politica-de-privacidad" style={styles.legalLink}>Política de privacidad</Link>.
      </p>

      <div style={styles.switchRow}>
        {mode === 'register' ? (
          <>
            ¿Ya tienes una cuenta?{' '}
            <button type="button" style={styles.switchLink} onClick={() => switchMode('login')}>
              Inicia sesión
            </button>
          </>
        ) : (
          <>
            ¿No tienes una cuenta?{' '}
            <button type="button" style={styles.switchLink} onClick={() => switchMode('register')}>
              Crea tu espacio gratis
            </button>
          </>
        )}
      </div>

      {onBack && (
        <div style={styles.switchRow}>
          <button type="button" style={styles.forgotBtn} onClick={onBack}>
            Volver
          </button>
        </div>
      )}
    </form>
  );
}
