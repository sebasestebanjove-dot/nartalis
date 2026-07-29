"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, Loader2, Eye, EyeOff, ArrowLeft, Search, MapPin,
  Crown, Zap, FlaskConical, Droplets,
  TrendingUp, AlertTriangle, Lock, CheckCircle,
} from 'lucide-react';
import { logDermoSearch, analyzeDermoProduct } from './api';
import { colorVars } from './styles';

function getGuestId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('dermo_guest_id');
  if (!id) {
    id = 'guest_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem('dermo_guest_id', id);
  }
  return id;
}

type ViewState = 'choose' | 'register' | 'login';
type ActiveTab = 'inci' | 'diagnosis';

/* ── INCI mock data ── */
const EXAMPLE_PRODUCT = 'Crema Anti-acné Comercial';

/* ── Telemetry ── */
function logEvent(event: string, metadata?: Record<string, unknown>) {
  fetch('/api/dermo/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, metadata, timestamp: new Date().toISOString() }),
    keepalive: true,
  }).catch(() => {});
}

export default function DermoPaywallScreen({ initialView = 'choose', onClose }: { initialView?: ViewState; onClose?: () => void }) {
  const [view, setView] = useState<ViewState>(initialView);
  const [intent, setIntent] = useState<'free' | 'premium'>('free');
  const [activeTab, setActiveTab] = useState<ActiveTab>('inci');
  const router = useRouter();
  const guestId = useRef<string>('');

  useEffect(() => { guestId.current = getGuestId(); }, []);

  /* ── Tab A: INCI Scanner ── */
  const [inciStatus, setInciStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [inciQuery, setInciQuery] = useState('');
  const [inciError, setInciError] = useState('');
  const [inciResult, setInciResult] = useState<{
    productName: string;
    ingredients: { name: string; verdict: string; note: string }[];
    total: number;
    safe: number;
    caution: number;
    avoid: number;
  } | null>(null);

  /* ── Tab B: Express Diagnosis ── */
  const [diagStep, setDiagStep] = useState(0);
  const [diagSkin, setDiagSkin] = useState<string | null>(null);
  const [diagConcern, setDiagConcern] = useState<string | null>(null);
  const [diagSensitivity, setDiagSensitivity] = useState<string | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagDone, setDiagDone] = useState(false);

  const handleChoose = (i: 'free' | 'premium') => {
    setIntent(i);
    setView('register');
  };

  const analyzeProduct = async (productName: string) => {
    if (inciStatus === 'loading') return;
    logEvent('inci_search', { product: productName });
    setInciQuery(productName);
    setInciStatus('loading');
    setInciResult(null);
    setInciError('');

    try {
      const result = await analyzeDermoProduct(productName);
      setInciResult(result);
      setInciStatus('success');
      logDermoSearch({
        productName,
        ingredientsTeaser: `${result.total} ingredientes, ${result.avoid} peligrosos`,
        totalIngredients: result.total,
        dangerousCount: result.avoid,
        guestId: guestId.current,
      });
    } catch (err: any) {
      setInciError(err.message || 'No hemos podido analizar este producto.');
      setInciStatus('idle');
    }
  };

  const runInciExample = () => {
    setInciQuery(EXAMPLE_PRODUCT);
    analyzeProduct(EXAMPLE_PRODUCT);
  };

  const handleInciSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inciQuery.trim()) return;
    analyzeProduct(inciQuery.trim());
  };

  /* ── Diagnosis Q&A ── */
  const SKIN_TYPES = [
    { id: 'dry', label: 'Seca', emoji: '🏜️' },
    { id: 'oily', label: 'Grasa', emoji: '💧' },
    { id: 'mixed', label: 'Mixta', emoji: '⚖️' },
    { id: 'sensitive', label: 'Sensible', emoji: '🛡️' },
  ];
  const CONCERNS = [
    { id: 'acne', label: 'Acné / Imperfecciones', emoji: '🔴' },
    { id: 'aging', label: 'Arrugas / Flacidez', emoji: '⏳' },
    { id: 'spots', label: 'Manchas / Hiperpigmentación', emoji: '🌑' },
    { id: 'redness', label: 'Rosácea / Rojos', emoji: '🥵' },
  ];
  const SENSITIVITIES = [
    { id: 'low', label: 'Poco sensible', emoji: '🟢' },
    { id: 'moderate', label: 'Moderada', emoji: '🟡' },
    { id: 'high', label: 'Muy sensible', emoji: '🔴' },
  ];

  const handleSkinAnswer = (step: number, value: string) => {
    logEvent('diagnosis_step', { step, value });
    if (step === 0) { setDiagSkin(value); setDiagStep(1); }
    else if (step === 1) { setDiagConcern(value); setDiagStep(2); }
    else if (step === 2) {
      setDiagSensitivity(value);
      setDiagLoading(true);
      logEvent('diagnosis_completed', { skin: diagSkin, concern: diagConcern, sensitivity: value });
      setTimeout(() => {
        setDiagLoading(false);
        setDiagDone(true);
      }, 1800);
    }
  };

  const resetDiagnosis = () => {
    setDiagStep(0);
    setDiagSkin(null);
    setDiagConcern(null);
    setDiagSensitivity(null);
    setDiagLoading(false);
    setDiagDone(false);
  };

  const showAuth = view === 'login' || view === 'register';

  return (
    <div style={{
      background: colorVars.bg, color: colorVars.fg,
      minHeight: '100%', position: 'relative',
    }}>
      <style>{`
        @keyframes dermoBlink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes dermoFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dermoSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dermoFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes dermoPulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes dermoSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes dermoProgress { from { width: 0%; } to { width: 100%; } }
        @keyframes dermoPinBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes dermoShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>

      {/* ── HERO + TABS ── */}
      {!showAuth && (
        <div style={{
          padding: '1.5rem 1rem 2.5rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          {/* Nav */}
          <div style={{
            width: '100%', maxWidth: 640,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '1.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={14} color="#fff" />
              </div>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Dermofarmacia <span style={{ color: colorVars.premiumLight }}>IA</span></span>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                onClick={() => setView('login')}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: `1px solid ${colorVars.border}`,
                  background: 'transparent', color: colorVars.fgMuted,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                Iniciar sesión
              </button>
              <button
                onClick={() => handleChoose('free')}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: 'none',
                  background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                  color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'opacity 0.15s',
                }}
              >
                Crear Cuenta Gratis
              </button>
            </div>
          </div>

          {/* ── Hero Title ── */}
          <div style={{ maxWidth: 640, width: '100%', textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 style={{
              fontSize: 32, fontWeight: 800, lineHeight: 1.15, margin: '0 0 0.5rem',
              letterSpacing: '-0.02em',
            }}>
              Tu Dermofarmacéutico <span style={{ color: colorVars.premiumLight }}>IA</span> Personal
            </h1>
            <p style={{
              fontSize: 15, color: colorVars.fgMuted, lineHeight: 1.5, margin: 0,
              maxWidth: 500, marginLeft: 'auto', marginRight: 'auto',
            }}>
              Analiza ingredientes, diagnostica tu piel y encuentra productos en farmacias de tu zona.
            </p>
          </div>

          {/* ── TABS ── */}
          <div style={{ maxWidth: 640, width: '100%', marginBottom: '1.25rem' }}>
            <div style={{
              display: 'flex', gap: 0,
              background: colorVars.surface, borderRadius: 12,
              border: `1px solid ${colorVars.border}`,
              overflow: 'hidden',
            }}>
              <button
                onClick={() => { setActiveTab('inci'); logEvent('tab_switch', { tab: 'inci' }); }}
                style={{
                  flex: 1, padding: '10px 12px', border: 'none', cursor: 'pointer',
                  background: activeTab === 'inci' ? colorVars.surfaceHover : 'transparent',
                  color: activeTab === 'inci' ? colorVars.fg : colorVars.fgDim,
                  fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                <FlaskConical size={14} />
                Analizar Ingredientes
                {activeTab === 'inci' && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: '20%', width: '60%', height: 2,
                    background: `linear-gradient(90deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                    borderRadius: 1,
                  }} />
                )}
              </button>
              <button
                onClick={() => { setActiveTab('diagnosis'); logEvent('tab_switch', { tab: 'diagnosis' }); }}
                style={{
                  flex: 1, padding: '10px 12px', border: 'none', cursor: 'pointer',
                  background: activeTab === 'diagnosis' ? colorVars.surfaceHover : 'transparent',
                  color: activeTab === 'diagnosis' ? colorVars.fg : colorVars.fgDim,
                  fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                <Droplets size={14} />
                Diagnóstico Express
                {activeTab === 'diagnosis' && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: '20%', width: '60%', height: 2,
                    background: `linear-gradient(90deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                    borderRadius: 1,
                  }} />
                )}
              </button>
            </div>
          </div>

          {/* ── TAB A: INCI Scanner ── */}
          {activeTab === 'inci' && (
            <div style={{
              maxWidth: 640, width: '100%',
              background: colorVars.surface, borderRadius: 16,
              border: `1px solid ${colorVars.border}`,
              overflow: 'hidden', marginBottom: '1.25rem',
              animation: 'dermoSlideUp 0.3s ease-out',
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0.7rem 0.85rem',
                borderBottom: `1px solid ${colorVars.border}`,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Search size={12} color="#fff" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>¿Qué contiene tu cosmético?</span>
              </div>

              {/* Body */}
              <div style={{ padding: '0.85rem' }}>
                {inciStatus === 'idle' && (
                  <>
                    <form onSubmit={handleInciSubmit} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                      <input
                        value={inciQuery}
                        onChange={e => setInciQuery(e.target.value)}
                        placeholder="Introduce el nombre de tu cosmético o pega sus ingredientes..."
                        style={{
                          flex: 1, fontSize: 13, padding: '0.65rem 0.85rem',
                          borderRadius: 10, border: `1px solid ${colorVars.border}`,
                          background: colorVars.bg, color: colorVars.fg, outline: 'none',
                          fontFamily: 'inherit',
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!inciQuery.trim()}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                          padding: '0.65rem 1.1rem', borderRadius: 10, border: 'none',
                          background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                          color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          fontFamily: 'inherit',
                          opacity: !inciQuery.trim() ? 0.5 : 1,
                        }}
                      >
                        <Search size={14} /> Analizar
                      </button>
                    </form>
                    <button
                      onClick={runInciExample}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 20,
                        border: `1px solid ${colorVars.border}`,
                        background: colorVars.bg, color: colorVars.fgMuted,
                        fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = `${colorVars.premiumLight}40`; e.currentTarget.style.background = 'rgba(124,58,237,0.06)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = colorVars.border; e.currentTarget.style.background = colorVars.bg }}
                    >
                      💡 Probar ejemplo: {EXAMPLE_PRODUCT}
                    </button>
                    {inciError && (
                      <div style={{
                        fontSize: 12, color: colorVars.danger, textAlign: 'center',
                        marginTop: '0.4rem', padding: '0.4rem', borderRadius: 8,
                        background: 'rgba(239,68,68,0.08)',
                      }}>
                        {inciError}
                      </div>
                    )}
                    <p style={{ fontSize: 12, color: colorVars.fgDim, textAlign: 'center', margin: '0.6rem 0 0' }}>
                      Analizamos los componentes de tus productos y detectamos al instante ingredientes seguros, irritantes o que causan acné
                    </p>
                  </>
                )}

                {inciStatus === 'loading' && (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 12, padding: '2rem 1rem', minHeight: 140,
                  }}>
                    <div style={{ position: 'relative', width: 40, height: 40 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        border: `2px solid ${colorVars.border}`,
                        borderTopColor: colorVars.premiumLight,
                        animation: 'dermoSpin 0.8s linear infinite',
                      }} />
                      <FlaskConical size={14} color={colorVars.premiumLight} style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                      }} />
                    </div>
                    <span style={{ fontSize: 13, color: colorVars.fgMuted, fontWeight: 500 }}>
                      Analizando &ldquo;{inciQuery}&rdquo;...
                    </span>
                  </div>
                )}

                {inciStatus === 'success' && inciResult && (
                  <div style={{ position: 'relative', minHeight: 220 }}>
                    {/* Teaser summary with real data */}
                    <div style={{
                      marginBottom: '0.75rem', padding: '0.75rem', borderRadius: 10,
                      background: `linear-gradient(135deg, ${colorVars.premiumGlow}, rgba(167,139,250,0.04))`,
                      border: `1px solid rgba(124,58,237,0.15)`,
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Resumen del análisis</div>
                      <div style={{ fontSize: 12, color: colorVars.fgMuted, lineHeight: 1.5, marginBottom: '0.5rem' }}>
                        {inciResult.productName} contiene <strong style={{ color: colorVars.fg }}>{inciResult.total} ingredientes</strong> en total, de los cuales{' '}
                        <strong style={{ color: colorVars.danger }}>{inciResult.avoid} son potencialmente peligrosos</strong>
                        {' '}para tu piel.
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <div style={{ flex: 1, padding: '6px 8px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', textAlign: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: colorVars.success }}>{inciResult.safe}</div>
                          <div style={{ fontSize: 10, color: colorVars.success }}>Seguros</div>
                        </div>
                        <div style={{ flex: 1, padding: '6px 8px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', textAlign: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: colorVars.warning }}>{inciResult.caution}</div>
                          <div style={{ fontSize: 10, color: colorVars.warning }}>Precaución</div>
                        </div>
                        <div style={{ flex: 1, padding: '6px 8px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', textAlign: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: colorVars.danger }}>{inciResult.avoid}</div>
                          <div style={{ fontSize: 10, color: colorVars.danger }}>Evitar</div>
                        </div>
                      </div>
                    </div>

                    {/* Blurred map + conversion overlay */}
                    <div style={{
                      position: 'relative', borderRadius: 10, overflow: 'hidden',
                      border: `1px solid ${colorVars.border}`,
                    }}>
                      <div style={{
                        padding: '0.75rem', filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none',
                        background: colorVars.bg,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <MapPin size={14} color={colorVars.success} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: colorVars.fg }}>Hay stock de la alternativa recomendada en tu CP</span>
                        </div>
                        <div style={{
                          width: '100%', height: 80, borderRadius: 8,
                          background: `linear-gradient(135deg, ${colorVars.surfaceHover}, ${colorVars.surface})`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: 6, fontSize: 12, color: colorVars.fgDim,
                        }}>
                          <MapPin size={16} style={{ color: colorVars.success, animation: 'dermoPinBounce 2s ease-in-out infinite' }} />
                          <span>Farmacia Sta. Mª del Mar — 1,2 km · Stock: 3 uds.</span>
                          <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: colorVars.success, fontSize: 10, fontWeight: 700 }}>Disponible</span>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 11, color: colorVars.fgDim }}>
                          <span>📍 Farmacia Central — 2,5 km · Stock: 1 ud.</span>
                        </div>
                      </div>

                      {/* Overlay */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        gap: '0.6rem',
                        background: 'linear-gradient(to top, rgba(10,10,11,0.95) 40%, rgba(10,10,11,0.6) 100%)',
                        animation: 'dermoFadeIn 0.3s ease-out',
                      }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 10,
                          background: `${colorVars.premiumGlow}`,
                          border: `1px solid rgba(124,58,237,0.2)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Lock size={18} color={colorVars.premiumLight} />
                        </div>
                        <div style={{ fontSize: 13, color: colorVars.fgMuted, textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
                          Regístrate gratis para ver el detalle completo de ingredientes, el mapa de farmacias cercanas en tu CP y guardar este análisis en tu perfil
                        </div>
                        <button
                          onClick={() => handleChoose('free')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '0.6rem 1.4rem', borderRadius: 10, border: 'none',
                            background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          <Zap size={14} /> Crear cuenta gratis
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB B: Express Diagnosis ── */}
          {activeTab === 'diagnosis' && (
            <div style={{
              maxWidth: 640, width: '100%',
              background: colorVars.surface, borderRadius: 16,
              border: `1px solid ${colorVars.border}`,
              overflow: 'hidden', marginBottom: '1.25rem',
              animation: 'dermoSlideUp 0.3s ease-out',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0.7rem 0.85rem',
                borderBottom: `1px solid ${colorVars.border}`,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Droplets size={12} color="#fff" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Diagnóstico Express (3 pasos)</span>
                {!diagDone && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: colorVars.fgDim }}>
                    Paso {diagStep + 1}/3
                  </span>
                )}
              </div>

              <div style={{ padding: '0.85rem', minHeight: 200 }}>
                {/* Progress bar */}
                {!diagDone && (
                  <div style={{
                    height: 3, borderRadius: 2, marginBottom: '0.75rem',
                    background: colorVars.border, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${((diagStep) / 3) * 100}%`,
                      background: `linear-gradient(90deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                )}

                {diagLoading && (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 12, padding: '2rem 1rem',
                  }}>
                    <Loader2 size={24} style={{ animation: 'dermoBlink 0.8s linear infinite', color: colorVars.premiumLight }} />
                    <div style={{
                      width: '80%', height: 4, borderRadius: 2,
                      background: colorVars.border, overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 2,
                        background: `linear-gradient(90deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                        animation: 'dermoProgress 1.8s ease-out forwards',
                      }} />
                    </div>
                    <span style={{ fontSize: 13, color: colorVars.fgMuted }}>
                      La IA está calculando tu perfil dermatológico...
                    </span>
                  </div>
                )}

                {diagDone && (
                  <div style={{ position: 'relative', minHeight: 200 }}>
                    <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'rgba(16,185,129,0.15)', margin: '0 auto 0.4rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <CheckCircle size={18} color={colorVars.success} />
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>Tu Perfil Dermatológico</div>
                      <div style={{ fontSize: 12, color: colorVars.fgDim }}>
                        {SKIN_TYPES.find(t => t.id === diagSkin)?.label} · {CONCERNS.find(c => c.id === diagConcern)?.label}
                      </div>
                    </div>

                    {/* Blurred routine preview */}
                    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{
                        padding: '0.75rem', filter: 'blur(6px)', userSelect: 'none', pointerEvents: 'none',
                        background: colorVars.bg,
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: colorVars.fg }}>🌅 Rutina AM</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                          {['Limpiador suave', 'Sérum de Niacinamida', 'Hidratante oil-free', 'Protector solar SPF50'].map((s, i) => (
                            <div key={i} style={{ fontSize: 11, color: colorVars.fgMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ width: 4, height: 4, borderRadius: '50%', background: colorVars.fgDim }} />
                              {s}
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: colorVars.fg }}>🌙 Rutina PM</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {['Limpiador bifásico', 'Ácido Salicílico (alternar)', 'Retinol 0.3%', 'Crema reparadora'].map((s, i) => (
                            <div key={i} style={{ fontSize: 11, color: colorVars.fgMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ width: 4, height: 4, borderRadius: '50%', background: colorVars.fgDim }} />
                              {s}
                            </div>
                          ))}
                        </div>
                        <div style={{
                          marginTop: 8, padding: 6, borderRadius: 6,
                          background: 'rgba(16,185,129,0.08)',
                          fontSize: 11, color: colorVars.success, textAlign: 'center',
                        }}>
                          Tu rutina incluye 2 productos disponibles en las farmacias de tu zona
                        </div>
                      </div>

                      {/* Overlay */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        gap: '0.6rem',
                        background: 'linear-gradient(to top, rgba(10,10,11,0.96) 40%, rgba(10,10,11,0.5) 100%)',
                        animation: 'dermoFadeIn 0.3s ease-out',
                      }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 10,
                          background: `${colorVars.premiumGlow}`,
                          border: `1px solid rgba(124,58,237,0.2)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Crown size={18} color={colorVars.premiumLight} />
                        </div>
                        <div style={{ fontSize: 13, color: colorVars.fgMuted, textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
                          Desbloquea tu rutina personalizada, el mapa de farmacias y alertas de incompatibilidad
                        </div>
                        <button
                          onClick={() => handleChoose('premium')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '0.65rem 1.5rem', borderRadius: 10, border: 'none',
                            background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          <Crown size={14} /> Desbloquear mi Rutina Premium por 5€/mes
                        </button>
                        <button
                          onClick={resetDiagnosis}
                          style={{
                            background: 'none', border: 'none', color: colorVars.fgDim,
                            fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                            textDecoration: 'underline',
                          }}
                        >
                          Volver a empezar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Questions */}
                {!diagLoading && !diagDone && (
                  <div style={{ animation: 'dermoFadeIn 0.25s ease-out' }}>
                    {diagStep === 0 && (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '0.6rem', textAlign: 'center' }}>
                          ¿Cuál es tu tipo de piel?
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {SKIN_TYPES.map(t => (
                            <button
                              key={t.id}
                              onClick={() => handleSkinAnswer(0, t.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '0.65rem 1rem', borderRadius: 10,
                                border: `1px solid ${colorVars.border}`,
                                background: colorVars.bg, color: colorVars.fg,
                                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                                fontFamily: 'inherit', textAlign: 'left',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = `${colorVars.premiumLight}40`; e.currentTarget.style.background = 'rgba(124,58,237,0.06)' }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = colorVars.border; e.currentTarget.style.background = colorVars.bg }}
                            >
                              <span style={{ fontSize: 20 }}>{t.emoji}</span>
                              <span>{t.label}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {diagStep === 1 && (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '0.6rem', textAlign: 'center' }}>
                          ¿Cuál es tu principal preocupación?
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {CONCERNS.map(c => (
                            <button
                              key={c.id}
                              onClick={() => handleSkinAnswer(1, c.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '0.65rem 1rem', borderRadius: 10,
                                border: `1px solid ${colorVars.border}`,
                                background: colorVars.bg, color: colorVars.fg,
                                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                                fontFamily: 'inherit', textAlign: 'left',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = `${colorVars.premiumLight}40`; e.currentTarget.style.background = 'rgba(124,58,237,0.06)' }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = colorVars.border; e.currentTarget.style.background = colorVars.bg }}
                            >
                              <span style={{ fontSize: 20 }}>{c.emoji}</span>
                              <span>{c.label}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {diagStep === 2 && (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '0.6rem', textAlign: 'center' }}>
                          ¿Qué nivel de sensibilidad tienes?
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {SENSITIVITIES.map(s => (
                            <button
                              key={s.id}
                              onClick={() => handleSkinAnswer(2, s.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '0.65rem 1rem', borderRadius: 10,
                                border: `1px solid ${colorVars.border}`,
                                background: colorVars.bg, color: colorVars.fg,
                                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                                fontFamily: 'inherit', textAlign: 'left',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = `${colorVars.premiumLight}40`; e.currentTarget.style.background = 'rgba(124,58,237,0.06)' }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = colorVars.border; e.currentTarget.style.background = colorVars.bg }}
                            >
                              <span style={{ fontSize: 20 }}>{s.emoji}</span>
                              <span>{s.label}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Bentō Grid (compacto, tras tabs) ── */}
          <div style={{
            maxWidth: 640, width: '100%', paddingTop: '0.5rem',
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
            }}>
              {[
                { icon: <FlaskConical size={16} />, title: 'Analizador INCI', desc: 'Escanea ingredientes al instante', accent: colorVars.premiumLight },
                { icon: <Droplets size={16} />, title: 'Rutinas AM/PM', desc: 'Plan diario con checklist', accent: colorVars.success },
                { icon: <TrendingUp size={16} />, title: 'Evolución Score', desc: 'Mide tu salud dérmica', accent: colorVars.gold },
                { icon: <AlertTriangle size={16} />, title: 'Alertas Incompatibilidad', desc: 'Evita mezclas peligrosas', accent: colorVars.danger },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: '0.75rem', borderRadius: 12,
                    background: `linear-gradient(135deg, ${item.accent}10, rgba(59,130,246,0.04))`,
                    border: `1px solid ${colorVars.border}`,
                    transition: 'all 0.2s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${item.accent}30`; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = colorVars.border; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: `${item.accent}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: item.accent, marginBottom: '0.35rem',
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: '0.1rem' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: colorVars.fgMuted, lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Dev toolbar ── */}
          <div style={{
            marginTop: '2rem', paddingTop: '1rem', borderTop: `1px dashed ${colorVars.border}`,
            width: '100%', maxWidth: 640, textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: colorVars.fgDim, fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              🛠️ Dev — Acceso rápido
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
              <a
                href="/api/dermo/auth/dev-login?email=nopremium@nopremium.com"
                onClick={() => {
                  // Save INCI state before page navigation
                  try { sessionStorage.setItem('dermo_analyze_state', JSON.stringify({ analyzeResult: inciResult, view: 'analyze', analyzeError: '' })); } catch {}
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '6px 12px', borderRadius: 8,
                  border: `1px solid ${colorVars.border}`,
                  background: colorVars.surface, color: colorVars.fgMuted,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  textDecoration: 'none', fontFamily: 'inherit',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: colorVars.fgDim }} />
                No Premium
              </a>
              <a
                href="/api/dermo/auth/dev-login?email=premium@premium.com"
                onClick={() => {
                  try { sessionStorage.setItem('dermo_analyze_state', JSON.stringify({ analyzeResult: inciResult, view: 'analyze', analyzeError: '' })); } catch {}
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '6px 12px', borderRadius: 8,
                  border: `1px solid rgba(251,191,36,0.3)`,
                  background: 'rgba(251,191,36,0.06)', color: colorVars.gold,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  textDecoration: 'none', fontFamily: 'inherit',
                }}
              >
                <Crown size={10} /> Premium
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── AUTH MODAL OVERLAY ── */}
      {showAuth && (
        <div style={{
          padding: '1.5rem 1rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          minHeight: '100%',
        }}>
          <div style={{ maxWidth: 440, width: '100%' }}>
            {view === 'login' ? (
              <LoginFormView
                onBack={() => onClose?.()}
                router={router}
              />
            ) : (
              <RegisterFormView
                intent={intent}
                onBack={() => onClose?.()}
                router={router}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Auth Sub-components ── */

function LoginFormView({ onBack, router }: {
  onBack: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const isDevUser = ['nopremium@nopremium.com', 'premium@premium.com'].includes(email.trim().toLowerCase());
    if (!email.includes('@')) { setError('Introduce un email válido'); return }
    if (!password && !isDevUser) { setError('Introduce tu contraseña'); return }
    setBusy(true);
    try {
      const res = await fetch('/api/dermo/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
      window.location.href = '/farma/dermo';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = () => {
    setGoogleBusy(true);
    window.location.href = '/api/dermo/auth/google';
  };

  return (
    <div>
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: '0.35rem',
        background: 'none', border: 'none', color: colorVars.fgDim,
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        padding: '0 0 0.75rem', fontFamily: 'inherit',
      }}>
        <ArrowLeft size={16} /> Volver
      </button>
      <div style={{ fontSize: 20, fontWeight: 700, color: colorVars.fg, marginBottom: '0.25rem' }}>
        Iniciar sesión
      </div>
      <div style={{ fontSize: 14, color: colorVars.fgMuted, marginBottom: '1.25rem', lineHeight: 1.4 }}>
        Accede a tu panel de Dermofarmacia IA.
      </div>

      <GoogleButton onClick={handleGoogle} busy={googleBusy} />
      <DividerWithText text="o inicia sesión con tu email" />

      <form onSubmit={handleEmailSubmit}>
        <Field label="Email" value={email} onChange={setEmail} placeholder="tu@email.com" type="email" />
        <PasswordField label="Contraseña" value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
        <button type="submit" disabled={busy} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
          width: '100%', padding: '0.75rem 1.25rem', borderRadius: 10, border: 'none',
          background: busy ? colorVars.surfaceHover : `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
          color: '#fff', fontSize: 15, fontWeight: 700,
          cursor: busy ? 'not-allowed' : 'pointer',
          marginTop: '1rem', fontFamily: 'inherit',
          opacity: busy ? 0.6 : 1, transition: 'opacity 0.15s',
        }}>
          {busy ? (
            <><Loader2 size={16} style={{ animation: 'dermoSpin 0.8s linear infinite' }} /> Iniciando sesión...</>
          ) : (
            'Iniciar sesión'
          )}
        </button>
        {error && <div style={{ color: colorVars.danger, fontSize: 13, marginTop: '0.6rem', textAlign: 'center' }}>{error}</div>}
      </form>
    </div>
  );
}

function RegisterFormView({ intent, onBack, router }: {
  intent: 'free' | 'premium';
  onBack: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    if (!email.includes('@')) { setError('Introduce un email válido'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (!/^\d{5}$/.test(codigoPostal.replace(/\s/g, ''))) { setError('Código postal inválido (5 dígitos)'); return }
    setBusy(true);
    try {
      const res = await fetch('/api/dermo/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), email: email.trim(), password,
          codigoPostal: codigoPostal.replace(/\s/g, ''),
          isPremium: intent === 'premium',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear cuenta');
      window.location.href = '/farma/dermo';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = () => {
    setGoogleBusy(true);
    window.location.href = '/api/dermo/auth/google';
  };

  return (
    <div>
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: '0.35rem',
        background: 'none', border: 'none', color: colorVars.fgDim,
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        padding: '0 0 0.75rem', fontFamily: 'inherit',
      }}>
        <ArrowLeft size={16} /> Volver
      </button>

      <div style={{ fontSize: 20, fontWeight: 700, color: colorVars.fg, marginBottom: '0.25rem' }}>
        {intent === 'premium' ? 'Desbloquear Premium' : 'Crear cuenta gratuita'}
      </div>
      <div style={{ fontSize: 14, color: colorVars.fgMuted, marginBottom: '1.25rem', lineHeight: 1.4 }}>
        {intent === 'premium'
          ? 'Acceso ilimitado a todas las funciones por solo 5€/mes.'
          : 'Disfruta de 2 consultas gratuitas para probar la plataforma.'}
      </div>

      <GoogleButton onClick={handleGoogle} busy={googleBusy} />
      <DividerWithText text="o regístrate con tu email" />

      <form onSubmit={handleEmailSubmit}>
        <Field label="Nombre" value={name} onChange={setName} placeholder="Tu nombre" />
        <Field label="Email" value={email} onChange={setEmail} placeholder="tu@email.com" type="email" />
        <PasswordField label="Contraseña" value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} placeholder="Mín. 6 caracteres" />
        <Field label="Código postal" value={codigoPostal} onChange={setCodigoPostal} placeholder="28001" maxLength={5} />
        <button type="submit" disabled={busy} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
          width: '100%', padding: '0.75rem 1.25rem', borderRadius: 10, border: 'none',
          background: busy
            ? colorVars.surfaceHover
            : intent === 'premium'
              ? `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`
              : `linear-gradient(135deg, ${colorVars.surfaceHover}, #3A3A3C)`,
          color: '#fff', fontSize: 15, fontWeight: 700,
          cursor: busy ? 'not-allowed' : 'pointer',
          marginTop: '1rem', fontFamily: 'inherit',
          opacity: busy ? 0.6 : 1, transition: 'opacity 0.15s',
        }}>
          {busy ? (
            <><Loader2 size={16} style={{ animation: 'dermoSpin 0.8s linear infinite' }} /> Creando cuenta...</>
          ) : intent === 'premium' ? (
            <><Crown size={16} /> Crear cuenta y activar Premium</>
          ) : (
            <><Zap size={16} /> Crear cuenta gratuita</>
          )}
        </button>
        {error && <div style={{ color: colorVars.danger, fontSize: 13, marginTop: '0.6rem', textAlign: 'center' }}>{error}</div>}
      </form>
    </div>
  );
}

/* ── UI Primitives ── */

function GoogleButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
        width: '100%', padding: '0.75rem 1.25rem', borderRadius: 10,
        border: `1px solid ${colorVars.border}`,
        background: colorVars.surface, color: colorVars.fg, fontSize: 15, fontWeight: 600,
        cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        opacity: busy ? 0.6 : 1, marginBottom: '0.85rem', transition: 'background 0.15s',
      }}
    >
      {busy ? (
        <Loader2 size={18} style={{ animation: 'dermoSpin 0.8s linear infinite' }} />
      ) : (
        <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
          <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
          <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
          <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
          <path d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.001-.001 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
        </svg>
      )}
      Continuar con Google
    </button>
  );
}

function DividerWithText({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
      <div style={{ flex: 1, height: 1, background: colorVars.border }} />
      <span style={{ fontSize: 12, color: colorVars.fgDim, whiteSpace: 'nowrap' }}>{text}</span>
      <div style={{ flex: 1, height: 1, background: colorVars.border }} />
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type, maxLength }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string; maxLength?: number;
}) {
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: colorVars.fgMuted, display: 'block', marginBottom: '0.3rem' }}>{label}</label>
      <input
        type={type || 'text'} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} maxLength={maxLength}
        style={{
          width: '100%', background: colorVars.surface, border: `1px solid ${colorVars.border}`, borderRadius: 8,
          color: colorVars.fg, fontSize: 14, padding: '0.6rem 0.75rem', outline: 'none',
          fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.15s',
        }}
      />
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: colorVars.fgMuted, display: 'block', marginBottom: '0.3rem' }}>{label}</label>
      <div style={{ background: colorVars.surface, borderRadius: 8, border: `1px solid ${colorVars.border}`, display: 'flex', alignItems: 'center' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || ''}
          style={{ flex: 1, background: 'transparent', border: 'none', color: colorVars.fg, fontSize: 14, padding: '0.6rem 0.75rem', outline: 'none', fontFamily: 'inherit' }}
        />
        <button type="button" onClick={onToggle} style={{ background: 'none', border: 'none', color: colorVars.fgDim, cursor: 'pointer', padding: '0.6rem 0.75rem', display: 'flex' }}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
