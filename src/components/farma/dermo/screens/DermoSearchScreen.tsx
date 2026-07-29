"use client";

import { useState } from 'react';
import { Search, Sparkles, FlaskConical, MessageCircle, ShoppingBag, Bot } from 'lucide-react';
import { colorVars } from '../styles';
import type { UserType } from '../types';

interface DermoSearchScreenProps {
  onSearch: (query: string, skinType: string, brand: string) => void;
  onAnalyze: (query: string) => void;
  loading: boolean;
  userType: UserType;
  onStartQuiz: () => void;
  consultasConsumidas?: number;
}

const SKIN_TYPES = [
  { value: '', label: 'Todos los tipos de piel' },
  { value: 'seca', label: 'Piel seca' },
  { value: 'grasa', label: 'Piel grasa' },
  { value: 'mixta', label: 'Piel mixta' },
  { value: 'sensible', label: 'Piel sensible' },
  { value: 'normal', label: 'Piel normal' },
];

const FREE_MAX_CONSULTAS = 2;

const FEATURES = [
  { icon: <FlaskConical size={20} />, title: 'Análisis de ingredientes', desc: 'Escanea y entiende cada componente de tus cosméticos' },
  { icon: <ShoppingBag size={20} />, title: 'Disponibilidad en farmacias', desc: 'Encuentra productos cerca de ti y resérvalos' },
  { icon: <MessageCircle size={20} />, title: 'Chat con IA experta', desc: 'Premium: resuelve tus dudas cosméticas' },
  { icon: <Bot size={20} />, title: 'Rutinas personalizadas', desc: 'Test de piel + rutina AM/PM generada por IA' },
];

