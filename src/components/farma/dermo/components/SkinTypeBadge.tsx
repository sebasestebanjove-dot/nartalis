"use client";

import { colorVars } from '../styles';

const SKIN_TYPE_LABELS: Record<string, string> = {
  seca: 'Piel seca',
  grasa: 'Piel grasa',
  mixta: 'Piel mixta',
  sensible: 'Piel sensible',
  normal: 'Piel normal',
};

export default function SkinTypeBadge({ type }: { type: string }) {
  const label = SKIN_TYPE_LABELS[type] || type;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.25rem 0.6rem', borderRadius: 8,
      fontSize: 12, fontWeight: 600,
      background: colorVars.premiumGlow,
      color: colorVars.premiumLight,
      marginRight: '0.3rem', marginBottom: '0.3rem',
    }}>
      {label}
    </span>
  );
}
