"use client";

import { Search, Sparkles, FlaskConical, MessageCircle, ShoppingBag, Bot, ChevronRight, Crown } from 'lucide-react';
import { colorVars } from '../styles';
import type { UserType } from '../types';

interface DermoHomeScreenProps {
  userType: UserType;
  userEmail: string;
  consultasConsumidas: number;
  onStartSearch: () => void;
  onStartQuiz: () => void;
}

const FREE_MAX_CONSULTAS = 2;

const QUICK_ACTIONS = [
  {
    icon: <Search size={22} />,
    title: 'Buscar productos',
    desc: 'Analiza ingredientes, consulta disponibilidad en farmacias',
    action: 'onStartSearch' as const,
    gradient: `linear-gradient(135deg, ${colorVars.premiumGlow}, rgba(167,139,250,0.06))`,
  },
  {
    icon: <Sparkles size={22} />,
    title: 'Test de Piel',
    desc: 'Descubre tu tipo de piel y obtén una rutina personalizada',
    action: 'onStartQuiz' as const,
    gradient: `linear-gradient(135deg, ${colorVars.premiumGlow}, rgba(167,139,250,0.06))`,
  },
];

const FEATURES = [
  { icon: <FlaskConical size={18} />, label: 'Análisis de ingredientes' },
  { icon: <MessageCircle size={18} />, label: 'Chat con IA experta' },
  { icon: <ShoppingBag size={18} />, label: 'Disponibilidad en farmacias' },
  { icon: <Bot size={18} />, label: 'Rutinas personalizadas' },
];

export default function DermoHomeScreen({ userType, userEmail, consultasConsumidas, onStartSearch, onStartQuiz }: DermoHomeScreenProps) {
  const isPremium = userType === 'premium';
  const isFree = userType === 'free';
  const consultasRestantes = isFree ? Math.max(0, FREE_MAX_CONSULTAS - consultasConsumidas) : Infinity;

  return (
    <div style={{
      background: colorVars.bg, color: colorVars.fg,
      padding: '1.5rem 1rem', minHeight: '100%',
      maxWidth: 560, margin: '0 auto',
    }}>
      {/* Welcome */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 13, color: colorVars.fgMuted, fontWeight: 500, marginBottom: '0.15rem' }}>
          {isPremium ? '👑' : ''} Bienvenido{isPremium ? ' de vuelta' : ''}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 0.25rem', lineHeight: 1.15 }}>
          Dermofarmacia <span style={{ color: colorVars.premiumLight }}>IA</span>
        </h1>
        <p style={{ fontSize: 14, color: colorVars.fgMuted, margin: 0, lineHeight: 1.5 }}>
          Tu asistente inteligente para el cuidado de la piel.
        </p>
      </div>

      {/* Plan + consultations */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        padding: '0.75rem 1rem', borderRadius: 12,
        background: colorVars.surface, border: `1px solid ${colorVars.border}`,
        marginBottom: '1.5rem',
      }}>
        {isPremium ? (
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Crown size={18} color="#fff" />
          </div>
        ) : (
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: colorVars.premiumGlow,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            fontSize: 16,
          }}>
            ✨
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: colorVars.fg }}>
            {isPremium ? 'Plan Premium' : 'Plan Gratuito'}
          </div>
          <div style={{ fontSize: 12, color: colorVars.fgMuted }}>
            {isPremium
              ? 'Acceso ilimitado a todas las funciones'
              : `${consultasRestantes} consulta${consultasRestantes !== 1 ? 's' : ''} gratuita${consultasRestantes !== 1 ? 's' : ''} restante${consultasRestantes !== 1 ? 's' : ''}`
            }
          </div>
        </div>
        {isFree && (
          <span style={{ fontSize: 11, color: colorVars.premiumLight, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Mejorar plan →
          </span>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: colorVars.fg, marginBottom: '0.6rem' }}>
          Acciones rápidas
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {QUICK_ACTIONS.map((action, i) => (
            <button
              key={i}
              onClick={action.action === 'onStartSearch' ? onStartSearch : onStartQuiz}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.85rem',
                padding: '1rem 1.15rem', borderRadius: 14,
                background: action.gradient,
                border: `1px solid ${colorVars.border}`,
                cursor: 'pointer', textAlign: 'left', width: '100%',
                fontFamily: 'inherit', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = colorVars.border }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: `linear-gradient(135deg, ${colorVars.premiumGlow}, rgba(167,139,250,0.06))`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                color: colorVars.premiumLight,
              }}>
                {action.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: colorVars.fg }}>{action.title}</div>
                <div style={{ fontSize: 12, color: colorVars.fgMuted }}>{action.desc}</div>
              </div>
              <ChevronRight size={18} color={colorVars.fgDim} />
            </button>
          ))}
        </div>
      </div>

      {/* Features summary */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: colorVars.fg, marginBottom: '0.6rem' }}>
          Funciones disponibles
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem',
        }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              padding: '0.65rem 0.75rem', borderRadius: 10,
              background: colorVars.surface, border: `1px solid ${colorVars.border}`,
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <span style={{ color: colorVars.premiumLight, flexShrink: 0 }}>{f.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: colorVars.fgMuted }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
