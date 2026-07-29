'use client';

import { colorVars } from '../styles';

interface ChipOption {
  label: string;
  value: string;
}

interface ChipGroupProps {
  options: ChipOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  columns?: number;
  label?: string;
}

export default function ChipGroup({ options, selected, onChange, columns = 2, label }: ChipGroupProps) {
  return (
    <div>
      {label && (
        <div style={{ fontSize: 13, fontWeight: 600, color: colorVars.fgMuted, marginBottom: '0.5rem' }}>
          {label}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '0.35rem' }}>
        {options.map((opt) => {
          const isSel = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(isSel ? selected.filter(v => v !== opt.value) : [...selected, opt.value]);
              }}
              style={{
                padding: '0.55rem 0.75rem', borderRadius: 10,
                background: isSel
                  ? `linear-gradient(135deg, rgba(124,58,237,0.25), rgba(167,139,250,0.15))`
                  : colorVars.surface,
                border: isSel
                  ? `1.5px solid ${colorVars.premiumLight}`
                  : `1px solid ${colorVars.border}`,
                color: isSel ? colorVars.premiumLight : colorVars.fg,
                fontSize: 12, fontWeight: isSel ? 700 : 500,
                cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