export default function DermoSearchScreen({ onSearch, onAnalyze, loading, userType, onStartQuiz, consultasConsumidas = 0 }: DermoSearchScreenProps) {
  const [query, setQuery] = useState('');
  const [skinType, setSkinType] = useState('');
  const isPremium = userType === 'premium';
  const isFree = userType === 'free';
  const consultasRestantes = isFree ? Math.max(0, FREE_MAX_CONSULTAS - consultasConsumidas) : Infinity;

  const handleSearch = () => {
    onSearch(query, skinType, '');
  };

  return (
    <div style={{
      minHeight: '100vh', background: colorVars.bg, color: colorVars.fg,
      padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', maxWidth: 600, marginBottom: '1.5rem', width: '100%' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 0.35rem', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
          Dermofarmacia <span style={{ color: colorVars.premiumLight }}>IA</span>
        </h1>
        <p style={{ fontSize: 14, color: colorVars.fgMuted, margin: 0, lineHeight: 1.5 }}>
          Busca productos de dermofarmacia, consulta sus ingredientes y obtén recomendaciones inteligentes.
        </p>
      </div>

      {isFree && (
        <div style={{
          width: '100%', maxWidth: 600, marginBottom: '1rem',
          padding: '0.65rem 1rem', borderRadius: 10,
          background: consultasRestantes > 0 ? colorVars.premiumGlow : 'rgba(239,68,68,0.12)',
          border: `1px solid ${consultasRestantes > 0 ? 'rgba(124,58,237,0.2)' : 'rgba(239,68,68,0.2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
        }}>
          <span style={{ fontSize: 13, color: consultasRestantes > 0 ? colorVars.premiumLight : colorVars.danger, fontWeight: 600 }}>
            {consultasRestantes > 0
              ? `Te quedan ${consultasRestantes} consulta${consultasRestantes !== 1 ? 's' : ''} gratuita${consultasRestantes !== 1 ? 's' : ''}`
              : 'Has agotado tus consultas gratuitas'}
          </span>
          {consultasRestantes <= 1 && (
            <span style={{ fontSize: 12, color: colorVars.fgMuted }}>
              <a href="/farma/dermo?premium=activate" style={{ color: colorVars.premiumLight, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2 }}>
                Hazte Premium
              </a>
            </span>
          )}
        </div>
      )}

      {/* Search box */}
      <div style={{
        width: '100%', maxWidth: 600, background: colorVars.surface,
        borderRadius: 16, padding: '1.25rem', marginBottom: '1.5rem',
        border: `1px solid ${colorVars.border}`,
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
          <input
            type="text"
            placeholder="Buscar producto, ingrediente o marca..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAnalyze(query)}
            aria-label="Buscar productos"
            style={{
              flex: 1, fontSize: 15, padding: '0.65rem 1rem', borderRadius: 12,
              border: `1px solid ${colorVars.border}`, background: colorVars.bg,
              color: colorVars.fg, outline: 'none', minHeight: 46,
              transition: 'border-color 0.15s', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => onAnalyze(query)}
            disabled={loading || !query.trim()}
            aria-label="Analizar"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
              padding: '0.65rem 1rem', borderRadius: 12, border: 'none',
              background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: loading || !query.trim() ? 'not-allowed' : 'pointer', minHeight: 46,
              opacity: loading || !query.trim() ? 0.5 : 1, transition: 'opacity 0.15s',
              fontFamily: 'inherit',
            }}
          >
            <FlaskConical size={16} /> Analizar
          </button>
          <button
            onClick={handleSearch}
            disabled={loading}
            aria-label="Buscar en catálogo"
            title="Buscar en nuestro catálogo de productos"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0.65rem 1rem', borderRadius: 12, border: `1px solid ${colorVars.border}`,
              background: colorVars.surface, color: colorVars.fgMuted,
              fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
              minHeight: 46, fontFamily: 'inherit', transition: 'all 0.15s',
              gap: '0.3rem',
            }}
          >
            <Search size={16} /> Buscar
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={skinType}
            onChange={(e) => setSkinType(e.target.value)}
            aria-label="Filtrar por tipo de piel"
            style={{
              flex: 1, minWidth: 130, fontSize: 14, padding: '0.55rem 0.85rem',
              borderRadius: 10, border: `1px solid ${colorVars.border}`,
              background: colorVars.bg, color: colorVars.fg,
              outline: 'none', minHeight: 42, cursor: 'pointer',
              transition: 'border-color 0.15s', fontFamily: 'inherit',
            }}
          >
            {SKIN_TYPES.map(st => (
              <option key={st.value} value={st.value}>{st.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Features grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
        maxWidth: 520, width: '100%', marginBottom: '1.5rem',
      }}>
        {FEATURES.map((f, i) => (
          <div key={i} style={{
            padding: '0.85rem', borderRadius: 12,
            background: colorVars.surface, border: `1px solid ${colorVars.border}`,
            display: 'flex', flexDirection: 'column', gap: '0.25rem',
            transition: 'border-color 0.15s',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: colorVars.premiumGlow,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: colorVars.premiumLight, marginBottom: '0.15rem',
            }}>
              {f.icon}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: colorVars.fg }}>{f.title}</div>
            <div style={{ fontSize: 11, color: colorVars.fgMuted, lineHeight: 1.4 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Quiz button */}
      <div style={{ textAlign: 'center', maxWidth: 520, width: '100%' }}>
        <button
          onClick={onStartQuiz}
          aria-label="Realizar test de piel"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
            padding: '1rem 2rem', borderRadius: 16,
            border: `2px solid rgba(167,139,250,0.4)`,
            background: `linear-gradient(135deg, rgba(124,58,237,0.15), rgba(167,139,250,0.08))`,
            color: colorVars.fg, fontSize: 16, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.15s', width: '100%', justifyContent: 'center',
            textAlign: 'left',
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(167,139,250,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Sparkles size={20} color={colorVars.premiumLight} />
          </div>
          <div>
            <div style={{ fontSize: 16 }}>Test de Piel</div>
            <div style={{ fontSize: 12, color: colorVars.premiumLight, fontWeight: 400 }}>
              {isPremium ? 'Rutina personalizada con IA' : 'Gratuito · Descubre tu tipo de piel'}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
