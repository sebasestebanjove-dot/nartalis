'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronRight, Loader2, Pill } from 'lucide-react';
import { makeSlug } from '@/lib/slug';
import { track } from '@/lib/analytics';
import { V } from './V2Styles';

interface SearchResult {
  registro: string;
  nombre: string;
  laboratorio?: string;
}

export default function V2Search() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/farma/search?q=${encodeURIComponent(q)}&type=text&source=espacio`);
      const data = await r.json();
      setResults((data.resultados || []).slice(0, 8));
      setOpen(true);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  const handleChange = (v: string) => {
    setQuery(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(v), 300);
  };

  const handleSelect = async (item: SearchResult) => {
    track('space_search_select', { nregistro: item.registro, nombre: item.nombre });
    try { await fetch('/api/espacio/historial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nregistro: item.registro, nombre: item.nombre }) }); } catch {}
    setOpen(false);
    setQuery('');
    router.push(`/prospectos/${makeSlug(item.nombre, item.registro)}`);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setFocused(false); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showDropdown = open && results.length > 0;
  const showEmpty = open && query.length >= 2 && results.length === 0 && !loading;

  return (
    <div ref={wrapRef} style={V.searchSection}>
      <label style={{ ...V.searchLabel, position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }} htmlFor="espacio-search-input">Buscar medicamento</label>
      <div style={V.searchWrap}>
        <Search
          size={20}
          style={V.searchIcon}
        />
        <input
          id="espacio-search-input"
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { setFocused(true); if (results.length > 0) setOpen(true); }}
          onBlur={() => setFocused(false)}
          placeholder="Escribe el nombre de un medicamento..."
          style={{
            ...V.searchInput,
            borderColor: focused ? V.c.borderFocus : query ? V.c.border : V.c.border,
            boxShadow: focused ? `0 0 0 3px ${V.c.primaryLight}` : 'none',
          }}
          aria-label="Buscar medicamento"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus(); }}
            style={V.searchClear}
            aria-label="Limpiar búsqueda"
          >
            <X size={16} />
          </button>
        )}
        {loading && (
          <div style={V.searchLoader}>
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}
        {showDropdown && (
          <div style={V.dropdown} role="listbox">
            {results.map((item) => (
              <div
                key={item.registro}
                style={V.dropItem}
                role="option"
                aria-selected={false}
                onClick={() => handleSelect(item)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSelect(item); }}
                tabIndex={0}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = V.c.borderLight; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={V.dropItemIcon}>
                  <Pill size={16} />
                </div>
                <div style={V.dropItemText}>
                  <div style={V.dropItemName}>{item.nombre}</div>
                  {item.laboratorio && <div style={V.dropItemLab}>{item.laboratorio}</div>}
                </div>
                <ChevronRight size={16} style={V.dropArrow} />
              </div>
            ))}
          </div>
        )}
        {showEmpty && (
          <div style={{ ...V.dropdown, ...V.dropEmpty }}>
            No se encontraron resultados para &ldquo;{query}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}
