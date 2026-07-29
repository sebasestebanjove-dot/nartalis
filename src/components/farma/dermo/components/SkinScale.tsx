'use client';

import { colorVars } from '../styles';

interface SkinScaleProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
}

export default function SkinScale({ value, onChange, min = 1, max = 10, label }: SkinScaleProps) {
  const nums: number[] = [];
  for (let i = min; i <= max; i++) nums.push(i);

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: colorVars.fgMuted, marginBottom: '0.5rem' }}>
        {label}: <strong style={{ color: colorVars.premiumLight }}>{value}</strong>
      </div>
      <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'space-between' }}>
        {nums.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: n === value
                ? `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`
                : colorVars.surface,
              border: n === value
                ? 'none'
                : `1px solid ${colorVars.border}`,
              color: n === value ? '#fff' : colorVars.fg,
              fontSize: 14, fontWeight: n === value ? 800 : 500,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colorVars.fgDim, marginTop: '0.2rem' }}>
        <span>Bajo</span>
        <span>Alto</span>
      </div>
    </div>
  );
}
