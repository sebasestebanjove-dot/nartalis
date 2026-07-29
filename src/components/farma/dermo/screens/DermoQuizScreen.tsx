"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Crown, ChevronRight, Check } from 'lucide-react';
import type { DermoQuizQuestion, DermoUserRoutine, UserType } from '../types';
import { getQuizQuestions, generateRoutine } from '../api';
import { colorVars } from '../styles';

interface Props {
  userType: UserType;
  onBack: () => void;
  onComplete: (result: DermoUserRoutine) => void;
  onActivatePremium: () => void;
}

export default function DermoQuizScreen({ userType, onBack, onComplete, onActivatePremium }: Props) {
  const [questions, setQuestions] = useState<DermoQuizQuestion[]>([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const isPremium = userType === 'premium';

  useEffect(() => {
    getQuizQuestions()
      .then(qs => setQuestions(qs.sort((a, b) => a.step - b.step)))
      .catch(() => setError('Error al cargar preguntas'))
      .finally(() => setLoading(false));
  }, []);

  const current = questions[step];

  const handleAnswer = (fieldKey: string, value: any) => {
    setAnswers(prev => ({ ...prev, [fieldKey]: value }));
  };

  const handleNext = () => {
    if (step < questions.length - 1) {
      setStep(s => s + 1);
    } else {
      setShowSubmitConfirmation(true);
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const result = await generateRoutine(answers);
      onComplete(result);
    } catch (err: any) {
      setError(err.message || 'Error al generar rutina');
    } finally {
      setSubmitting(false);
      setShowSubmitConfirmation(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        height: '100%', background: colorVars.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: colorVars.fgMuted, fontSize: 15,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 24, height: 24, border: `2px solid ${colorVars.premiumLight}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'dermoSpin 0.8s linear infinite', margin: '0 auto 0.75rem' }} />
          Cargando test...
        </div>
      </div>
    );
  }

  const progressPercent = questions.length > 0 ? ((step + 1) / questions.length) * 100 : 0;

  const isNextDisabled = () => {
    if (!current) return true;
    if (current.type === 'multiple') return (answers[current.field_key] || []).length === 0;
    return !answers[current.field_key];
  };

  return (
    <div style={{ height: '100%', background: colorVars.bg, color: colorVars.fg, display: 'flex', flexDirection: 'column' }}>
      {/* Sticky header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '1rem 1.25rem', borderBottom: `1px solid ${colorVars.border}`,
        position: 'sticky', top: 0, background: colorVars.bg, zIndex: 10,
      }}>
        <button
          onClick={onBack}
          aria-label="Volver"
          style={{
            padding: '0.5rem', borderRadius: 12,
            border: `2px solid ${colorVars.border}`,
            background: colorVars.surface, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: colorVars.fg,
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: colorVars.fg, flex: 1, textAlign: 'center' }}>
          Test de Piel
        </h2>
        {isPremium && (
          <Crown size={20} color={colorVars.premiumLight} />
        )}
      </div>
      {!isPremium && (
        <button
          onClick={onActivatePremium}
          aria-label="Activar Premium"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 20, border: 'none',
            background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            fontFamily: 'inherit',
          }}
        >
          <Crown size={12} /> Premium
        </button>
      )}

      {/* Progress bar */}
      <div style={{ width: '100%', height: 4, background: colorVars.surfaceHover }}>
        <div style={{
          width: `${progressPercent}%`, height: '100%',
          background: `linear-gradient(90deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
          borderRadius: '0 2px 2px 0', transition: 'width 0.3s ease',
        }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.25rem', maxWidth: 550, margin: '0 auto' }}>
        {error && (
          <div style={{ color: colorVars.danger, fontSize: 14, marginBottom: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {current && (
          <>
            {/* Question header */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: colorVars.premiumLight,
                textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem',
              }}>
                Paso {step + 1} de {questions.length}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: colorVars.fg, margin: 0, lineHeight: 1.3 }}>
                {current.question}
              </h2>
            </div>

            {/* Options based on type */}
            {current.type === 'text' ? (
              <textarea
                value={answers[current.field_key] || ''}
                onChange={e => handleAnswer(current.field_key, e.target.value)}
                placeholder="Escribe tu respuesta..."
                aria-label="Escribe tu respuesta"
                style={{
                  width: '100%', minHeight: 100, fontSize: 15, padding: '0.85rem 1rem',
                  borderRadius: 14, border: `2px solid ${colorVars.border}`,
                  background: colorVars.surface, color: colorVars.fg,
                  outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                  boxSizing: 'border-box', transition: 'border-color 0.15s',
                }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(current.options || []).map((opt, i) => {
                  const selected = current.type === 'multiple'
                    ? (answers[current.field_key] || []).includes(opt.value)
                    : answers[current.field_key] === opt.value;

                  const handleClick = () => {
                    if (current.type === 'multiple') {
                      const prev: string[] = answers[current.field_key] || [];
                      const next = selected
                        ? prev.filter(v => v !== opt.value)
                        : [...prev, opt.value];
                      handleAnswer(current.field_key, next);
                    } else {
                      handleAnswer(current.field_key, opt.value);
                    }
                  };

                  return (
                    <button
                      key={i}
                      onClick={handleClick}
                      aria-pressed={selected}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '1rem 1.25rem', borderRadius: 14,
                        border: selected ? `2px solid ${colorVars.premiumLight}` : `2px solid ${colorVars.border}`,
                        background: selected ? 'rgba(167,139,250,0.1)' : colorVars.surface,
                        color: colorVars.fg, fontSize: 15, fontWeight: 500,
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                        transition: 'all 0.15s', fontFamily: 'inherit',
                      }}
                    >
                      {opt.icon && <span style={{ fontSize: 24, flexShrink: 0 }}>{opt.icon}</span>}
                      <span style={{ flex: 1 }}>{opt.label}</span>
                      {selected && (
                        <span style={{ color: colorVars.premiumLight, flexShrink: 0 }}>
                          <Check size={16} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
              {step > 0 && (
                <button
                  onClick={handlePrev}
                  style={{
                    flex: 1, padding: '0.85rem', borderRadius: 14,
                    border: `2px solid ${colorVars.border}`,
                    background: colorVars.surface, color: colorVars.fg,
                    fontSize: 15, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
                >
                  Anterior
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={isNextDisabled()}
                style={{
                  flex: 1, padding: '0.85rem', borderRadius: 14, border: 'none',
                  background: !isNextDisabled()
                    ? `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`
                    : colorVars.surfaceHover,
                  color: !isNextDisabled() ? '#fff' : colorVars.fgDim,
                  fontSize: 15, fontWeight: 700,
                  cursor: !isNextDisabled() ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                  minWidth: step === 0 ? '100%' : undefined,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                }}
              >
                {step < questions.length - 1 ? (
                  <>Siguiente <ChevronRight size={16} /></>
                ) : (
                  'Obtener mi rutina'
                )}
              </button>
            </div>
          </>
        )}

        {/* Submit confirmation dialog */}
        {showSubmitConfirmation && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)', padding: '1rem',
            animation: 'dermoFadeIn 0.15s ease-out',
          }}>
            <div style={{
              background: colorVars.surface, borderRadius: 20,
              padding: '2rem', maxWidth: 380, width: '100%', textAlign: 'center',
              border: `1px solid ${colorVars.border}`,
            }}>
              <div style={{ fontSize: 40, marginBottom: '1rem' }}>✨</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: colorVars.fg, margin: '0 0 0.5rem' }}>
                ¿Listo para tu rutina?
              </h3>
              <p style={{ fontSize: 14, color: colorVars.fgMuted, margin: '0 0 1.5rem', lineHeight: 1.5 }}>
                {isPremium
                  ? 'Vamos a generar una rutina personalizada con IA basada en tus respuestas.'
                  : 'Los usuarios Premium reciben una rutina completa con productos recomendados. Los usuarios gratuitos reciben solo un resumen básico.'}
              </p>
              {!isPremium && (
                <div style={{
                  padding: '0.75rem 1rem', borderRadius: 12,
                  background: colorVars.premiumGlow, border: `1px solid rgba(124,58,237,0.3)`,
                  marginBottom: '1.25rem', fontSize: 14, color: colorVars.premiumLight, lineHeight: 1.5,
                }}>
                  <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Activa Premium para recibir una rutina detallada con productos seleccionados por IA.
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowSubmitConfirmation(false)}
                  style={{
                    padding: '0.75rem 1.25rem', borderRadius: 12,
                    border: `2px solid ${colorVars.border}`,
                    background: 'transparent', color: colorVars.fgMuted,
                    fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    padding: '0.75rem 1.5rem', borderRadius: 12, border: 'none',
                    background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                    color: '#fff', fontSize: 15, fontWeight: 700,
                    cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {submitting ? 'Generando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading overlay during routine generation */}
        {submitting && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 70,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
            padding: '1rem', animation: 'dermoFadeIn 0.2s ease-out',
          }}>
            <div style={{
              background: colorVars.surface, borderRadius: 16,
              border: `1px solid ${colorVars.border}`,
              padding: '1.5rem', maxWidth: 380, width: '100%', textAlign: 'center',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', margin: '0 auto 1rem',
                border: `3px solid ${colorVars.surfaceHover}`,
                borderTopColor: colorVars.premiumLight,
                animation: 'dermoSpin 0.8s linear infinite',
              }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: colorVars.fg, marginBottom: '0.5rem' }}>
                Generando rutina personalizada...
              </div>
              <div style={{ fontSize: 12, color: colorVars.fgMuted, lineHeight: 1.5 }}>
                Estamos analizando tus respuestas para crear una rutina perfecta para ti. Espera por favor...
              </div>
              <div style={{
                marginTop: '1rem', height: 4, borderRadius: 2, overflow: 'hidden',
                background: colorVars.surfaceHover,
              }}>
                <div style={{
                  height: '100%', width: '30%', borderRadius: 2,
                  background: `linear-gradient(90deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                  animation: 'dermoShimmer 1.5s ease-in-out infinite',
                }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
