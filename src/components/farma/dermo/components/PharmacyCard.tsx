"use client";

import { MapPin, Phone, Check } from 'lucide-react';
import type { DermoPharmacy } from '../types';
import { colorVars } from '../styles';

interface PharmacyCardProps {
  pharmacy: DermoPharmacy;
  onBook?: () => void;
  showBook?: boolean;
  bookingDisabled?: boolean;
}

export default function PharmacyCard({ pharmacy, onBook, showBook, bookingDisabled }: PharmacyCardProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.85rem 1rem', background: colorVars.surface,
      borderRadius: 12, border: `1px solid ${colorVars.border}`,
      marginBottom: '0.5rem',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: colorVars.premiumGlow,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        fontSize: 18,
      }}>
        💊
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: colorVars.fg }}>
          {pharmacy.name}
        </div>
        <div style={{ fontSize: 12, color: colorVars.fgMuted, display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
          <MapPin size={11} />
          {[pharmacy.address, pharmacy.city].filter(Boolean).join(', ')}
        </div>
        {pharmacy.phone && (
          <div style={{ fontSize: 12, color: colorVars.fgMuted, display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.1rem' }}>
            <Phone size={11} />
            {pharmacy.phone}
          </div>
        )}
      </div>
      {showBook && onBook && (
        <button
          onClick={onBook}
          disabled={bookingDisabled}
          aria-label="Reservar"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.5rem 1rem', borderRadius: 10, border: 'none',
            background: bookingDisabled ? colorVars.surfaceHover : `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
            color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: bookingDisabled ? 'not-allowed' : 'pointer',
            opacity: bookingDisabled ? 0.5 : 1, fontFamily: 'inherit',
            transition: 'opacity 0.15s',
          }}
        >
          <Check size={14} />
          Reservar
        </button>
      )}
    </div>
  );
}
