'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Pill, Car, AlertTriangle, FlaskConical, Dna, Beaker, ChevronDown, Info } from 'lucide-react';
import type { Medicamento } from '../types';
import { styles } from './styles';

interface Props {
  resultados: Medicamento[];
  total: number;
  query: string;
  loading: boolean;
  onSelect: (m: Medicamento) => void;
  onBack: () => void;
  suggestedCorrection?: string;
  message?: string;
}

function alertBadges(m: Medicamento): React.ReactNode[] {
  const badges: React.ReactNode[] = [];

  badges.push(
    <span key="receta" style={{ ...styles.badgeBase, ...(m.receta ? styles.badgeRecetaRoja : styles.badgeRecetaVerde) }}>
      {m.receta ? 'Receta' : 'Sin receta'}
    </span>
  );

  if (m.conduc) {
    badges.push(
      <span key="conduc" style={{ ...styles.badgeBase, ...styles.badgeConduc }}>
        <Car size={12} /> Conducción
      </span>
    );
  }

  if (m.generico) {
    badges.push(
      <span key="generico" style={{ ...styles.badgeBase, ...styles.badgeGenerico }}>
        <Beaker size={12} /> EFG
      </span>
    );
  }

  if (m.triangulo) {
    badges.push(
      <span key="triangulo" style={{ ...styles.badgeBase, ...styles.badgeTriangulo }}>
        <AlertTriangle size={12} /> Seguimiento
      </span>
    );
  }

  const cpresc = (m.cpresc || '').toLowerCase();
  if (cpresc.includes('psicótropo') || cpresc.includes('psicotropo')) {
    badges.push(
      <span key="psico" style={{ ...styles.badgeBase, ...styles.badgePsico }}>
        <Dna size={12} /> Psicótropo
      </span>
    );
  }
  if (cpresc.includes('hospitalario') || cpresc.includes('diagnóstico hospitalario')) {
    badges.push(
      <span key="hospital" style={{ ...styles.badgeBase, ...styles.badgeHospital }}>
        <FlaskConical size={12} /> Hospitalario
      </span>
    );
  }

  if (m.psum) {
    badges.push(
      <span key="psum" style={{ ...styles.badgeBase, ...styles.badgePsum }}>
        Embarazo
      </span>
    );
  }

  if (!m.comerc) {
    badges.push(
      <span key="no-comerc" style={{ ...styles.badgeBase, ...styles.badgeNoComerc }}>
        No comercializado
      </span>
    );
  }

  return badges.slice(0, 3);
}

export default function ResultsScreen({ resultados, total, query, loading, onSelect, onBack, suggestedCorrection, message }: Props) {
  const [visibleCount, setVisibleCount] = useState(5);
  const isFullyShown = visibleCount >= resultados.length;

  useEffect(() => {
    setVisibleCount(5);
  }, [resultados]);
  return (
    <div style={styles.resultsContainer}>
      <div style={styles.resultsHeader}>
        <button style={styles.backBtn} onClick={onBack} aria-label="Volver">
          <ArrowLeft size={24} />
        </button>
        <h2 style={styles.resultsTitle}>Resultados para "{query}"</h2>
        <span style={styles.resultsCount}>{total} resultados</span>
      </div>

      {loading ? (
        <div style={styles.loader}>Buscando medicamentos...</div>
      ) : resultados.length === 0 ? (
        <div style={styles.noResults}>
          <Pill size={48} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
          <p>{message || `No se han encontrado resultados para "${query}"`}</p>
          {!message && <p style={{ fontSize: 16, marginTop: '0.5rem' }}>Prueba con otro nombre de medicamento.</p>}
        </div>
      ) : (
        <div>
          <div style={{ maxWidth: 672, margin: '0 auto', width: '100%' }}>
            {suggestedCorrection ? (
              <div style={{
                padding: '0.6rem 1rem',
                marginBottom: '0.75rem',
                background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.2)',
                borderRadius: 12,
                fontSize: 14,
                color: '#D4D4D8',
                lineHeight: 1.4,
              }}>
                No encontramos exactamente <strong>"{query}"</strong>. Quizás quisiste decir: <strong>{suggestedCorrection}</strong>
              </div>
            ) : null}
            {resultados.slice(0, visibleCount).map((m, i) => (
              <div key={`${m.registro}-${i}`} style={styles.resultCard} onClick={() => onSelect(m)} role="button" tabIndex={0}>
                {m.imagenUrl ? (
                  <img src={m.imagenUrl} alt={m.nombre} style={styles.resultImg} />
                ) : (
                  <div style={styles.resultImgPlaceholder}>
                    <Pill size={24} color="#666" />
                  </div>
                )}
                <div style={styles.resultInfo}>
                  <div style={styles.resultName}>{m.nombre}</div>
                  {m.laboratorio && <div style={styles.resultLaboratorio}>{m.laboratorio}</div>}
                  <div style={styles.badgeRow}>
                    {alertBadges(m)}
                  </div>
                </div>
              </div>
            ))}
            {resultados.length > visibleCount && (
              <button
                onClick={() => setVisibleCount(prev => prev + 5)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  width: '100%', minHeight: 48,
                  padding: '0.6rem 1rem', marginTop: '0.25rem',
                  borderRadius: 12, border: 'none',
                  background: 'rgba(59,130,246,0.15)',
                  color: '#60A5FA', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <ChevronDown size={18} />
                Ver siguientes medicamentos (quedan {resultados.length - visibleCount})
              </button>
            )}
            <div style={{
              marginTop: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: 10,
              background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.12)',
              fontSize: 12, color: '#9CA3AF', lineHeight: 1.5,
              display: 'flex', gap: '0.4rem',
            }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 2, color: '#FBBF24' }} />
              <span>Esta plataforma es un buscador informativo basado en datos oficiales de la AEMPS y <strong>no sustituye</strong> el consejo, diagnóstico o tratamiento médico profesional.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
