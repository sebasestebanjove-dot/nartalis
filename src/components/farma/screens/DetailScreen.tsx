'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Volume2, Square, ExternalLink, Pill,
  AlertTriangle, Car, Dna, FlaskConical, Beaker,
  TriangleAlert, Baby, FileWarning, Info,
  Bookmark, BookmarkCheck, Star,
} from 'lucide-react';
import type { Medicamento, CimaPrincipioActivo } from '../types';
import { styles } from './styles';
import type { PublicSessionUser } from '@/lib/auth';

interface Props {
  medicamento: Medicamento;
  onBack: () => void;
  loading?: boolean;
  onDAtcDetected?: (hasD: boolean) => void;
  sessionUser?: PublicSessionUser | null;
  isSaved?: boolean;
  isFavorite?: boolean;
  onSave?: (m: Medicamento) => void;
  onToggleFavorite?: (m: Medicamento) => void;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Legend descriptions ────────────────────────────────
const LEGEND: Record<string, string> = {
  receta: 'Requiere receta médica obligatoria para su dispensación.',
  conduc: 'Afecta a la capacidad de conducir y utilizar maquinaria.',
  generico: 'Especialidad Farmacéutica Genérica (EFG). Mismos principios activos que el medicamento de referencia.',
  triangulo: 'Sujeto a seguimiento adicional. Notificar cualquier sospecha de reacción adversa.',
  psico: 'Sustancia psicótropa que actúa sobre el sistema nervioso central.',
  hospital: 'Medicamento de uso o diagnóstico hospitalario.',
  psum: 'Este medicamento cuenta con un Plan de Gestión de Riesgos durante el embarazo.',
  biosimilar: 'Medicamento biológico similar al medicamento biológico de referencia.',
  nocomerc: 'No comercializado actualmente. No está disponible en el mercado.',
  notas: 'Este medicamento tiene notas especiales. Consulte el prospecto para más información.',
};

// ─── Alert chips ──────────────────────────────────────
function useAlerts(m: Medicamento) {
  const chips: { key: string; style: React.CSSProperties; icon: React.ReactNode; label: string }[] = [];

  chips.push({
    key: 'receta',
    style: m.receta ? styles.chipReceta : styles.chipNoReceta,
    icon: m.receta ? <AlertTriangle size={16} /> : <Pill size={16} />,
    label: m.receta ? 'Receta' : 'Sin receta',
  });

  if (m.conduc) chips.push({ key: 'conduc', style: styles.chipConduc, icon: <Car size={16} />, label: 'Conducción' });
  if (m.generico) chips.push({ key: 'generico', style: styles.chipGenerico, icon: <Beaker size={16} />, label: 'EFG' });
  if (m.triangulo) chips.push({ key: 'triangulo', style: styles.chipTriangulo, icon: <TriangleAlert size={16} />, label: 'Seguimiento' });
  if (m.biosimilar) chips.push({ key: 'biosimilar', style: styles.chipBiosimilar, icon: <Beaker size={16} />, label: 'Biosimilar' });
  if (m.psum) chips.push({ key: 'psum', style: styles.chipPsum, icon: <Baby size={16} />, label: 'Embarazo' });
  if (!m.comerc) chips.push({ key: 'nocomerc', style: styles.chipNoComerc, icon: <FileWarning size={16} />, label: 'No comercializado' });
  if (m.notas) chips.push({ key: 'notas', style: styles.chipNotas, icon: <Info size={16} />, label: 'Notas especiales' });

  const c = (m.cpresc || '').toLowerCase();
  if (c.includes('psicótropo') || c.includes('psicotropo')) chips.push({ key: 'psico', style: styles.chipPsico, icon: <Dna size={16} />, label: 'Psicótropo' });
  if (c.includes('hospitalario') || c.includes('diagnóstico hospitalario')) chips.push({ key: 'hospital', style: styles.chipHospital, icon: <FlaskConical size={16} />, label: 'Hospitalario' });

  return chips;
}

// ─── TooltipChip ──────────────────────────────────────
function TooltipChip({ chip: c, desc }: { chip: { key: string; style: React.CSSProperties; icon: React.ReactNode; label: string }; desc: string }) {
  return (
    <div style={styles.chipTooltipWrap}>
      <span style={c.style}>
        {c.icon} {c.label}
      </span>
      <div style={styles.chipTooltip} className="chip-tooltip">
        {desc}
        <div style={styles.chipTooltipArrow} />
      </div>
    </div>
  );
}

// ─── Active principles list ────────────────────────────
function PrincipiosActivos({ items }: { items: CimaPrincipioActivo[] }) {
  return (
    <>
      {items.map((pa, i) => (
        <div key={i} style={styles.princRow}>
          <span style={styles.princDot}>◆</span>
          <span style={styles.princName}>{pa.nombre}</span>
          <span style={styles.princDosis}>{pa.cantidad} {pa.unidad}</span>
        </div>
      ))}
    </>
  );
}

export default function DetailScreen({ medicamento, onBack, loading, onDAtcDetected, sessionUser, isSaved = false, isFavorite = false, onSave, onToggleFavorite }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const legendRef = useRef<HTMLDivElement>(null);
  const m = medicamento;

  const alertChips = useAlerts(m);

  // Close legend on outside click
  useEffect(() => {
    if (!showLegend) return;
    const handler = (e: MouseEvent) => {
      if (legendRef.current && !legendRef.current.contains(e.target as Node)) {
        setShowLegend(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showLegend]);

  const hasDAtc = m.atcs?.some(a => a.codigo.startsWith('D')) ?? false;
  useEffect(() => {
    onDAtcDetected?.(hasDAtc);
  }, [hasDAtc, onDAtcDetected]);
  // Cached reference to avoid re-creating on every render
  // (used to persist the close callback reference)

  const textSummary = [
    m.nombre,
    m.dosis && `Dosis: ${m.dosis}.`,
    m.formaFarmaceutica && `Forma: ${m.formaFarmaceutica.toLowerCase()}.`,
    m.vias.length > 0 && `Vía: ${m.vias.join(', ').toLowerCase()}.`,
    m.receta ? 'Requiere receta.' : 'Venta sin receta.',
    m.conduc && 'Afecta a la conducción.',
    m.psum && 'Riesgo en embarazo.',
    m.triangulo && 'Seguimiento adicional.',
    m.generico && 'Genérico EFG.',
  ].filter(Boolean).join(' ');

  const handleSpeak = useCallback(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(textSummary);
    u.lang = 'es-ES'; u.rate = 0.9;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }, [textSummary]);

  const handleStop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const openUrl = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  if (loading) {
    return (
      <div style={styles.detailContainer}>
        <div style={styles.detailHeader}>
          <button style={styles.backBtn} onClick={onBack} aria-label="Volver"><ArrowLeft size={24} /></button>
          <div style={{ flex: 1 }}><div style={styles.detailName}>{m.nombre}</div></div>
        </div>
        <div style={styles.loader}>Cargando detalle...</div>
      </div>
    );
  }

  const paCount = m.principiosActivos?.length ?? 0;
  const excipCount = m.excipientes?.length ?? 0;

  return (
    <div style={styles.detailContainer}>
      {/* Header */}
      <div style={styles.detailHeader}>
        <button style={styles.backBtn} onClick={onBack} aria-label="Volver"><ArrowLeft size={24} /></button>
        <div style={{ flex: 1 }}>
          <div style={styles.detailName}>{m.nombre}</div>
          <div style={styles.detailByline}>
            {[m.dosis, m.formaFarmaceutica].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>

      <div style={styles.detailBody}>
        {/* Image centered */}
        {m.imagenUrl && (
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <img src={m.imagenUrl} alt={m.nombre} style={styles.detailImg} />
          </div>
        )}

        {/* Alert chips row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
          {alertChips.map(chip => (
            <TooltipChip key={chip.key} chip={chip} desc={LEGEND[chip.key] || ''} />
          ))}
          {/* Legend button */}
          <div ref={legendRef} style={{ position: 'relative', alignSelf: 'center' }}>
            <button
              onClick={() => setShowLegend(!showLegend)}
              style={{
                ...styles.legendBtn,
                background: showLegend ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderColor: showLegend ? '#A1A1AA' : '#52525B',
                color: showLegend ? '#E4E4E7' : '#A1A1AA',
              }}
              aria-label="Información de las alertas"
            >
              ?
            </button>
            {showLegend && (
              <div style={styles.legendDropdown}>
                {alertChips.map(chip => (
                  <div key={chip.key} style={styles.legendItem}>
                    <span style={{ display: 'flex', alignItems: 'center', ...chip.style, padding: '0.15rem 0.4rem', borderRadius: 6, fontSize: 12, fontWeight: 700, lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                      {chip.icon} {chip.label}
                    </span>
                    <span style={{ flex: 1, color: '#A1A1AA' }}>{LEGEND[chip.key] || ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info grid 2-col */}
        <div style={styles.infoGrid}>
          {paCount > 0 && (
            <div style={styles.infoGridItem}>
              <div style={styles.infoGridLabel}>Principios activos</div>
              <div style={styles.infoGridValue}>{m.pactivos || `${paCount} principios`}</div>
            </div>
          )}
          {m.vias.length > 0 && (
            <div style={styles.infoGridItem}>
              <div style={styles.infoGridLabel}>Vía de administración</div>
              <div style={styles.infoGridValue}>{m.vias.join(', ').toLowerCase()}</div>
            </div>
          )}
          <div style={styles.infoGridItem}>
            <div style={styles.infoGridLabel}>Laboratorio</div>
            <div style={{ ...styles.infoGridValue, fontSize: 13 }}>{m.laboratorio}</div>
          </div>
          {m.estado?.rev && (
            <div style={styles.infoGridItem}>
              <div style={styles.infoGridLabel}>Última revisión</div>
              <div style={{ ...styles.infoGridValue, fontSize: 13 }}>{formatDate(m.estado.rev)}</div>
            </div>
          )}
          {m.cpresc && (
            <div style={styles.infoGridItem}>
              <div style={styles.infoGridLabel}>Prescripción</div>
              <div style={{ ...styles.infoGridValue, fontSize: 13 }}>{m.cpresc}</div>
            </div>
          )}
          {m.estado?.aut && (
            <div style={styles.infoGridItem}>
              <div style={styles.infoGridLabel}>Autorizado</div>
              <div style={{ ...styles.infoGridValue, fontSize: 13 }}>{formatDate(m.estado.aut)}</div>
            </div>
          )}
        </div>

        {/* Disclaimer médico */}
        <div style={{
          display: 'flex', gap: '0.4rem', alignItems: 'flex-start',
          padding: '0.6rem 0.75rem', marginBottom: '1rem',
          borderRadius: 10, background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.12)',
          fontSize: 12, color: '#9CA3AF', lineHeight: 1.5,
        }}>
          <Info size={14} style={{ flexShrink: 0, marginTop: 2, color: '#FBBF24' }} />
          <span>Esta plataforma es un buscador informativo basado en datos oficiales de la AEMPS y <strong>no sustituye</strong> el consejo, diagnóstico o tratamiento médico profesional.</span>
        </div>

        {/* Guardar en mi espacio */}
        <div style={styles.saveBar}>
          <button
            onClick={() => {
              if (isSaved) {
                onToggleFavorite?.(m);
              } else {
                onSave?.(m);
              }
            }}
            aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            aria-pressed={isFavorite}
            style={{ ...styles.saveStar, ...(isFavorite ? styles.saveStarActive : {}) }}
          >
            <Star size={20} fill={isFavorite ? '#FBBF24' : 'none'} />
          </button>

          {isSaved ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, flexWrap: 'wrap' }}>
              <span style={styles.saveSaved}>
                <BookmarkCheck size={17} /> Guardado ✓
              </span>
              <Link href="/espacio" style={styles.saveLink}>
                Ver en mi espacio
              </Link>
            </div>
          ) : (
            <button
              onClick={() => onSave?.(m)}
              style={{ ...styles.saveBtn, flex: 1 }}
            >
              <Bookmark size={17} /> {sessionUser ? 'Guardar en mi espacio' : 'Guardar y crear mi espacio gratis'}
            </button>
          )}
        </div>

        {/* Composición */}
        {m.principiosActivos && m.principiosActivos.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionTitle}>Composición</div>
            </div>
            <div style={styles.compactCard}>
              <PrincipiosActivos items={m.principiosActivos} />
              {excipCount > 0 && (
                <div style={{ marginTop: '0.5rem', borderTop: '1px solid #3A3A3C', paddingTop: '0.4rem' }}>
                  <div style={{ fontSize: 13, color: '#A1A1AA', fontWeight: 600, marginBottom: '0.3rem' }}>Excipientes ({excipCount})</div>
                  {m.excipientes!.map((ex, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.3rem', fontSize: 13, color: '#A1A1AA', marginBottom: '0.15rem' }}>
                      <span>•</span>
                      <span>{ex.nombre}</span>
                      {ex.cantidad && <span style={{ color: '#6B7280' }}>{ex.cantidad} {ex.unidad}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clasificación ATC */}
        {m.atcs && m.atcs.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionTitle}>Clasificación ATC</div>
            </div>
            <div style={styles.compactCard}>
              {m.atcs.map((a, i) => (
                <div key={i} style={{ marginBottom: i < m.atcs!.length - 1 ? '0.25rem' : 0 }}>
                  <span style={styles.chipAtc}>{a.codigo}</span>
                  <span style={{ fontSize: 13, color: '#A1A1AA' }}>{a.nombre}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dermatológico (solo si ATC clase D) */}
        {/* Comentado — bloque promocional Dermofarmacia IA
        {hasDAtc && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionTitle}>Dermatológico</div>
            </div>
            <div style={{
              ...styles.compactCard,
              border: '1px solid rgba(124,58,237,0.25)',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(167,139,250,0.03))',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(167,139,250,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Sparkles size={20} color="#A78BFA" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#E4E4E7', marginBottom: '0.25rem' }}>
                    Este medicamento es de uso dermatológico
                  </div>
                  <div style={{ fontSize: 13, color: '#A1A1AA', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                    Obtén análisis de ingredientes, alternativas y rutinas personalizadas con nuestra IA experta en dermofarmacia.
                  </div>
                  <button
                    onClick={() => window.location.href = '/farma/dermo'}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
                      background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
                      color: '#fff', fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <Sparkles size={16} />
                    Ir a Dermofarmacia IA
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        */}

        {/* Presentaciones */}
        {m.presentaciones && m.presentaciones.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionTitle}>Presentaciones</div>
            </div>
            <div style={styles.compactCard}>
              {m.presentaciones.map((p, i) => (
                <div key={i} style={{ ...styles.presRow, borderBottom: i < m.presentaciones!.length - 1 ? '1px solid #3A3A3C' : 'none' }}>
                  <div style={styles.presName}>{p.nombre}</div>
                  <div style={styles.presMeta}>
                    <span>CN: {p.cn}</span>
                    {!p.comerc && <span style={styles.presTag}>No comercializado</span>}
                    {p.psum && <span style={styles.presTagPsum}>Plan de riesgos</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions row */}
        <div style={styles.actionRow}>
          {speaking ? (
            <button style={{ ...styles.actionBtn, ...styles.actionStop }} onClick={handleStop}>
              <Square size={18} /> Detener
            </button>
          ) : (
            <button style={{ ...styles.actionBtn, ...styles.actionPlay }} onClick={handleSpeak}>
              <Volume2 size={18} /> Escuchar
            </button>
          )}
          {m.prospectoUrl && (
            <button style={{ ...styles.actionBtn, ...styles.actionPdf }} onClick={() => openUrl(m.prospectoUrl!)}>
              <ExternalLink size={18} /> Prospecto
            </button>
          )}
          {m.fichaTecnicaUrl && (
            <button style={{ ...styles.actionBtn, ...styles.actionPdf }} onClick={() => openUrl(m.fichaTecnicaUrl!)}>
              <ExternalLink size={18} /> Ficha Téc.
            </button>
          )}
        </div>
      </div>

      <style>{`
        .chip-tooltip-wrap:hover .chip-tooltip,
        .chip-tooltip-wrap:focus-within .chip-tooltip {
          opacity: 1 !important;
          visibility: visible !important;
          transform: translateX(-50%) translateY(0) !important;
        }
      `}</style>
    </div>
  );
}
