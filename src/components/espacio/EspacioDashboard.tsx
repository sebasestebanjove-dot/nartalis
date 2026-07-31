'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { HeartPulse, Search, History, Star } from 'lucide-react';
import MedCard from './MedCard';
import LogoutButton from '@/components/auth/LogoutButton';
import { track } from '@/lib/analytics';
import { makeSlug } from '@/lib/slug';

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

interface EspacioDashboardProps {
  name: string;
  welcome?: boolean;
}

const S = {
  wrap: {
    minHeight: '100vh',
    background: '#1C1C1E',
    color: '#FFFFFF',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '2.5rem 1rem 1.5rem',
    textAlign: 'center' as const,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 800,
    margin: '0 0 0.25rem',
    letterSpacing: '-0.02em',
  },
  sub: {
    fontSize: 16,
    color: '#A1A1AA',
    margin: '0 0 1rem',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.3rem 0.8rem',
    borderRadius: 999,
    background: 'rgba(76,175,80,0.15)',
    border: '1px solid rgba(76,175,80,0.35)',
    color: '#66BB6A',
    fontSize: 13,
    fontWeight: 700,
  },
  logout: {
    marginTop: '0.75rem',
  },
  welcome: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '2rem 1rem 0',
    textAlign: 'center' as const,
  },
  welcomeIcon: {
    width: 56,
    height: 56,
    margin: '0 auto 1rem',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeCheck: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 800,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: '#E4E4E7',
    margin: '0 0 0.5rem',
    letterSpacing: '-0.01em',
  },
  welcomeText: {
    fontSize: 15,
    color: '#A1A1AA',
    margin: '0 0 0.75rem',
    lineHeight: 1.5,
  },
  welcomeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    padding: '0.6rem 1.4rem',
    marginBottom: '1.5rem',
    borderRadius: 10,
    background: 'linear-gradient(135deg, #6748FD, #947FFF)',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 600,
    textDecoration: 'none',
  },
  body: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '0 1rem 2.5rem',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#E4E4E7',
    margin: 0,
  },
  sectionIcon: {
    color: '#6748FD',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '0.6rem',
  },
  empty: {
    padding: '1.5rem',
    borderRadius: 14,
    background: '#2C2C2E',
    border: '1px dashed rgba(255,255,255,0.12)',
    textAlign: 'center' as const,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#D4D4D8',
    margin: '0 0 0.25rem',
  },
  emptyText: {
    fontSize: 14,
    color: '#A1A1AA',
    margin: '0 0 0.75rem',
    lineHeight: 1.5,
  },
  cta: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    minHeight: 44,
    padding: '0.6rem 1.2rem',
    borderRadius: 10,
    background: 'linear-gradient(135deg, #6748FD, #947FFF)',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 700,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  histItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    padding: '0.85rem 1rem',
    background: '#2C2C2E',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.06)',
    minHeight: 64,
    textDecoration: 'none',
    marginBottom: '0.5rem',
  },
  histName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#FFFFFF',
    lineHeight: 1.3,
  },
  histDate: {
    fontSize: 12,
    color: '#A1A1AA',
    marginTop: '0.15rem',
  },
  error: {
    padding: '1.5rem',
    borderRadius: 14,
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#F87171',
    fontSize: 14,
    textAlign: 'center' as const,
  },
};

