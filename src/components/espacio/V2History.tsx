'use client';

import Link from 'next/link';
import { Clock, ChevronRight, Pill } from 'lucide-react';
import { makeSlug } from '@/lib/slug';
import V2Empty from './V2Empty';
import { V } from './V2Styles';

interface Consulta { nregistro: string; nombre: string; consulted_at: string }

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Hace ${months} mes${months > 1 ? 'es' : ''}`;
  const years = Math.floor(months / 12);
  return `Hace ${years} año${years > 1 ? 's' : ''}`;
}

interface Props {
  items: Consulta[];
}

export default function V2History({ items }: Props) {
  return (
    <div>
      <div style={{ ...V.sectionHead, marginBottom: 10 }}>
        <div style={V.sectionHeadLeft}>
          <Clock size={15} style={{ color: V.c.textTer }} />
          <span style={{ ...V.sectionTitle, fontSize: 14 }}>Últimas consultas</span>
        </div>
      </div>
      {items.length === 0 ? (
        <V2Empty
          icon={<Clock size={20} />}
          title="Sin consultas recientes"
          description="Tus consultas aparecerán aquí."
          ctaLabel="Buscar"
          ctaHref="/"
        />
      ) : (
        <div style={V.histCard}>
          {items.map((c, i) => (
            <Link
              key={`${c.nregistro}-${c.consulted_at}`}
              href={`/prospectos/${makeSlug(c.nombre, c.nregistro)}`}
              style={{
                ...V.histRow,
                ...(i === items.length - 1 ? V.histRowLast : {}),
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = V.c.borderLight; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={V.histIcon}>
                <Pill size={12} />
              </div>
              <div style={V.histBody}>
                <div style={V.histName}>{c.nombre}</div>
                <div style={V.histDate}>{relativeDate(c.consulted_at)}</div>
              </div>
              <ChevronRight size={12} style={V.histArrow} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
