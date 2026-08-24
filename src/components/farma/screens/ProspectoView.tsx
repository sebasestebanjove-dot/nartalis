'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Volume2, Square, ExternalLink, Pill,
  AlertTriangle, Car, Dna, FlaskConical, Beaker,
  TriangleAlert, Baby, FileWarning, Info,
} from 'lucide-react';
import type { Medicamento, CimaPrincipioActivo } from '../types';
import SaveMedButton from '../SaveMedButton';
import ContextualMedSearch from '../ContextualMedSearch';
import { styles } from './styles';
import { slugify } from '@/lib/slug';

export type PaLink = { slug: string; nombre: string };

interface Props {
  medicamento: Medicamento;
  relatedPa?: { nombre: string; nregistro: string }[];
  relatedAtc?: { nombre: string; nregistro: string }[];
  canonicalPaLinks?: PaLink[];
  initialSessionUser?: { id: string; name: string; email: string; plan: string; role: string } | null;
  initialIsSaved?: boolean;
  initialIsFavorite?: boolean;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

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

export default function ProspectoView({ medicamento, relatedPa, relatedAtc, canonicalPaLinks = [], initialSessionUser, initialIsSaved = false, initialIsFavorite = false }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const legendRef = useRef<HTMLDivElement>(null);
  const m = medicamento;

  const alertChips = useAlerts(m);

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

  const paCount = m.principiosActivos?.length ?? 0;
  const excipCount = m.excipientes?.length ?? 0;

  return (
    <div style={styles.detailContainer}>
      <div style={styles.detailHeader}>
        <button style={styles.backBtn} onClick={() => window.history.back()} aria-label="Volver"><ArrowLeft size={24} /></button>
        <div style={{ flex: 1 }}>
          <h1 style={{ ...styles.detailName, margin: 0 }}>{m.nombre}</h1>
          <div style={styles.detailByline}>
            {[m.dosis, m.formaFarmaceutica].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>

      <div style={styles.detailBody}>
        {(m.pactivos || (m.principiosActivos && m.principiosActivos.length > 0)) && (
          <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.6, marginBottom: '1rem' }}>
            {m.nombre} es un medicamento
            {m.pactivos || ((m.principiosActivos?.length ?? 0) > 0) ? <>{' '}cuyo principio activo es{' '}
              <strong style={{ color: '#D1D5DB' }}>
                {m.pactivos || m.principiosActivos?.map(p => p.nombre).join(', ') || ''}
              </strong></> : null}
            {m.dosis && <>. Su dosis es <strong style={{ color: '#D1D5DB' }}>{m.dosis}</strong></>}
            {m.formaFarmaceutica && <>. Forma farmacéutica: <strong style={{ color: '#D1D5DB' }}>{m.formaFarmaceutica.toLowerCase()}</strong></>}
            {m.vias.length > 0 && <>. Vía de administración: <strong style={{ color: '#D1D5DB' }}>{m.vias.join(', ').toLowerCase()}</strong></>}
            {m.receta ? '. Requiere receta médica' : '. No requiere receta médica'}
            {m.generico && '. Es un medicamento genérico (EFG)'}
            {m.laboratorio && <>. Comercializado por <strong style={{ color: '#D1D5DB' }}>{m.laboratorio}</strong></>}
            . Datos procedentes de la <strong style={{ color: '#D1D5DB' }}>AEMPS</strong> (CIMA).
          </p>
        )}

        {m.imagenUrl && (
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <img src={m.imagenUrl} alt={m.nombre} style={styles.detailImg} />
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
          {alertChips.map(chip => (
            <TooltipChip key={chip.key} chip={chip} desc={LEGEND[chip.key] || ''} />
          ))}
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

        <div style={styles.infoGrid}>
          {paCount > 0 && (
            <div style={styles.infoGridItem}>
              <div style={styles.infoGridLabel}>Principios activos</div>
              <div style={styles.infoGridValue}>{m.pactivos || `${paCount} principios`}</div>
            </div>
          )}
          {m.atcs && m.atcs.length > 0 && (
            <div style={styles.infoGridItem}>
              <div style={styles.infoGridLabel}>Código ATC</div>
              <div style={styles.infoGridValue}>{m.atcs[m.atcs.length - 1].codigo}</div>
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
        <SaveMedButton
          nregistro={m.registro}
          nombre={m.nombre}
          initialSessionUser={initialSessionUser ?? null}
          initialIsSaved={initialIsSaved}
          initialIsFavorite={initialIsFavorite}
        />

        {/* ── Q&A / AEO block ── */}
        <div style={{ ...styles.section, marginTop: '0.25rem' }}>
          <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Información del medicamento</h2>
          <div style={{ ...styles.compactCard, padding: '0.85rem 1rem' }}>
            {(m.pactivos || (m.principiosActivos && m.principiosActivos.length > 0)) && (
              <div style={{ marginBottom: '0.4rem' }}>
                <strong style={{ fontSize: 13, color: '#A78BFA' }}>¿Cuál es su principio activo?</strong>
                <div style={{ fontSize: 13, color: '#A1A1AA', marginTop: '0.15rem' }}>
                  {m.pactivos || m.principiosActivos?.map(p => p.nombre).join(', ') || ''}
                </div>
              </div>
            )}
            {m.dosis && (
              <div style={{ marginBottom: '0.4rem' }}>
                <strong style={{ fontSize: 13, color: '#A78BFA' }}>¿Qué dosis tiene?</strong>
                <div style={{ fontSize: 13, color: '#A1A1AA', marginTop: '0.15rem' }}>{m.dosis}</div>
              </div>
            )}
            {m.formaFarmaceutica && (
              <div style={{ marginBottom: '0.4rem' }}>
                <strong style={{ fontSize: 13, color: '#A78BFA' }}>¿Qué forma farmacéutica tiene?</strong>
                <div style={{ fontSize: 13, color: '#A1A1AA', marginTop: '0.15rem' }}>{m.formaFarmaceutica.toLowerCase()}</div>
              </div>
            )}
            {m.vias.length > 0 && (
              <div style={{ marginBottom: '0.4rem' }}>
                <strong style={{ fontSize: 13, color: '#A78BFA' }}>¿Cómo se administra?</strong>
                <div style={{ fontSize: 13, color: '#A1A1AA', marginTop: '0.15rem' }}>{m.vias.join(', ').toLowerCase()}</div>
              </div>
            )}
            <div style={{ marginBottom: '0.4rem' }}>
              <strong style={{ fontSize: 13, color: '#A78BFA' }}>¿Requiere receta médica?</strong>
              <div style={{ fontSize: 13, color: '#A1A1AA', marginTop: '0.15rem' }}>{m.receta ? 'Sí, requiere receta médica' : 'No, venta sin receta'}</div>
            </div>
            {m.generico && (
              <div style={{ marginBottom: '0.4rem' }}>
                <strong style={{ fontSize: 13, color: '#A78BFA' }}>¿Es un medicamento genérico?</strong>
                <div style={{ fontSize: 13, color: '#A1A1AA', marginTop: '0.15rem' }}>Sí, es un medicamento genérico (EFG)</div>
              </div>
            )}
            {m.atcs && m.atcs.length > 0 && (
              <div style={{ marginBottom: '0.4rem' }}>
                <strong style={{ fontSize: 13, color: '#A78BFA' }}>¿Cuál es su código ATC?</strong>
                <div style={{ fontSize: 13, color: '#A1A1AA', marginTop: '0.15rem' }}>
                  {m.atcs[m.atcs.length - 1].codigo} — {m.atcs[m.atcs.length - 1].nombre}
                </div>
              </div>
            )}
            {m.laboratorio && (
              <div style={{ marginBottom: '0.1rem' }}>
                <strong style={{ fontSize: 13, color: '#A78BFA' }}>¿Quién lo comercializa?</strong>
                <div style={{ fontSize: 13, color: '#A1A1AA', marginTop: '0.15rem' }}>{m.laboratorio}</div>
              </div>
            )}
            {(m.estado?.rev || m.estado?.aut) && (
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #3A3A3C', fontSize: 12, color: '#66748A' }}>
                Datos de CIMA/AEMPS{'\u00A0'}
                {m.estado.rev ? 'revisados' : 'registrados'} el{' '}
                {formatDate(m.estado.rev || m.estado.aut!)}
              </div>
            )}
          </div>
        </div>

        {m.principiosActivos && m.principiosActivos.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Composición</h2>
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

        {m.atcs && m.atcs.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Clasificación ATC</h2>
            </div>
            <div style={styles.compactCard}>
              {m.atcs.map((a, i) => {
                const isLinkable = a.nivel === 3 || a.nivel === 4;
                return (
                <div key={i} style={{ marginBottom: i < m.atcs!.length - 1 ? '0.25rem' : 0 }}>
                  {isLinkable ? (
                    <Link
                      href={`/atc/${a.codigo}`}
                      style={{ ...styles.chipAtc, textDecoration: 'none', cursor: 'pointer' }}
                      className="atc-link"
                    >
                      {a.codigo}
                    </Link>
                  ) : (
                    <span style={styles.chipAtc}>{a.codigo}</span>
                  )}
                  <span style={{ fontSize: 13, color: '#A1A1AA' }}>{a.nombre}</span>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {m.presentaciones && m.presentaciones.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Presentaciones</h2>
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

        {(m.pactivos || (m.principiosActivos && m.principiosActivos.length > 0)) && (
          <div style={{ ...styles.section, marginTop: '0.5rem' }}>
            <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Principio activo</h2>
            <div style={{ ...styles.compactCard, padding: '0.85rem 1rem' }}>
              <p style={{ fontSize: 13, color: '#A1A1AA', marginBottom: '0.6rem', lineHeight: 1.5 }}>
                Este medicamento contiene{' '}
                <strong style={{ color: '#D1D5DB' }}>
                  {m.pactivos || m.principiosActivos?.map(p => p.nombre).join(', ') || ''}
                </strong>{' '}
                como principio activo.
              </p>
              {canonicalPaLinks && canonicalPaLinks.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {canonicalPaLinks.map((pa) => (
                    <Link
                      key={pa.slug}
                      href={`/principios-activos/${pa.slug}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.5rem 0.9rem', borderRadius: 8,
                        background: 'rgba(103,72,255,0.12)', border: '1px solid rgba(103,72,255,0.25)',
                        color: '#A78BFA', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                      }}
                      className="pa-link"
                    >
                      Ver {pa.nombre.toLowerCase()} →
                    </Link>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: 13, color: '#6B7280' }}>
                  Principio activo no disponible para navegar en estos momentos.
                </span>
              )}
            </div>
          </div>
        )}

        {m.laboratorio && (
          <div style={{ ...styles.section, marginTop: '0.5rem' }}>
            <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Laboratorio</h2>
            <div style={{ ...styles.compactCard, padding: '0.85rem 1rem' }}>
              <p style={{ fontSize: 13, color: '#A1A1AA', marginBottom: '0.6rem', lineHeight: 1.5 }}>
                Comercializado por <strong style={{ color: '#D1D5DB' }}>{m.laboratorio}</strong>.
              </p>
              <Link
                href={`/laboratorios/${slugify(m.laboratorio)}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.5rem 0.9rem', borderRadius: 8,
                  background: 'rgba(103,72,253,0.12)', border: '1px solid rgba(103,72,253,0.25)',
                  color: '#A78BFA', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                }}
                className="pa-link"
              >
                Ver medicamentos de {m.laboratorio} →
              </Link>
            </div>
          </div>
        )}

        {(relatedPa && relatedPa.length > 0) && (
          <div style={{ ...styles.section, marginTop: '0.5rem' }}>
            <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Otros medicamentos con el mismo principio activo</h2>
            <div style={{ ...styles.compactCard, padding: '0.6rem 0.85rem' }}>
              {relatedPa.map(r => (
                <Link key={r.nregistro} href={`/prospectos/${slugify(r.nombre)}--${r.nregistro}`}
                  style={{ display: 'block', padding: '0.2rem 0', fontSize: 13, color: '#A78BFA', textDecoration: 'none' }}
                  className="pa-link">{r.nombre}</Link>
              ))}
            </div>
          </div>
        )}

        {(relatedAtc && relatedAtc.length > 0) && (
          <div style={{ ...styles.section, marginTop: '0.5rem' }}>
            <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Otros medicamentos del mismo grupo ATC</h2>
            <div style={{ ...styles.compactCard, padding: '0.6rem 0.85rem' }}>
              {relatedAtc.map(r => (
                <Link key={r.nregistro} href={`/prospectos/${slugify(r.nombre)}--${r.nregistro}`}
                  style={{ display: 'block', padding: '0.2rem 0', fontSize: 13, color: '#A78BFA', textDecoration: 'none' }}
                  className="pa-link">{r.nombre}</Link>
              ))}
            </div>
          </div>
        )}

        {/* Buscador contextual: mismo motor que el Home, origen 'medicine_page'.
            Continuidad de consulta sin abandonar la ficha. No sustituye contenido. */}
        <ContextualMedSearch source="medicine_page" />

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
        .pa-link:hover { background: rgba(103,72,253,0.22) !important; color: #C4B5FD !important; }
        .atc-link:hover { opacity: 0.8; }
      `}</style>
    </div>
  );
}
