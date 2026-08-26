'use client';

import Link from 'next/link';
import { Star, ChevronRight } from 'lucide-react';
import { makeSlug } from '@/lib/slug';
import V2Empty from './V2Empty';
import { V } from './V2Styles';

interface Fav { nregistro: string; nombre: string; is_favorite: boolean; created_at: string }

interface Props {
  items: Fav[];
}

export default function V2Favorites({ items }: Props) {
  return (
    <div style={V.favSection}>
      <div style={{ ...V.sectionHead, marginBottom: 10 }}>
        <div style={V.sectionHeadLeft}>
          <Star size={15} style={{ color: V.c.star }} />
          <span style={{ ...V.sectionTitle, fontSize: 14 }}>Favoritos</span>
        </div>
      </div>
      {items.length === 0 ? (
        <V2Empty
          icon={<Star size={20} />}
          title="Sin favoritos aún"
          description="Pulsa la estrella en un medicamento para guardarlo."
          ctaLabel="Explorar"
          ctaHref="/"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
          {items.map((m) => (
            <Link
              key={m.nregistro}
              href={`/prospectos/${makeSlug(m.nombre, m.nregistro)}`}
              style={V.favRow}
              onMouseEnter={(e) => { e.currentTarget.style.background = V.c.borderLight; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Star size={12} style={V.favStar} fill="currentColor" />
              <div style={V.favBody}>
                <div style={V.favName}>{m.nombre}</div>
              </div>
              <ChevronRight size={12} style={V.favArrow} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
