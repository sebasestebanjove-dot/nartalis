"use client";

import type { DermoProduct, UserType } from '../types';
import SkinTypeBadge from './SkinTypeBadge';
import { colorVars } from '../styles';

export default function ProductCard({ product, onClick, userType }: { product: DermoProduct; onClick: () => void; userType: UserType }) {
  const isPremium = userType === 'premium';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', padding: '1rem',
        background: colorVars.surface, borderRadius: 14,
        cursor: 'pointer', transition: 'transform 0.15s, border-color 0.15s',
        minHeight: 200, position: 'relative', overflow: 'hidden',
        border: `1px solid ${colorVars.border}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = colorVars.borderHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.borderColor = colorVars.border;
      }}
    >
      {product.premium_required && !isPremium && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
          color: '#fff', fontSize: 9, fontWeight: 700,
          padding: '0.15rem 0.4rem', borderRadius: 6,
          textTransform: 'uppercase', letterSpacing: '0.3px', zIndex: 2,
        }}>
          Premium
        </div>
      )}
      <div style={{
        width: '100%', height: 120, borderRadius: 8, background: colorVars.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36, marginBottom: '0.75rem', overflow: 'hidden',
      }}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <span>🧴</span>
        )}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: colorVars.fg, lineHeight: 1.3, marginBottom: '0.25rem' }}>
        {product.name}
      </div>
      {product.brand && (
        <div style={{ fontSize: 12, color: colorVars.fgMuted, marginBottom: '0.35rem' }}>
          {product.brand.name}
        </div>
      )}
      {product.skin_types && product.skin_types.length > 0 && (
        <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
          {product.skin_types.slice(0, 2).map((st) => (
            <SkinTypeBadge key={st} type={st} />
          ))}
        </div>
      )}
    </div>
  );
}
