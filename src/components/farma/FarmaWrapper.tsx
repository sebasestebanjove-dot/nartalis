'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, TrendingUp, Lightbulb, Trophy } from 'lucide-react';
import type { Medicamento, FarmaView } from './types';
import { buscarMedicamento, getMedicamentoDetail } from './api';
import SearchScreen from './screens/SearchScreen';
import ResultsScreen from './screens/ResultsScreen';
import DetailScreen from './screens/DetailScreen';

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

export default function FarmaWrapper() {
  const [view, setView] = useState<FarmaView>('search');
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<Medicamento[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState<Medicamento | null>(null);
  const [suggestedCorrection, setSuggestedCorrection] = useState<string | undefined>(undefined);

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

  // ─── Refresh stats after each search ────────────
  const trackSearch = useCallback(() => {
    // Small delay to let DB insert complete
    setTimeout(fetchStats, 500);
  }, [fetchStats]);

  // ─── Search handler ──────────────────────────────
  const handleSearch = useCallback(async (q: string, type?: 'text' | 'voice') => {
    trackSearch();
    setQuery(q);
    setLoading(true);
    setView('results');
    setSuggestedCorrection(undefined);
    try {
      const data = await buscarMedicamento(q, type || 'text');
      setResultados(data.resultados);
      setTotal(data.total);
      if (data.suggestedCorrection) {
        setSuggestedCorrection(data.suggestedCorrection);
      }
    } catch {
      setResultados([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [trackSearch]);

  const handleSelect = useCallback(async (m: Medicamento) => {
    setDetailLoading(true);
    setView('detail');
    setSelected(m);
    if (m.registro) {
      try {
        const detail = await getMedicamentoDetail(m.registro);
        setSelected(detail);
      } catch {
        // keep search-result data
      }
    }
    setDetailLoading(false);
  }, []);

  const handleBackToSearch = useCallback(() => {
    setView('search');
    setSelected(null);
  }, []);

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
        />
      ) : view === 'detail' && selected ? (
        <DetailScreen
          medicamento={selected}
          onBack={handleBackToResults}
          loading={detailLoading}

        />
      ) : (
        <div className="farma-search-layout">
          <div className="farma-search-main">
            <SearchScreen onSearch={handleSearch} initialQuery={query} />
          </div>
          {mounted && (
            <div className="farma-search-sidebar">
              {/* Contador global */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 0.7rem', borderRadius: 10,
                background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.2)',
              }}>
                <Search size={16} strokeWidth={2} style={{ color: '#3B82F6', flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#E4E4E7' }}>
                  {searchCount.toLocaleString('es-ES')}
                </span>
                <span style={{ fontSize: 12, color: '#A1A1AA', lineHeight: 1.2 }}>búsquedas</span>
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0.6rem 0' }} />

              {/* Top 5 más buscados — clickeables */}
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

              {/* Sabías que... */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minHeight: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: 13, fontWeight: 600, color: '#FBBF24' }}>
                  <Lightbulb size={15} strokeWidth={2} />
                  Sabías que...
                </div>
                <div style={{
                  fontSize: 13, color: '#A1A1AA', lineHeight: 1.5,
                  flex: 1, display: 'flex', alignItems: 'flex-start',
                  wordBreak: 'break-word', overflowWrap: 'break-word', hyphens: 'auto',
                }}>
                  <span key={currentTip} className="farma-tip-text">{TIPS[currentTip]}</span>
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0.5rem 0' }} />

              {/* Mini stats */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: 12, color: '#71717A' }}>
                <TrendingUp size={14} strokeWidth={2} style={{ color: '#22C55E' }} />
                <span>Hoy: <strong style={{ color: '#A1A1AA' }}>{dailyCount}</strong></span>
                <span style={{ color: '#3F3F46' }}>·</span>
                <span>Total: <strong style={{ color: '#A1A1AA' }}>{searchCount.toLocaleString('es-ES')}</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

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
          gap: 0.5rem;
          padding: 0.85rem;
          border-radius: 14px;
          background: rgba(24,24,27,0.88);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.07);
          max-height: 65vh;
          position: sticky;
          top: 1rem;
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
            max-height: none;
            position: static;
            border-radius: 14px;
          }
        }
      `}</style>
    </div>
  );
}
