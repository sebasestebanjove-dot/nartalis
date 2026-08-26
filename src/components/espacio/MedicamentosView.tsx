'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Pill, ArrowLeft } from 'lucide-react';
import V2MedCard from './V2MedCard';
import V2Empty from './V2Empty';
import { V } from './V2Styles';

interface SavedMed {
  nregistro: string;
  nombre: string;
  is_favorite: boolean;
  created_at: string;
}

export default function MedicamentosView() {
  const [medicamentos, setMedicamentos] = useState<SavedMed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/espacio/medicamentos');
      if (!res.ok) {
        setError('No se pudieron cargar los medicamentos.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setMedicamentos(data.medicamentos ?? []);
    } catch {
      setError('No hay conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const handleToggleFavorite = useCallback(async (nregistro: string) => {
    const target = medicamentos.find((m) => m.nregistro === nregistro);
    const next = !(target?.is_favorite ?? false);
    setMedicamentos((prev) => prev.map((m) => (m.nregistro === nregistro ? { ...m, is_favorite: next } : m)));
    try {
      const res = await fetch(`/api/espacio/medicamentos/${encodeURIComponent(nregistro)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: next }),
      });
      if (!res.ok) {
        setMedicamentos((prev) => prev.map((m) => (m.nregistro === nregistro ? { ...m, is_favorite: !next } : m)));
      }
    } catch {
      setMedicamentos((prev) => prev.map((m) => (m.nregistro === nregistro ? { ...m, is_favorite: !next } : m)));
    }
  }, [medicamentos]);

  return (
    <div style={V.page}>
      <div style={V.inner}>
        <div style={V.heroSection}>
          <Link href="/espacio" style={{ ...V.sectionLink, marginBottom: 16, display: 'inline-flex' }}>
            <ArrowLeft size={16} />
            Volver al espacio
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <Pill size={20} style={V.sectionIcon} />
            <h1 style={{ ...V.greeting, fontSize: 24 }}>Mis medicamentos</h1>
            {medicamentos.length > 0 && (
              <span style={V.sectionCount}>{medicamentos.length}</span>
            )}
          </div>
        </div>

        <div style={{ ...V.divider, marginTop: 20 }} />

        {error ? (
          <div style={V.error}>{error}</div>
        ) : loading ? (
          <div style={V.loading}>Cargando medicamentos...</div>
        ) : medicamentos.length === 0 ? (
          <V2Empty
            icon={<Pill size={22} />}
            title="Aún no has guardado medicamentos"
            description="Guarda tus medicamentos desde su ficha para tenerlos siempre a mano."
            ctaLabel="Buscar medicamentos"
            ctaHref="/"
          />
        ) : (
          <div style={V.medGrid} data-espacio-meds-full>
            {medicamentos.map((m) => (
              <V2MedCard
                key={m.nregistro}
                nregistro={m.nregistro}
                nombre={m.nombre}
                isFavorite={m.is_favorite}
                createdAt={m.created_at}
                showDate
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}

        <div style={V.footer}>
          Nartalis &copy; {new Date().getFullYear()}
        </div>
      </div>

      <style>{`
        @media (max-width: 599px) {
          [data-espacio-meds-full] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (min-width: 600px) and (max-width: 840px) {
          [data-espacio-meds-full] {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (min-width: 841px) and (max-width: 1099px) {
          [data-espacio-meds-full] {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (min-width: 1100px) {
          [data-espacio-meds-full] {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
