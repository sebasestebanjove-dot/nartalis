'use client';

import { Star, Trash2, ExternalLink } from 'lucide-react';
import { makeSlug } from '@/lib/slug';

interface MedCardProps {
  nregistro: string;
  nombre: string;
  isFavorite: boolean;
  createdAt?: string;
  showDate?: boolean;
  onToggleFavorite: (nregistro: string) => void;
  onRemove: (nregistro: string) => void;
}

const C = {
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.85rem 1rem',
    background: '#2C2C2E',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.06)',
    minHeight: 72,
  } as React.CSSProperties,
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: 700,
    color: '#FFFFFF',
    lineHeight: 1.3,
  },
  date: {
    fontSize: 12,
    color: '#A1A1AA',
    marginTop: '0.2rem',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 10,
    border: 'none',
    background: 'transparent',
    color: '#A1A1AA',
    cursor: 'pointer',
    flexShrink: 0,
    fontFamily: 'inherit',
    transition: 'background 0.15s, color 0.15s',
  },
  starActive: {
    color: '#FBBF24',
  },
  linkBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 10,
    border: 'none',
    background: 'transparent',
    color: '#60A5FA',
    cursor: 'pointer',
    flexShrink: 0,
    fontFamily: 'inherit',
  },
};

export default function MedCard({ nregistro, nombre, isFavorite, createdAt, showDate = false, onToggleFavorite, onRemove }: MedCardProps) {
  const href = `/prospectos/${makeSlug(nombre, nregistro)}`;

  return (
    <div style={C.card}>
      <div style={C.info}>
        <div style={C.name}>{nombre}</div>
        {showDate && createdAt && (
          <div style={C.date}>Guardado el {new Date(createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
        )}
      </div>

      <a
        href={href}
        aria-label={`Abrir ${nombre}`}
        style={C.linkBtn}
      >
        <ExternalLink size={20} />
      </a>

      <button
        type="button"
        onClick={() => onToggleFavorite(nregistro)}
        aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        aria-pressed={isFavorite}
        style={{ ...C.actionBtn, ...(isFavorite ? C.starActive : {}) }}
      >
        <Star size={20} fill={isFavorite ? '#FBBF24' : 'none'} />
      </button>

      <button
        type="button"
        onClick={() => onRemove(nregistro)}
        aria-label={`Quitar ${nombre}`}
        style={C.actionBtn}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#F87171'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#A1A1AA'; }}
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
}
