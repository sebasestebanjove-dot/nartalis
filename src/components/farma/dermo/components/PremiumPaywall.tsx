"use client";

import { Sparkles, Lock, Crown, Check } from 'lucide-react';
import type { UserType } from '../types';
import { colorVars } from '../styles';

interface PremiumPaywallProps {
  userType: UserType;
  onActivate?: () => void;
  message?: string;
}

export default function PremiumPaywall({ userType, onActivate, message }: PremiumPaywallProps) {
  const isPremium = userType === 'premium';

  if (isPremium) {
    return (
      <div style={{
        margin: '1.5rem 0', padding: '1.25rem 2rem',
        background: `linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))`,
        border: `2px solid rgba(16,185,129,0.3)`, borderRadius: 20, textAlign: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Check size={20} color={colorVars.success} />
          <span style={{ fontSize: 18, fontWeight: 700, color: colorVars.success }}>Premium activo</span>
        </div>
        <p style={{ fontSize: 14, color: colorVars.fgMuted, margin: 0 }}>Tienes acceso completo a toda la información.</p>
      </div>
    );
  }

  return (
    <div style={{
      margin: '1.5rem 0', padding: '2rem',
      background: `linear-gradient(135deg, ${colorVars.premiumGlow}, rgba(167,139,250,0.1))`,
      border: `2px solid rgba(124,58,237,0.3)`, borderRadius: 20, textAlign: 'center',
    }}>
      <Lock size={32} color={colorVars.premiumLight} style={{ marginBottom: '0.75rem' }} />
      <div style={{ fontSize: 22, fontWeight: 800, color: colorVars.premiumLight, marginBottom: '0.5rem' }}>
        Información exclusiva
      </div>
      <p style={{ fontSize: 15, color: colorVars.fgMuted, marginBottom: '1.25rem', lineHeight: 1.5 }}>
        {message || 'Desbloquea el análisis completo de ingredientes, contraindicaciones y la opinión de nuestra IA experta en dermofarmacia.'}
      </p>
      <div style={{ fontSize: 32, fontWeight: 800, color: colorVars.fg, marginBottom: '0.25rem' }}>
        5 €
      </div>
      <div style={{ fontSize: 14, color: colorVars.fgMuted, marginBottom: '1.25rem' }}>
        /mes — Cancela cuando quieras
      </div>
      {onActivate && (
        <button
          onClick={onActivate}
          aria-label="Hazte Premium"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.85rem 2rem', borderRadius: 14, border: 'none',
            background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
            color: '#fff', fontSize: 18, fontWeight: 700,
            cursor: 'pointer', minHeight: 52, fontFamily: 'inherit',
            transition: 'opacity 0.15s',
          }}
        >
          <Sparkles size={20} />
          Hazte Premium
        </button>
      )}
    </div>
  );
}
