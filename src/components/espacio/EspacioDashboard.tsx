'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Pill, Check, Search, ChevronRight } from 'lucide-react';
import V2Header from './V2Header';
import V2Search from './V2Search';
import V2MedCard from './V2MedCard';
import V2Favorites from './V2Favorites';
import V2History from './V2History';
import V2Empty from './V2Empty';
import { track } from '@/lib/analytics';
import { V } from './V2Styles';
import type { NartalisRole, NartalisPlan } from '@/lib/auth';

interface SavedMed {
  nregistro: string;
  nombre: string;
  is_favorite: boolean;
  created_at: string;
}

interface Consulta {
  nregistro: string;
  nombre: string;
  consulted_at: string;
}

interface Props {
  name: string;
  welcome?: boolean;
  role: NartalisRole;
  plan: NartalisPlan;
}

export default function EspacioDashboard({ name, welcome = false, role, plan }: Props) {
  const [medicamentos, setMedicamentos] = useState<SavedMed[]>([]);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [totalMeds, setTotalMeds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [medRes, countRes, histRes] = await Promise.all([
        fetch('/api/espacio/medicamentos?limit=6'),
        fetch('/api/espacio/medicamentos?countOnly=1'),
        fetch('/api/espacio/historial?limit=7'),
      ]);
      if (!medRes.ok || !countRes.ok || !histRes.ok) {
        setError('No se pudo cargar tu espacio. Inténtalo de nuevo.');
        setLoading(false);
        return;
      }
      const medData = await medRes.json();
      const countData = await countRes.json();
      const histData = await histRes.json();
      setMedicamentos(medData.medicamentos ?? []);
      setTotalMeds(countData.total ?? 0);
      setConsultas(histData.consultas ?? []);
    } catch {
      setError('No hay conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    track('space_view');
    void Promise.resolve().then(load);
  }, [load]);

  const handleToggleFavorite = useCallback(async (nregistro: string) => {
    const target = medicamentos.find((m) => m.nregistro === nregistro);
    const next = !(target?.is_favorite ?? false);
    setMedicamentos((prev) => prev.map((m) => (m.nregistro === nregistro ? { ...m, is_favorite: next } : m)));
    track(next ? 'space_med_favorite' : 'space_med_unfavorite');
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

  const favoritos = medicamentos.filter((m) => m.is_favorite);

  return (
    <div style={V.page}>
      {welcome && (
        <div style={{ ...V.container, paddingTop: 20 }}>
          <div style={V.welcome}>
            <div style={V.welcomeIconWrap}>
              <Check size={22} color="#fff" />
            </div>
            <div style={V.welcomeTitle}>Tu espacio personal está listo</div>
            <div style={V.welcomeDesc}>
              Hemos creado tu cuenta Nartalis. Tu espacio está preparado para empezar.
            </div>
            <Link
              href="/"
              style={{ ...V.emptyCta, marginTop: 14 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = V.c.primaryMuted; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = V.c.primaryLight; }}
            >
              <Search size={14} />
              Empezar a buscar
            </Link>
          </div>
        </div>
      )}

      <div style={V.inner}>
        <div style={V.heroSection}>
          <V2Header name={name} role={role} plan={plan} />
          <V2Search />
        </div>

        <div style={V.divider} />

        {error ? (
          <div style={V.error}>{error}</div>
        ) : loading ? (
          <div style={V.loading}>Cargando tu espacio...</div>
        ) : (
          <>
            {/* Mis medicamentos — grid visual */}
            <div style={V.section}>
              <div style={V.sectionHead}>
                <div style={V.sectionHeadLeft}>
                  <Pill size={16} style={V.sectionIcon} />
                  <span style={V.sectionTitle}>Mis medicamentos</span>
                  {totalMeds > 0 && (
                    <span style={V.sectionCount}>{totalMeds}</span>
                  )}
                </div>
                {totalMeds > 4 && (
                  <Link href="/espacio/medicamentos" style={V.sectionLink}>
                    Ver todos
                    <ChevronRight size={14} />
                  </Link>
                )}
              </div>
              {medicamentos.length === 0 ? (
                <V2Empty
                  icon={<Pill size={22} />}
                  title="Aún no has guardado medicamentos"
                  description="Guarda tus medicamentos desde su ficha para tenerlos siempre a mano."
                  ctaLabel="Buscar medicamentos"
                  ctaHref="/"
                />
              ) : (
                <div style={V.medGrid} data-espacio-meds>
                  {medicamentos.map((m, i) => (
                    <V2MedCard
                      key={m.nregistro}
                      nregistro={m.nregistro}
                      nombre={m.nombre}
                      isFavorite={m.is_favorite}
                      createdAt={m.created_at}
                      showDate
                      onToggleFavorite={handleToggleFavorite}
                      className={i >= 4 ? 'hide-mobile' : undefined}
                    />
                  ))}
                </div>
              )}
            </div>

            <div style={V.divider} />

            {/* Favoritos + Historial — dos columnas en desktop */}
            <div style={V.section} data-espacio-bottom>
              <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, alignItems: 'start' }}>
                <V2Favorites items={favoritos} />
                <V2History items={consultas} />
              </div>
            </div>
          </>
        )}

        <div style={V.footer}>
          Nartalis &copy; {new Date().getFullYear()}
        </div>
      </div>

      <style>{`
        @media (max-width: 840px) {
          [data-espacio-meds] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          [data-espacio-bottom] > div {
            grid-template-columns: 1fr !important;
          }
          [data-espacio-meds] .hide-mobile {
            display: none !important;
          }
        }
        @media (min-width: 600px) and (max-width: 840px) {
          [data-espacio-meds] {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (min-width: 841px) {
          [data-espacio-meds] {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (min-width: 1100px) {
          [data-espacio-meds] {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
