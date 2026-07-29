"use client";

import { ArrowLeft } from 'lucide-react';
import type { DermoProduct, UserType } from '../types';
import ProductCard from '../components/ProductCard';
import { colorVars } from '../styles';

interface DermoResultsScreenProps {
  results: DermoProduct[];
  total: number;
  query: string;
  onBack: () => void;
  onSelect: (product: DermoProduct) => void;
  loading: boolean;
  userType: UserType;
}

export default function DermoResultsScreen({ results, total, query, onBack, onSelect, loading, userType }: DermoResultsScreenProps) {
  return (
    <div style={{
      minHeight: '100vh', background: colorVars.bg, color: colorVars.fg, padding: '0.75rem',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        marginBottom: '0.75rem', paddingBottom: '0.6rem',
        borderBottom: `1px solid ${colorVars.border}`,
      }}>
        <button
          onClick={onBack}
          aria-label="Volver"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, borderRadius: 10,
            border: `1px solid ${colorVars.border}`,
            background: colorVars.surface, color: colorVars.fg,
            cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: colorVars.fg, margin: 0, flex: 1 }}>
          {query ? `"${query}"` : 'Todos los productos'}
        </h2>
        <span style={{ fontSize: 13, color: colorVars.fgMuted }}>{total} resultados</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: colorVars.premiumLight, fontSize: 15 }}>
          Buscando productos...
        </div>
      ) : results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: colorVars.fgMuted, fontSize: 15 }}>
          No encontramos productos para "{query}"
          <div style={{ fontSize: 13, color: colorVars.fgDim, marginTop: '0.5rem' }}>
            Prueba con otro término o ajusta los filtros
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.6rem',
        }}>
          {results.map((product) => (
            <ProductCard key={product.id} product={product} onClick={() => onSelect(product)} userType={userType} />
          ))}
        </div>
      )}
    </div>
  );
}
