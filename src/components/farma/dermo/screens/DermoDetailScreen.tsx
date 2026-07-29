"use client";

import { ArrowLeft, Sparkles, AlertCircle, Crown, MessageCircle, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { DermoProduct, DermoUserRoutine, UserType } from '../types';
import { getDermoProduct } from '../api';
import { colorVars, useViewport } from '../styles';
import SkinTypeBadge from '../components/SkinTypeBadge';
import IngredientCard from '../components/IngredientCard';
import PremiumPaywall from '../components/PremiumPaywall';
import AvailabilitySearch from '../components/AvailabilitySearch';
import ChatConversation from '../components/ChatConversation';
import RoutineChat from '../components/RoutineChat';

interface DermoDetailScreenProps {
  productId: string;
  userType: UserType;
  onBack: () => void;
  onActivatePremium?: () => void;
  routineResult?: DermoUserRoutine | null;
}

export default function DermoDetailScreen({ productId, userType, onBack, onActivatePremium, routineResult }: DermoDetailScreenProps) {
  const { isDesktop } = useViewport();
  const [product, setProduct] = useState<DermoProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isPremium = userType === 'premium';

  useEffect(() => {
    setLoading(true);
    setError('');
    getDermoProduct(productId)
      .then(setProduct)
      .catch((err) => setError(err.message || 'Error al cargar producto'))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: colorVars.bg, color: colorVars.fg, padding: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '1rem' }}>
          <BackBtn onClick={onBack} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: colorVars.fg, margin: 0 }}>
            Cargando...
          </h2>
        </div>
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: colorVars.premiumLight, fontSize: 15 }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ width: 24, height: 24, border: `2px solid ${colorVars.premiumLight}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'dermoSpin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
          Cargando producto...
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ minHeight: '100vh', background: colorVars.bg, color: colorVars.fg, padding: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '1rem' }}>
          <BackBtn onClick={onBack} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: colorVars.fg, margin: 0 }}>Error</h2>
        </div>
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: colorVars.danger, fontSize: 15 }}>
          <AlertCircle size={32} style={{ marginBottom: '0.5rem' }} />
          <div>{error || 'Producto no encontrado'}</div>
        </div>
      </div>
    );
  }

  const showLimited = !isPremium && product.premium_required;

  return (
    <div style={{ minHeight: '100vh', background: colorVars.bg, color: colorVars.fg, padding: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '1rem' }}>
        <BackBtn onClick={onBack} />
        <h2 style={{ fontSize: 18, fontWeight: 700, color: colorVars.fg, margin: 0 }}>{product.name}</h2>
      </div>

      <div style={{
        maxWidth: 520, margin: '0 auto',
        ...(isDesktop ? { maxWidth: 960, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' } : {}),
      }}>
        {/* Left column */}
        <div>
          {/* Image */}
          <div style={{
            width: '100%', maxWidth: 180, height: 180, borderRadius: 16,
            background: colorVars.surface, margin: '0 auto 1.25rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56,
            overflow: 'hidden', border: `1px solid ${colorVars.border}`,
          }}>
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span>🧴</span>
            )}
          </div>

          {/* Name & brand */}
          <div style={{ fontSize: 22, fontWeight: 800, color: colorVars.fg, lineHeight: 1.25, marginBottom: '0.2rem' }}>
            {product.name}
          </div>
          {product.brand && (
            <div style={{ fontSize: 14, color: colorVars.fgMuted, marginBottom: '0.75rem' }}>
              {product.brand.name}
            </div>
          )}

          {/* Skin types */}
          {product.skin_types && product.skin_types.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: colorVars.fg, marginBottom: '0.5rem' }}>
                Tipo de piel
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {product.skin_types.map((st) => (
                  <SkinTypeBadge key={st} type={st} />
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: colorVars.fg, marginBottom: '0.5rem' }}>
                Descripción
              </div>
              <div style={{
                padding: '0.85rem 1rem', background: colorVars.surface,
                borderRadius: 12, border: `1px solid ${colorVars.border}`,
                fontSize: 14, color: colorVars.fgMuted, lineHeight: 1.6,
              }}>
                {product.description}
              </div>
            </div>
          )}

          {/* Ingredients */}
          {product.ingredients && product.ingredients.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: colorVars.fg, marginBottom: '0.5rem' }}>
                Ingredientes
                {product.has_more && (
                  <span style={{ fontSize: 12, color: colorVars.premiumLight, fontWeight: 400, marginLeft: '0.5rem' }}>
                    (mostrando 2 de {product.ingredients.length})
                  </span>
                )}
              </div>
              <div style={showLimited ? { filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' } : undefined}>
                {product.ingredients.map((ing, i) => (
                  <IngredientCard key={i} name={ing} />
                ))}
              </div>
            </div>
          )}

          {/* Premium paywall */}
          {showLimited && (
            <PremiumPaywall
              userType={userType}
              onActivate={onActivatePremium}
              message={product.message || 'Desbloquea el análisis completo de ingredientes, contraindicaciones y la opinión de nuestra IA experta en dermofarmacia.'}
            />
          )}

          {/* Analysis */}
          {product.analysis && !showLimited && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: colorVars.fg, marginBottom: '0.5rem' }}>
                Análisis IA
              </div>
              <div style={{
                padding: '0.85rem 1rem', background: colorVars.surface,
                borderRadius: 12, border: `1px solid ${colorVars.border}`,
                fontSize: 14, color: colorVars.fgMuted, lineHeight: 1.6,
              }}>
                {typeof product.analysis === 'string'
                  ? product.analysis
                  : JSON.stringify(product.analysis, null, 2)}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div>
          {/* Availability */}
          <AvailabilitySearch productId={productId} />

          {/* Routine Chat (premium with routine) */}
          {isPremium && routineResult?.is_completed && (
            <RoutineChat routine={routineResult} userType={userType} />
          )}

          {/* AI Chat */}
          <ChatConversation
            productName={product.name}
            userType={userType}
            onActivatePremium={onActivatePremium}
          />
        </div>
      </div>
    </div>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Volver"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 40, height: 40, borderRadius: 10,
        border: `1px solid ${colorVars.border}`,
        background: colorVars.surface, color: colorVars.fg,
        cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s',
      }}
    >
      <ArrowLeft size={20} />
    </button>
  );
}
