'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { makeSlug } from '@/lib/slug';
import { track } from '@/lib/analytics';

const PENDING_KEY = 'nartalis_pending_save';

interface PendingSave {
  nregistro: string;
  nombre: string;
}

const B = {
  banner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.85rem 1rem',
    borderRadius: 12,
    background: 'rgba(76,175,80,0.12)',
    border: '1px solid rgba(76,175,80,0.35)',
    color: '#E4E4E7',
    fontSize: 14,
    marginBottom: '1rem',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
    backdropFilter: 'blur(6px)',
  },
  link: {
    color: '#66BB6A',
    fontWeight: 700,
    textDecoration: 'underline',
    marginLeft: 'auto',
    flexShrink: 0,
  },
};

// Tras el callback de Google (redirect completo a /espacio), completa el
// guardado pendiente guardado en sessionStorage antes del redirect.
export default function EspacioSaveResolver() {
  const [savedMed, setSavedMed] = useState<PendingSave | null>(null);
  const [failed, setFailed] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;

    let pending: PendingSave | null = null;
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PendingSave;
      if (!parsed || typeof parsed.nregistro !== 'string' || !parsed.nregistro) return;
      pending = parsed;
    } catch {
      return;
    }

    doneRef.current = true;
    const { nregistro, nombre } = pending;

    (async () => {
      try {
        // La API es idempotente: recargar no duplica el guardado.
        const res = await fetch('/api/espacio/medicamentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nregistro, nombre }),
        });
        if (!res.ok) {
          // sin sesión o medicamento inválido: se conserva el estado
          doneRef.current = false;
          setFailed(true);
          return;
        }
        track('save_success');
        setSavedMed(pending);
      } catch {
        doneRef.current = false;
        setFailed(true);
        return;
      } finally {
        try {
          sessionStorage.removeItem(PENDING_KEY);
        } catch {
          // sin almacenamiento
        }
      }
    })();
  }, []);

  if (!savedMed && !failed) return null;

  return (
    <div style={B.banner} role="status">
      <CheckCircle2 size={18} color="#66BB6A" style={{ flexShrink: 0 }} />
      {savedMed ? (
        <>
          <span>✓ Medicamento guardado en tu espacio</span>
          <Link
            href={`/prospectos/${makeSlug(savedMed.nombre, savedMed.nregistro)}`}
            style={B.link}
          >
            Ver el medicamento
          </Link>
        </>
      ) : (
        <span>No se pudo completar el guardado pendiente.</span>
      )}
    </div>
  );
}
