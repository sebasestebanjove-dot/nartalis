"use client";

import { colorVars } from '../styles';

export default function IngredientCard({ name, description }: { name: string; description?: string | null }) {
  return (
    <div style={{
      padding: '0.75rem 1rem', background: colorVars.surface, borderRadius: 12, marginBottom: '0.5rem',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: colorVars.fg, marginBottom: '0.2rem' }}>
        {name}
      </div>
      {description && (
        <div style={{ fontSize: 13, color: colorVars.fgMuted, lineHeight: 1.4 }}>
          {description}
        </div>
      )}
    </div>
  );
}
