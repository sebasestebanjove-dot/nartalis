'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Loader2, AlertTriangle } from 'lucide-react';
import type { Medicamento } from './types';
import { buscarMedicamento } from './api';
import { makeSlug } from '@/lib/slug';
import { track } from '@/lib/analytics';

// Buscador contextual reutilizable: MISMA API, misma lógica y mismas estadísticas
// globales que el buscador del Home (/api/farma/search). Solo cambia el origen
// declarado ('home' | 'medicine_page') para trazabilidad interna.
//
// - Sin autocompletado nuevo: paridad con el comportamiento actual del Home.
// - Un submit válido = un registro en farma_search_log (el contador global es el mismo).
// - El resultado navega a la URL SEO existente /prospectos/<slug>--<nregistro>.
interface Props {
  source?: 'home' | 'medicine_page';
  heading?: string;
  /** Origen explícito para trazabilidad cuando el pathname real no representa la ficha
   *  (SPA interna del Home). Si se omite se usa usePathname(), como en /prospectos/[slug]. */
  sourcePage?: string;
}

export default function ContextualMedSearch({ source = 'medicine_page', heading = '¿Buscas información sobre otro medicamento?', sourcePage }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<Medicamento[]>([]);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [error, setError] = useState(false);
  const [searched, setSearched] = useState(false);

  const startedRef = useRef(false);
  const viewedRef = useRef(false);

  // El buscador contextual se ha mostrado (una sola vez por montaje).
  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    track('medicine_search_view', { surface: source });
  }, [source]);

  const markStarted = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    track('medicine_search_start', { surface: source });
  };

  const handleSearch = async () => {
    const q = query.trim();
    if (q.length < 2 || loading) return;

    setLoading(true);
    setError(false);
    setMessage(undefined);
    setSearched(true);
    track('medicine_search_submit', { surface: source });

    try {
      const data = await buscarMedicamento(q, 'text', { source, sourcePage: sourcePage ?? pathname ?? undefined });
      setResultados(data.resultados || []);
      setMessage(data.message);
      track('medicine_search_submit_done', {
        surface: source,
        result_count: (data.resultados || []).length,
        was_successful: (data.resultados || []).length > 0,
      });
    } catch {
      setResultados([]);
      setMessage(undefined);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (m: Medicamento, position: number) => {
    if (!m.registro) return;
    track('medicine_search_result_click', { surface: source, position });
    // Entrada en una ficha desde la búsqueda de otra ficha (hipótesis de producto).
    if (source === 'medicine_page') {
      track('seo_to_second_medicine', { position });
    }
    router.push(`/prospectos/${makeSlug(m.nombre, m.registro)}`);
  };

  return (
    <section className="ctx-med-search" style={CS.section} aria-label="Buscar otro medicamento">
      <h2 style={CS.title}>{heading}</h2>
      <div style={CS.card}>
        <p style={CS.sub}>
          Consulta otro medicamento, principio activo o nombre comercial sin salir de Nartalis.
        </p>

        <form style={CS.form} onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
          <label htmlFor="ctx-med-search" className="ctx-visually-hidden">Buscar medicamento, principio activo o nombre comercial</label>
          <div style={CS.inputBox}>
            <svg style={CS.icon} viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="ctx-med-search"
              style={CS.input}
              type="text"
              placeholder="Buscar medicamento..."
              value={query}
              onChange={(e) => { markStarted(); setQuery(e.target.value); }}
              onFocus={markStarted}
              autoComplete="off"
              enterKeyHint="search"
              maxLength={80}
            />
          </div>
          <button
            type="submit"
            style={{
              ...CS.btn,
              opacity: query.trim().length < 2 && !loading ? 0.55 : 1,
            }}
            disabled={loading || query.trim().length < 2}
            aria-label="Buscar"
          >
            {loading ? <Loader2 size={20} className="ctx-spin" /> : <Search size={20} />}
            <span>{loading ? 'Buscando…' : 'Buscar'}</span>
          </button>
        </form>

        {/* Región de resultados: anuncios amables para lectores de pantalla */}
        <div aria-live="polite" aria-busy={loading}>
          {loading && (
            <div style={CS.status} role="status">
              <Loader2 size={16} className="ctx-spin" /> Buscando medicamentos…
            </div>
          )}

          {!loading && error && (
            <div style={CS.errorBox} role="alert">
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>No hemos podido realizar la búsqueda. Inténtalo de nuevo.</span>
            </div>
          )}

          {!loading && !error && searched && resultados.length === 0 && (
            <p style={CS.empty} role="status">
              {message || 'No hemos encontrado medicamentos que coincidan con tu búsqueda.'}
            </p>
          )}

          {!loading && !error && resultados.length > 0 && (
            <ul style={CS.list} role="list">
              {resultados.map((r, i) => (
                <li key={r.registro || i}>
                  <button
                    type="button"
                    onClick={() => handleSelect(r, i + 1)}
                    style={CS.row}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={CS.rowName}>{r.nombre}</span>
                    <span style={CS.rowMeta}>
                      {[r.dosis, r.laboratorio].filter(Boolean).join(' · ') || '\u00A0'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <style>{`
        .ctx-med-search input::placeholder {
          color: #6B7280;
          opacity: 1;
        }
        .ctx-spin { animation: ctxSpin 1s linear infinite; }
        @keyframes ctxSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ctx-med-search input:focus-visible,
        .ctx-med-search button:focus-visible {
          outline: 2px solid #A78BFA;
          outline-offset: 2px;
        }
        .ctx-visually-hidden {
          position: absolute; width: 1px; height: 1px;
          margin: -1px; padding: 0; overflow: hidden;
          clip: rect(0 0 0 0); white-space: nowrap; border: 0;
        }
        @media (max-width: 480px) {
          .ctx-med-search form { flex-direction: column !important; }
          .ctx-med-search form > button { width: 100% !important; }
        }
      `}</style>
    </section>
  );
}

/* Tokens visuales coherentes con las secciones de la ficha: fondo blanco integrado
   en la ficha, texto oscuro de alto contraste y acentos #A78BFA. */
const CS: Record<string, React.CSSProperties> = {
  section: {
    marginBottom: '0.75rem',
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    color: '#18181B',
    margin: '0 0 0.4rem',
  },
  card: {
    background: 'white',
    borderRadius: 12,
    padding: '0.85rem 1rem',
  },
  sub: {
    fontSize: 13,
    color: '#3F3F46',
    lineHeight: 1.5,
    margin: '0 0 0.7rem',
  },
  form: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'stretch',
    flexDirection: 'row',
  },
  inputBox: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    background: 'white',
    border: '1px solid #D4D4D8',
    borderRadius: 10,
    padding: '0 0.7rem',
  },
  icon: {
    width: 18,
    height: 18,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    fontSize: 16,
    border: 'none',
    background: 'transparent',
    color: '#18181B',
    outline: 'none',
    fontFamily: 'inherit',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    minHeight: 48,
    minWidth: 96,
    padding: '0 1rem',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #0D7FAE, #0B9BC7)',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    flexShrink: 0,
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: 13,
    color: '#52525B',
    margin: '0.7rem 0 0',
  },
  errorBox: {
    display: 'flex',
    gap: '0.45rem',
    alignItems: 'flex-start',
    marginTop: '0.7rem',
    padding: '0.6rem 0.75rem',
    borderRadius: 10,
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    fontSize: 13,
    color: '#B91C1C',
    lineHeight: 1.45,
  },
  empty: {
    fontSize: 13,
    color: '#52525B',
    lineHeight: 1.5,
    margin: '0.7rem 0 0',
  },
  list: {
    listStyle: 'none',
    margin: '0.6rem 0 0',
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '0.1rem',
    width: '100%',
    minHeight: 52,
    padding: '0.5rem 0.65rem',
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
    transition: 'background 0.12s',
  },
  rowName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#18181B',
    lineHeight: 1.35,
    wordBreak: 'break-word',
  },
  rowMeta: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 1.35,
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
