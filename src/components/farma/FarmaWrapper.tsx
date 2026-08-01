'use client';

import { useState, useCallback, useEffect } from 'react';
import { TrendingUp, Lightbulb, Trophy } from 'lucide-react';
import type { Medicamento, FarmaView } from './types';
import { buscarMedicamento, getMedicamentoDetail } from './api';
import SearchScreen from './screens/SearchScreen';
import ResultsScreen from './screens/ResultsScreen';
import DetailScreen from './screens/DetailScreen';
import AuthModal from '@/components/auth/AuthModal';
import type { PublicSessionUser } from '@/lib/auth';
import { track } from '@/lib/analytics';

interface FarmaWrapperProps {
  initialSessionUser?: PublicSessionUser | null;
}

// Guardado pendiente tras autenticación (anónimo → guardar). Sin PII.
const PENDING_SAVE_KEY = 'nartalis_pending_save';

const TIPS = [
  'CIMA contiene información de más de 17.000 medicamentos autorizados en España',
  'La AEMPS actualiza su base de datos cada 24 horas',
  'Cada medicamento tiene un código nacional (CN) único de 6 dígitos',
  'El código ATC clasifica medicamentos en 5 niveles según su órgano diana',
  'Más de 400 laboratorios farmacéuticos tienen medicamentos en España',
  'Los medicamentos huérfanos tratan enfermedades raras (<5/10.000 personas)',
  'El triángulo negro 🔻 indica seguimiento adicional de farmacovigilancia',
  'La AEMPS recibe más de 40.000 notificaciones de reacciones adversas al año',
];