function formatFecha(ts: string): string {
  const d = new Date(ts);
  const now = Date.now();
  const diffMin = Math.floor((now - d.getTime()) / 60000);
  if (diffMin < 1) return 'ahora mismo';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `hace ${diffD} d`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function EspacioDashboard({ name, welcome = false }: EspacioDashboardProps) {
  const [medicamentos, setMedicamentos] = useState<SavedMed[]>([]);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [medRes, histRes] = await Promise.all([
        fetch('/api/espacio/medicamentos'),
        fetch('/api/espacio/historial?limit=10'),
      ]);
      if (!medRes.ok || !histRes.ok) {
        setError('No se pudo cargar tu espacio. Inténtalo de nuevo.');
        setLoading(false);
        return;
      }
      const medData = await medRes.json();
      const histData = await histRes.json();
      setMedicamentos(medData.medicamentos ?? []);
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
    // optimista
    setMedicamentos((prev) => prev.map((m) => (m.nregistro === nregistro ? { ...m, is_favorite: next } : m)));
    track(next ? 'space_med_favorite' : 'space_med_unfavorite');
    try {
      const res = await fetch(`/api/espacio/medicamentos/${encodeURIComponent(nregistro)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: next }),
      });
      if (!res.ok) {
        // rollback
        setMedicamentos((prev) => prev.map((m) => (m.nregistro === nregistro ? { ...m, is_favorite: !next } : m)));
      }
    } catch {
      setMedicamentos((prev) => prev.map((m) => (m.nregistro === nregistro ? { ...m, is_favorite: !next } : m)));
    }
  }, [medicamentos]);

  const handleRemove = useCallback(async (nregistro: string) => {
    track('space_med_remove');
    setMedicamentos((prev) => prev.filter((m) => m.nregistro !== nregistro));
    try {
      await fetch(`/api/espacio/medicamentos/${encodeURIComponent(nregistro)}`, { method: 'DELETE' });
    } catch {
      // silencioso: la lista local ya refleja el estado deseado
    }
  }, []);

  const handleOpenMed = useCallback(() => {
    track('space_med_open');
  }, []);

  const favoritos = medicamentos.filter((m) => m.is_favorite);
  const displayName = name.trim().split(/\s+/)[0] || name;

  return (
    <div style={S.wrap}>
      {welcome && (
        <div style={S.welcome}>
          <div style={S.welcomeIcon}>
            <span style={S.welcomeCheck}>✓</span>
          </div>
          <h2 style={S.welcomeTitle}>Tu espacio personal está listo</h2>
          <p style={S.welcomeText}>Hemos creado tu cuenta Nartalis.</p>
          <span style={S.badge}>Plan Free</span>
          <p style={S.welcomeText}>Tu espacio personal se está preparando.</p>
          <Link href="/" style={S.welcomeBtn}>
            Volver al inicio
          </Link>
        </div>
      )}
      <div style={S.header}>
        <h1 style={S.greeting}>{`Hola, ${displayName}`}</h1>
        <p style={S.sub}>Este es tu espacio personal Nartalis.</p>
        <span style={S.badge}>Plan Free</span>
        <div style={S.logout}>
          <LogoutButton />
        </div>
      </div>

      <div style={S.body}>
        {error ? (
          <div style={S.error}>{error}</div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#A1A1AA' }}>Cargando tu espacio...</div>
        ) : (
          <>
            {/* Mis medicamentos */}
            <section style={S.section}>
              <div style={S.sectionHeader}>
                <HeartPulse size={18} style={S.sectionIcon} />
                <h2 style={S.sectionTitle}>Mis medicamentos</h2>
              </div>
              {medicamentos.length === 0 ? (
                <div style={S.empty}>
                  <p style={S.emptyTitle}>Aún no has guardado medicamentos</p>
                  <p style={S.emptyText}>Guarda tus medicamentos desde su ficha para tenerlos siempre a mano.</p>
                  <Link href="/" style={S.cta}>
                    <Search size={16} /> Buscar medicamentos
                  </Link>
                </div>
              ) : (
                <div style={S.grid}>
                  {medicamentos.map((m) => (
                    <MedCard
                      key={m.nregistro}
                      nregistro={m.nregistro}
                      nombre={m.nombre}
                      isFavorite={m.is_favorite}
                      createdAt={m.created_at}
                      showDate
                      onToggleFavorite={handleToggleFavorite}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Favoritos */}
            <section style={S.section}>
              <div style={S.sectionHeader}>
                <Star size={18} style={S.sectionIcon} />
                <h2 style={S.sectionTitle}>Favoritos</h2>
              </div>
              {favoritos.length === 0 ? (
                <div style={S.empty}>
                  <p style={S.emptyTitle}>Tus favoritos aparecerán aquí</p>
                  <p style={S.emptyText}>Pulsa la estrella en cualquier medicamento para guardarlo como favorito.</p>
                  <Link href="/" style={S.cta}>
                    <Search size={16} /> Explorar medicamentos
                  </Link>
                </div>
              ) : (
                <div style={S.grid}>
                  {favoritos.map((m) => (
                    <MedCard
                      key={m.nregistro}
                      nregistro={m.nregistro}
                      nombre={m.nombre}
                      isFavorite={m.is_favorite}
                      onToggleFavorite={handleToggleFavorite}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Últimas consultas */}
            <section style={S.section}>
              <div style={S.sectionHeader}>
                <History size={18} style={S.sectionIcon} />
                <h2 style={S.sectionTitle}>Últimas consultas</h2>
              </div>
              {consultas.length === 0 ? (
                <div style={S.empty}>
                  <p style={S.emptyTitle}>Todavía no has consultado medicamentos</p>
                  <p style={S.emptyText}>Los medicamentos que consultes aparecerán aquí.</p>
                  <Link href="/" style={S.cta}>
                    <Search size={16} /> Buscar medicamentos
                  </Link>
                </div>
              ) : (
                <div>
                  {consultas.map((c) => (
                    <a
                      key={`${c.nregistro}-${c.consulted_at}`}
                      href={`/prospectos/${makeSlug(c.nombre, c.nregistro)}`}
                      onClick={handleOpenMed}
                      style={S.histItem}
                    >
                      <div>
                        <div style={S.histName}>{c.nombre}</div>
                        <div style={S.histDate}>Consultado {formatFecha(c.consulted_at)}</div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
