"use client";

import { useState } from 'react';
import { Search, MapPin, Phone, ExternalLink } from 'lucide-react';
import type { DermoStock } from '../types';
import { getDermoAvailability } from '../api';
import { colorVars } from '../styles';

interface AvailabilitySearchProps {
  productId: string;
}

export default function AvailabilitySearch({ productId }: AvailabilitySearchProps) {
  const [pc, setPc] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DermoStock[] | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getDermoAvailability(productId, pc || undefined);
      setResults(data);
      if (data.length === 0) setError('No hay farmacias con stock disponible' + (pc ? ` en ${pc}` : ''));
    } catch (err: any) {
      setError(err.message || 'Error al consultar disponibilidad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: colorVars.fg, marginBottom: '0.75rem' }}>
        Disponibilidad en farmacias
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input
          type="text"
          placeholder="Código postal (opcional)"
          value={pc}
          onChange={(e) => setPc(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          aria-label="Código postal"
          style={{
            flex: 1, maxWidth: 250, fontSize: 14, padding: '0.6rem 1rem',
            borderRadius: 12, border: `2px solid ${colorVars.border}`,
            background: colorVars.bg, color: colorVars.fg, outline: 'none',
            fontFamily: 'inherit', transition: 'border-color 0.15s',
          }}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          aria-label="Buscar disponibilidad"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            padding: '0.6rem 1.25rem', borderRadius: 12, border: 'none',
            background: loading ? colorVars.surfaceHover : `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
            color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1, fontFamily: 'inherit',
            transition: 'opacity 0.15s',
          }}
        >
          {loading ? '...' : <><Search size={15} /> Buscar</>}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.15)',
          borderRadius: 10, fontSize: 14, color: colorVars.danger, marginBottom: '0.75rem',
        }}>
          {error}
        </div>
      )}

      {results && results.length > 0 && (
        <div>
          {results.map((stock) => {
            const ph = stock.pharmacy;
            const address = [ph?.address, ph?.postal_code, ph?.city].filter(Boolean).join(', ');
            const mapsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
            return (
              <div key={stock.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.85rem 1rem', background: colorVars.surface,
                borderRadius: 12, border: `1px solid ${colorVars.border}`,
                marginBottom: '0.5rem', flexWrap: 'wrap',
              }}>
                <MapPin size={18} color={colorVars.fgMuted} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: colorVars.fg }}>
                    {ph?.name || 'Farmacia'}
                  </div>
                  <div style={{ fontSize: 12, color: colorVars.fgMuted }}>
                    {address}
                  </div>
                </div>
                <div style={{
                  padding: '0.25rem 0.6rem', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: stock.available ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                  color: stock.available ? colorVars.success : colorVars.danger,
                  whiteSpace: 'nowrap',
                }}>
                  {stock.available ? 'En stock' : 'Agotado'}
                </div>
                {stock.price && (
                  <div style={{ fontSize: 15, fontWeight: 700, color: colorVars.success, whiteSpace: 'nowrap' }}>
                    {Number(stock.price).toFixed(2)} €
                  </div>
                )}
                {ph?.phone && (
                  <a href={`tel:${ph.phone}`} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(16,185,129,0.15)', color: colorVars.success,
                    cursor: 'pointer', textDecoration: 'none', flexShrink: 0,
                  }}>
                    <Phone size={16} />
                  </a>
                )}
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 10,
                    background: colorVars.premiumGlow, color: colorVars.premiumLight,
                    cursor: 'pointer', textDecoration: 'none', flexShrink: 0,
                  }}>
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
