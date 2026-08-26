'use client';

import Link from 'next/link';
import { Pill, Star } from 'lucide-react';
import { makeSlug } from '@/lib/slug';
import { V } from './V2Styles';

interface Props {
  nregistro: string;
  nombre: string;
  isFavorite: boolean;
  createdAt?: string;
  showDate?: boolean;
  onToggleFavorite?: (nregistro: string) => void;
  className?: string;
}

export default function V2MedCard({ nregistro, nombre, isFavorite, createdAt, showDate, onToggleFavorite, className }: Props) {
  const slug = makeSlug(nombre, nregistro);
  const href = `/prospectos/${slug}`;

  return (
    <div
      style={V.medCard}
      className={className}
      role="listitem"
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = V.c.primary;
        e.currentTarget.style.boxShadow = V.shadow.cardHover;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = V.c.borderLight;
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onToggleFavorite(nregistro); }}
          style={{
            ...V.medCardStar,
            ...(isFavorite ? V.medCardStarActive : {}),
          }}
          aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          onMouseEnter={(e) => { if (!isFavorite) e.currentTarget.style.background = V.c.borderLight; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = isFavorite ? V.c.starLight : 'transparent'; }}
        >
          <Star size={14} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      )}
      <div style={V.medCardIcon}>
        <Pill size={16} />
      </div>
      <Link href={href} style={V.medCardBody}>
        <div style={V.medCardName} title={nombre}>{nombre}</div>
        {showDate && createdAt && (
          <div style={V.medCardDate}>
            {new Date(createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </div>
        )}
      </Link>
    </div>
  );
}