export default function FarmaWrapper({ initialSessionUser = null }: FarmaWrapperProps = {}) {
  const [view, setView] = useState<FarmaView>('search');
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<Medicamento[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState<Medicamento | null>(null);
  const [suggestedCorrection, setSuggestedCorrection] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState<string | undefined>(undefined);

  // ─── Auth modal state ────────────────────────────
  const [showAuth, setShowAuth] = useState(false);

  // ─── Sesión (se refresca tras login modal sin recargar) ──
  const [sessionUser, setSessionUser] = useState<PublicSessionUser | null>(initialSessionUser || null);
  // nregistro → guardado/favorito para el usuario actual
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [favoriteMap, setFavoriteMap] = useState<Map<string, boolean>>(new Map());

  // Carga el estado de guardados/favoritos cuando hay sesión.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sessionUser) {
        setSavedSet(new Set());
        setFavoriteMap(new Map());
        return;
      }
      try {
        const res = await fetch('/api/espacio/medicamentos');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const saved = new Set<string>();
        const favs = new Map<string, boolean>();
        for (const m of data.medicamentos || []) {
          saved.add(m.nregistro);
          if (m.is_favorite) favs.set(m.nregistro, true);
        }
        setSavedSet(saved);
        setFavoriteMap(favs);
      } catch { /* silencioso */ }
    })();
    return () => { cancelled = true; };
  }, [sessionUser]);

  // ─── Sidebar state ──────────────────────────────
  const [mounted, setMounted] = useState(false);
  const [searchCount, setSearchCount] = useState(0);
  const [dailyCount, setDailyCount] = useState(0);
  const [topSearches, setTopSearches] = useState<{ q: string; count: number }[]>([]);
  const [currentTip, setCurrentTip] = useState(0);

  // Fetch global stats from API
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/farma/stats');
      if (res.ok) {
        const data = await res.json();
        setSearchCount(data.totalSearches ?? 0);
        setTopSearches(data.topQueries ?? []);
        setDailyCount(data.dailyCount ?? 0);
      }
    } catch { /* ignore */ }
  }, []);

  // Load on mount
  useEffect(() => {
    const ti = localStorage.getItem('farma_tip_index');
    if (ti) setCurrentTip(parseInt(ti, 10));
    fetchStats();
    setMounted(true);
  }, [fetchStats]);

  // Rotate tips every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip(prev => {
        const next = (prev + 1) % TIPS.length;
        try { localStorage.setItem('farma_tip_index', String(next)); } catch { /* ignore */ }
        return next;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // ─── Search handler ──────────────────────────────
  const handleSearch = useCallback(async (q: string, type?: 'text' | 'voice') => {
    setQuery(q);
    setLoading(true);
    setView('results');
    setSuggestedCorrection(undefined);
    setMessage(undefined);
    try {
      const data = await buscarMedicamento(q, type || 'text');
      setResultados(data.resultados);
      setTotal(data.total);
      setMessage(data.message);
      if (data.suggestedCorrection) {
        setSuggestedCorrection(data.suggestedCorrection);
      }
      // Analítica FASE 6/6A: evento de búsqueda completada (sin PII; la query no se envía).
      track('search_completed', {
        search_type: type || 'text',
        result_count: (data.resultados || []).length,
        was_successful: (data.resultados || []).length > 0,
      });
    } catch {
      setResultados([]);
      setTotal(0);
    } finally {
      setLoading(false);
      // Esperar a que la DB registre la búsqueda antes de refrescar stats
      setTimeout(fetchStats, 2000);
    }
  }, [fetchStats]);

  const handleSelect = useCallback(async (m: Medicamento) => {
    setDetailLoading(true);
    setView('detail');
    setSelected(m);

    // Historial personal: solo usuarios autenticados, fire-and-forget.
    if (sessionUser && m.registro) {
      fetch('/api/espacio/historial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nregistro: m.registro, nombre: m.nombre }),
      }).catch(() => { /* nunca rompe la navegación */ });
    }

    if (m.registro) {
      try {
        const detail = await getMedicamentoDetail(m.registro);
        setSelected(detail);
      } catch {
        // keep search-result data
      }
    }
    setDetailLoading(false);
  }, [sessionUser]);

  const handleSave = useCallback(async (m: Medicamento) => {
    if (!m.registro) return;

    // Usuario anónimo: guarda pending_save y pide autenticación.
    if (!sessionUser) {
      track('save_click_anon');
      track('save_auth_required');
      try {
        sessionStorage.setItem(PENDING_SAVE_KEY, JSON.stringify({ nregistro: m.registro, nombre: m.nombre }));
      } catch { /* sin almacenamiento: se ignora el guardado pendiente */ }
      setShowAuth(true);
      return;
    }

    track('save_click_auth');
    try {
      const res = await fetch('/api/espacio/medicamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nregistro: m.registro, nombre: m.nombre }),
      });
      if (res.ok) {
        track('save_success');
        setSavedSet(prev => {
          const next = new Set(prev);
          next.add(m.registro!);
          return next;
        });
      }
    } catch { /* silencioso */ }
  }, [sessionUser]);

  const handleToggleFavorite = useCallback(async (m: Medicamento) => {
    if (!m.registro) return;
    // La estrella solo actúa sobre medicamentos guardados (el detail lo garantiza).
    const next = !(favoriteMap.get(m.registro) ?? false);
    setFavoriteMap(prev => {
      const map = new Map(prev);
      if (next) map.set(m.registro!, true);
      else map.delete(m.registro!);
      return map;
    });
    track(next ? 'space_med_favorite' : 'space_med_unfavorite');
    try {
      await fetch(`/api/espacio/medicamentos/${encodeURIComponent(m.registro)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: next }),
      });
    } catch { /* silencioso */ }
  }, [favoriteMap]);

  const handleAuthSuccess = useCallback(async (mode: 'login' | 'register') => {
    // Si hay un medicamento pendiente de guardar, se completa sin salir del detalle.
    let pending: { nregistro?: string; nombre?: string } | null = null;
    try {
      const raw = sessionStorage.getItem(PENDING_SAVE_KEY);
      if (raw) pending = JSON.parse(raw) as { nregistro?: string; nombre?: string };
    } catch { /* sin almacenamiento */ }

    if (pending && pending.nregistro) {
      try {
        const res = await fetch('/api/espacio/medicamentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nregistro: pending.nregistro, nombre: pending.nombre || '' }),
        });
        if (res.ok) {
          track('save_success');
          setSavedSet(prev => {
            const next = new Set(prev);
            next.add(pending!.nregistro!);
            return next;
          });
        }
      } catch { /* silencioso */ }
      try { sessionStorage.removeItem(PENDING_SAVE_KEY); } catch { /* sin almacenamiento */ }
      // Refresca la sesión para actualizar el saludo y el acceso a "Mi espacio".
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) setSessionUser(data.user as PublicSessionUser);
        }
      } catch { /* silencioso */ }
      setShowAuth(false);
      return;
    }

    // Sin pendiente: comportamiento original (ir a /espacio).
    window.location.href = mode === 'register' ? '/espacio?welcome=1' : '/espacio';
  }, []);

  const handleBackToSearch = useCallback(() => {
    setQuery('');
    setView('search');
    setSelected(null);
    fetchStats();
  }, [fetchStats]);

  const handleBackToResults = useCallback(() => {
    setView('results');
    setSelected(null);
  }, []);

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {view === 'results' ? (
        <ResultsScreen
          resultados={resultados}
          total={total}
          query={query}
          loading={loading}
          onSelect={handleSelect}
          onBack={handleBackToSearch}
          suggestedCorrection={suggestedCorrection}
          message={message}
        />
      ) : view === 'detail' && selected ? (
        <DetailScreen
          medicamento={selected}
          onBack={handleBackToResults}
          loading={detailLoading}
          sessionUser={sessionUser}
          isSaved={savedSet.has(selected.registro)}
          isFavorite={favoriteMap.get(selected.registro) ?? false}
          onSave={handleSave}
          onToggleFavorite={handleToggleFavorite}
        />
      ) : (
        <div className="farma-search-layout">
          <div className="farma-search-main">
            <SearchScreen
              onSearch={handleSearch}
              initialQuery={query}
              sessionUser={sessionUser}
              onPersonalSpaceCta={() => setShowAuth(true)}
            />
          </div>
          {mounted && (
            <div className="farma-search-sidebar">
              {/* Bloque 1: Top búsquedas + resumen diario/total */}
              <div className="farma-side-block">
                {topSearches.length > 0 && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: 13, fontWeight: 600, color: '#E4E4E7', marginBottom: '0.4rem' }}>
                      <Trophy size={15} strokeWidth={2} style={{ color: '#F59E0B' }} />
                      Top 5 más buscados
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.6rem' }}>
                      {topSearches.map((s, i) => (
                        <button
                          key={s.q}
                          onClick={() => handleSearch(s.q)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            width: '100%', minHeight: 44,
                            padding: '0.35rem 0.5rem', borderRadius: 8, border: 'none',
                            background: i === 0 ? 'rgba(245,158,11,0.08)' : 'transparent',
                            color: '#D4D4D8', fontSize: 13, cursor: 'pointer',
                            fontFamily: 'inherit', textAlign: 'left', transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = i === 0 ? 'rgba(245,158,11,0.08)' : 'transparent' }}
                        >
                          <span style={{
                            fontSize: 12, fontWeight: 700,
                            color: i < 3 ? '#F59E0B' : '#52525B',
                            minWidth: 16, textAlign: 'right',
                          }}>{i + 1}</span>
                          <span style={{
                            flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>{s.q}</span>
                          <span style={{
                            fontSize: 12, fontWeight: 700, color: '#A1A1AA',
                            background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.4rem', borderRadius: 4,
                          }}>{s.count}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0.5rem 0' }} />

                {/* Resumen: búsquedas hoy y total */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: 12, color: '#71717A' }}>
                  <TrendingUp size={14} strokeWidth={2} style={{ color: '#22C55E' }} />
                  <span>Hoy: <strong style={{ color: '#A1A1AA' }}>{dailyCount}</strong></span>
                  <span style={{ color: '#3F3F46' }}>·</span>
                  <span>Total: <strong style={{ color: '#A1A1AA' }}>{searchCount.toLocaleString('es-ES')}</strong></span>
                </div>
              </div>

              {/* Bloque 2: Sabías que... */}
              <div className="farma-side-block">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: 13, fontWeight: 600, color: '#FBBF24', marginBottom: '0.4rem' }}>
                  <Lightbulb size={15} strokeWidth={2} />
                  Sabías que...
                </div>
                <div style={{
                  fontSize: 13, color: '#A1A1AA', lineHeight: 1.5,
                  wordBreak: 'break-word', overflowWrap: 'break-word', hyphens: 'auto',
                }}>
                  <span key={currentTip} className="farma-tip-text">{TIPS[currentTip]}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <AuthModal
        initialMode="register"
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={handleAuthSuccess}
      />

      <style>{`
        @keyframes dermoFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes dermoSlideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        /* ─── Search layout grid ──────────────────────── */
        .farma-search-layout {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          justify-content: center;
          gap: 1.5rem;
          max-width: 1100px;
          margin: 0 auto;
          padding: 1rem;
        }
        .farma-search-main {
          flex: 1 1 0;
          min-width: 0;
          max-width: 672px;
        }
        .farma-search-sidebar {
          flex: 0 0 220px;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          position: sticky;
          top: 1rem;
        }
        .farma-side-block {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.85rem;
          border-radius: 14px;
          background: rgba(24,24,27,0.88);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.07);
        }
        .farma-tip-text {
          animation: farmaFadeIn 0.4s ease-out;
        }
        @keyframes farmaFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .farma-search-layout {
            flex-direction: column;
            align-items: stretch;
            max-width: 100%;
          }
          .farma-search-main {
            max-width: 100%;
          }
          .farma-search-sidebar {
            width: 100%;
            position: static;
          }
        }
      `}</style>
    </div>
  );
}
