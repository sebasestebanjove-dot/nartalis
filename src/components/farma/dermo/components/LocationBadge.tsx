import { MapPin, ChevronDown } from 'lucide-react';
import { colorVars } from '../styles';

interface LocationBadgeProps {
  codigoPostal: string;
  farmaciasCount: number;
  onChangeCp: () => void;
}

export default function LocationBadge({ codigoPostal, farmaciasCount, onChangeCp }: LocationBadgeProps) {
  if (!codigoPostal) return null;

  return (
    <button
      onClick={onChangeCp}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        padding: '4px 12px 4px 8px', borderRadius: 20,
        background: colorVars.surface, border: `1px solid ${colorVars.border}`,
        cursor: 'pointer', fontFamily: 'inherit', color: colorVars.fg,
        transition: 'border-color 0.15s',
      }}
    >
      <MapPin size={13} color={colorVars.premiumLight} />
      <span style={{ fontSize: 12, fontWeight: 600 }}>CP: {codigoPostal}</span>
      {farmaciasCount > 0 && (
        <span style={{
          fontSize: 10, fontWeight: 700, color: colorVars.success,
          padding: '1px 6px', borderRadius: 6,
          background: 'rgba(16,185,129,0.12)',
        }}>
          {farmaciasCount} farmacias
        </span>
      )}
      <ChevronDown size={11} color={colorVars.fgDim} />
    </button>
  );
}
