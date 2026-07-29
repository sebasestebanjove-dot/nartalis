"use client";

import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { createDermoBooking } from '../api';
import { useState } from 'react';
import { colorVars } from '../styles';

interface BookingModalProps {
  productId: string;
  pharmacyId: string;
  pharmacyName: string;
  productName: string;
  onClose: () => void;
  onDone: () => void;
}

export default function BookingModal({ productId, pharmacyId, pharmacyName, productName, onClose, onDone }: BookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pickupCode, setPickupCode] = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    const res = await createDermoBooking(productId, pharmacyId);
    setPickupCode(res.pickup_code || '');
    setResult({
      ok: res.ok,
      message: res.ok
        ? (res.message || 'Reserva solicitada con éxito. Te contactaremos para confirmar la disponibilidad.')
        : res.error || 'Error al procesar la reserva',
    });
    setLoading(false);
  };

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: colorVars.surface, borderRadius: 20,
          border: `1px solid ${colorVars.border}`,
          padding: '2rem', maxWidth: 400, width: '100%', textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colorVars.fgMuted, cursor: 'pointer', padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>

        {result ? (
          <>
            {result.ok ? (
              <CheckCircle size={48} color={colorVars.success} style={{ marginBottom: '1rem' }} />
            ) : (
              <AlertCircle size={48} color={colorVars.danger} style={{ marginBottom: '1rem' }} />
            )}
            <div style={{ fontSize: 20, fontWeight: 700, color: colorVars.fg, marginBottom: '0.75rem' }}>
              {result.ok ? '¡Reserva solicitada!' : 'Error'}
            </div>
            {result.ok && pickupCode && (
              <div style={{
                background: 'rgba(167,139,250,0.1)',
                border: `2px dashed rgba(167,139,250,0.4)`,
                borderRadius: 14, padding: '1rem', marginBottom: '1rem', textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, color: colorVars.premiumLight, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.3rem' }}>
                  Código de recogida
                </div>
                <div style={{
                  fontSize: 32, fontWeight: 800, color: colorVars.premiumLight,
                  fontFamily: 'monospace', letterSpacing: '4px',
                }}>
                  {pickupCode}
                </div>
                <div style={{ fontSize: 12, color: colorVars.fgMuted, marginTop: '0.3rem' }}>
                  Preséntalo en la farmacia al recoger tu pedido
                </div>
              </div>
            )}
            <p style={{ fontSize: 14, color: colorVars.fgMuted, marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {result.message}
            </p>
            <button
              onClick={onDone}
              style={{
                padding: '0.75rem 1.5rem', borderRadius: 12, border: 'none',
                background: result.ok ? colorVars.success : `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                color: '#fff', fontSize: 15, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {result.ok ? 'Entendido' : 'Volver'}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 24, marginBottom: '1rem' }}>💊</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: colorVars.fg, marginBottom: '0.5rem' }}>
              Confirmar reserva
            </div>
            <p style={{ fontSize: 14, color: colorVars.fgMuted, marginBottom: '0.5rem', lineHeight: 1.5 }}>
              ¿Quieres reservar <strong style={{ color: colorVars.fg }}>{productName}</strong> en:
            </p>
            <p style={{ fontSize: 16, fontWeight: 600, color: colorVars.premiumLight, marginBottom: '1.5rem' }}>
              {pharmacyName}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem', borderRadius: 12,
                  border: `2px solid ${colorVars.border}`,
                  background: 'transparent', color: colorVars.fg,
                  fontSize: 15, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1, fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem', borderRadius: 12, border: 'none',
                  background: loading ? colorVars.surfaceHover : `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                  color: '#fff', fontSize: 15, fontWeight: 600,
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.7 : 1, fontFamily: 'inherit',
                }}
              >
                {loading ? 'Procesando...' : 'Confirmar reserva'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
