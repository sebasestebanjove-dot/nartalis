'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft, Sparkles, Crown, ChevronRight, Check, AlertCircle, Loader2, Send } from 'lucide-react';
import { colorVars } from '../styles';
import ChipGroup from '../components/ChipGroup';
import SkinScale from '../components/SkinScale';
import { generateRoutine } from '../api';
import type { AdvancedQuizAnswers, DermoUserRoutine, UserType } from '../types';
import { DEFAULT_ADVANCED_ANSWERS } from '../types';

interface Props {
  userType: UserType;
  userEmail: string;
  onBack: () => void;
  onComplete: (result: DermoUserRoutine) => void;
}

const FOTOTIPOS = [
  { label: 'I (muy clara)', value: 'I' },
  { label: 'II (clara)', value: 'II' },
  { label: 'III (intermedia)', value: 'III' },
  { label: 'IV (morena clara)', value: 'IV' },
  { label: 'V (morena oscura)', value: 'V' },
  { label: 'VI (negra)', value: 'VI' },
];

const SEXO = [
  { label: 'Masculino', value: 'masculino' },
  { label: 'Femenino', value: 'femenino' },
  { label: 'Otro', value: 'otro' },
  { label: 'Prefiero no responder', value: 'no_responde' },
];

const STEPS = ['Identificación', 'Hábitos', 'Digestivo', 'Neuro-Emocional', 'Cuidados', 'Final'];

function SingleChip({ options, value, onChange }: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
      {options.map((opt) => {
        const isSel = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: '0.55rem 1rem', borderRadius: 10,
              background: isSel
                ? `linear-gradient(135deg, rgba(124,58,237,0.25), rgba(167,139,250,0.15))`
                : colorVars.surface,
              border: isSel
                ? `1.5px solid ${colorVars.premiumLight}`
                : `1px solid ${colorVars.border}`,
              color: isSel ? colorVars.premiumLight : colorVars.fg,
              fontSize: 13, fontWeight: isSel ? 700 : 500,
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
              transition: 'all 0.15s',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: colorVars.fgMuted, marginBottom: '0.4rem' }}>
      {label}{required && <span style={{ color: colorVars.danger, marginLeft: 2 }}>*</span>}
    </div>
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%', fontSize: 14, padding: '0.7rem 0.85rem', borderRadius: 12,
        border: `1.5px solid ${colorVars.border}`, background: colorVars.surface,
        color: colorVars.fg, outline: 'none', resize: 'vertical',
        fontFamily: 'inherit', boxSizing: 'border-box',
      }}
    />
  );
}

function Input({ value, onChange, placeholder, type = 'text', disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%', fontSize: 14, padding: '0.7rem 0.85rem', borderRadius: 12,
        border: `1.5px solid ${colorVars.border}`, background: disabled ? colorVars.surfaceHover : colorVars.surface,
        color: colorVars.fg, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
      }}
    />
  );
}

export default function DermoAdvancedQuizScreen({ userType, userEmail, onBack, onComplete }: Props) {
  const isPremium = userType === 'premium';
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AdvancedQuizAnswers>({ ...DEFAULT_ADVANCED_ANSWERS, email: userEmail });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { containerRef.current?.scrollTo(0, 0); }, [step]);

  const update = useCallback(<K extends keyof AdvancedQuizAnswers>(key: K, value: AdvancedQuizAnswers[K]) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }, []);

  const canNext = useMemo(() => {
    switch (step) {
      case 0: return !!answers.edad && !!answers.fototipo;
      case 1: return !!answers.alimentacion.length && !!answers.agua;
      case 2: return true; // opcional
      case 3: return !!answers.regulacion.length;
      case 4: return !!answers.preocupacionPrincipal.length && !!answers.fotoproteccionDiaria;
      case 5: return answers.consentPrivacidad && answers.consentIA;
      default: return true;
    }
  }, [step, answers]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload: Record<string, any> = {};
      for (const [k, v] of Object.entries(answers)) {
        payload[k] = v;
      }
      const result = await generateRoutine(payload);
      onComplete(result);
    } catch (err: any) {
      setError(err.message || 'Error al generar rutina avanzada');
    } finally {
      setSubmitting(false);
    }
  };

  const progressPercent = ((step + 1) / STEPS.length) * 100;

  return (
    <div style={{ height: '100%', background: colorVars.bg, color: colorVars.fg, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '1rem 1.25rem', borderBottom: `1px solid ${colorVars.border}`,
        position: 'sticky', top: 0, background: colorVars.bg, zIndex: 10,
      }}>
        <button
          onClick={step > 0 ? () => setStep(s => s - 1) : onBack}
          aria-label="Volver"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, borderRadius: 12,
            border: `2px solid ${colorVars.border}`,
            background: colorVars.surface, color: colorVars.fg,
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>
            Test de Piel Avanzado
          </div>
          <div style={{ fontSize: 12, color: colorVars.premiumLight, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Crown size={12} /> Premium
          </div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ width: '100%', height: 4, background: colorVars.surfaceHover }}>
        <div style={{
          width: `${progressPercent}%`, height: '100%',
          background: `linear-gradient(90deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
          borderRadius: '0 2px 2px 0', transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Step indicator */}
      <div style={{
        display: 'flex', gap: '0.25rem', padding: '0.6rem 1.25rem',
        overflowX: 'auto', borderBottom: `1px solid ${colorVars.border}`,
      }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{
            flexShrink: 0, padding: '0.25rem 0.6rem', borderRadius: 6,
            fontSize: 11, fontWeight: i === step ? 700 : 500,
            background: i === step ? 'rgba(167,139,250,0.15)' : 'transparent',
            color: i === step ? colorVars.premiumLight : i < step ? colorVars.fgMuted : colorVars.fgDim,
          }}>
            {i < step ? <Check size={12} style={{ marginRight: 3, verticalAlign: 'middle' }} /> : null}
            {s}
          </div>
        ))}
      </div>

      {/* Content */}
      <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 600, padding: '1.25rem' }}>
        {error && (
          <div style={{ color: colorVars.danger, fontSize: 14, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* ───── Paso 1 ───── */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 600 }}>
            <div>
              <FieldLabel label="Edad" required />
              <Input type="number" value={answers.edad?.toString() || ''} placeholder="Tu edad" onChange={v => update('edad', parseInt(v) || null)} />
            </div>
            <div>
              <FieldLabel label="Sexo" />
              <SingleChip options={SEXO} value={answers.sexo} onChange={v => update('sexo', v)} />
            </div>
            <div>
              <FieldLabel label="Fototipo cutáneo" required />
              <SingleChip options={FOTOTIPOS} value={answers.fototipo} onChange={v => update('fototipo', v)} />
            </div>
            <div>
              <FieldLabel label="Motivo de consulta principal" />
              <TextArea value={answers.motivoConsulta} onChange={v => update('motivoConsulta', v)} placeholder="Describe el motivo principal..." />
            </div>
            <div>
              <FieldLabel label="Diagnósticos dermatológicos previos" />
              <TextArea value={answers.diagnosticosPrevios} onChange={v => update('diagnosticosPrevios', v)} placeholder="Acné, rosácea, dermatitis, etc." />
            </div>
            <div>
              <FieldLabel label="Tratamientos actuales (tópicos, sistémicos, suplementos)" />
              <TextArea value={answers.tratamientosActuales} onChange={v => update('tratamientosActuales', v)} placeholder="Indica qué productos o medicamentos usas ahora..." />
            </div>
            <div>
              <FieldLabel label="Antecedentes relevantes" />
              <TextArea value={answers.antecedentes} onChange={v => update('antecedentes', v)} placeholder="Cutáneos, digestivos, autoinmunes..." />
            </div>
            <div>
              <FieldLabel label="Cirugías previas y medicación actual" />
              <TextArea value={answers.cirugiasMedicacion} onChange={v => update('cirugiasMedicacion', v)} />
            </div>
            <div>
              <FieldLabel label="Alergias conocidas" />
              <TextArea value={answers.alergias} onChange={v => update('alergias', v)} placeholder="Medicamentos, alimentos, metales, fragancias..." />
            </div>
            <div>
              <FieldLabel label="Eventos desencadenantes recientes" />
              <TextArea value={answers.eventosDesencadenantes} onChange={v => update('eventosDesencadenantes', v)} placeholder="Estrés, viajes, antibióticos, cambios hormonales..." />
            </div>
            <div>
              <FieldLabel label="Objetivo del paciente" />
              <TextArea value={answers.objetivoPaciente} onChange={v => update('objetivoPaciente', v)} placeholder="¿Qué te gustaría conseguir con tu rutina?" />
            </div>
          </div>
        )}

        {/* ───── Paso 2 ───── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 600 }}>
            <div>
              <ChipGroup
                label="Alimentación predominantemente"
                options={[
                  { label: 'Mediterránea', value: 'mediterranea' },
                  { label: 'Alta en UPF', value: 'alta_upf' },
                  { label: 'Vegetal', value: 'vegetal' },
                  { label: 'Keto', value: 'keto' },
                  { label: 'Omnívora equilibrada', value: 'omnivora' },
                  { label: 'Flexitariana', value: 'flexitariana' },
                  { label: 'Vegetariana', value: 'vegetariana' },
                  { label: 'Vegana', value: 'vegana' },
                  { label: 'Paleo', value: 'paleo' },
                  { label: 'Alta en proteínas', value: 'alta_proteinas' },
                  { label: 'Baja en carbos', value: 'baja_carbos' },
                  { label: 'Sin gluten', value: 'sin_gluten' },
                  { label: 'Sin lactosa', value: 'sin_lactosa' },
                  { label: 'Comida rápida', value: 'comida_rapida' },
                  { label: 'Alta en azúcares', value: 'alta_azucares' },
                  { label: 'Ayuno intermitente', value: 'ayuno' },
                ]}
                selected={answers.alimentacion}
                onChange={v => update('alimentacion', v)}
                columns={2}
              />
            </div>
            <div>
              <FieldLabel label="Suplementación / Fibra" />
              <SingleChip
                options={[{ label: 'Sí', value: 'si' }, { label: 'No', value: 'no' }]}
                value={answers.suplementacion}
                onChange={v => update('suplementacion', v)}
              />
            </div>
            <div>
              <FieldLabel label="Consumo de pescado azul / semana" />
              <SingleChip
                options={[{ label: '0', value: '0' }, { label: '1', value: '1' }, { label: '≥2', value: '2mas' }]}
                value={answers.pescadoAzul}
                onChange={v => update('pescadoAzul', v)}
              />
            </div>
            <div>
              <FieldLabel label="Consumo de agua / día" required />
              <SingleChip
                options={[{ label: '<1 L', value: 'menos1' }, { label: '1-2 L', value: '1a2' }, { label: '>2 L', value: 'mas2' }]}
                value={answers.agua}
                onChange={v => update('agua', v)}
              />
            </div>
            <div>
              <FieldLabel label="Consumo de alcohol" />
              <SingleChip
                options={[{ label: 'No', value: 'no' }, { label: 'Ocasional', value: 'ocasional' }, { label: 'Semanal (>5 UBE)', value: 'semanal' }]}
                value={answers.alcohol}
                onChange={v => update('alcohol', v)}
              />
            </div>
            <div>
              <FieldLabel label="Tabaco / Vaper" />
              <SingleChip
                options={[{ label: 'No', value: 'no' }, { label: 'Sí', value: 'si' }]}
                value={answers.tabaco}
                onChange={v => update('tabaco', v)}
              />
            </div>
            <div>
              <FieldLabel label="Actividad física" />
              <SingleChip
                options={[{ label: 'Sedentario', value: 'sedentario' }, { label: '1-2/sem', value: '1a2' }, { label: '3-5/sem', value: '3a5' }, { label: '>5/sem', value: 'mas5' }]}
                value={answers.actividadFisica}
                onChange={v => update('actividadFisica', v)}
              />
            </div>
            <div>
              <FieldLabel label="Problemas con el sueño" />
              <SingleChip
                options={[
                  { label: 'No', value: 'no' },
                  { label: 'Problemas para dormirse', value: 'dormirse' },
                  { label: 'Problemas para mantener sueño', value: 'mantener' },
                  { label: 'Ambos', value: 'ambos' },
                ]}
                value={answers.problemasSueno}
                onChange={v => update('problemasSueno', v)}
              />
            </div>
            <div>
              <FieldLabel label="Uso de pantallas 1h antes de dormir" />
              <SingleChip
                options={[{ label: 'No', value: 'no' }, { label: 'Sí', value: 'si' }]}
                value={answers.pantallas}
                onChange={v => update('pantallas', v)}
              />
            </div>
          </div>
        )}

        {/* ───── Paso 3 ───── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 600 }}>
            <div>
              <FieldLabel label="Distensión / Hinchazón (últimas 4-8 semanas)" />
              <SingleChip
                options={[{ label: 'No', value: 'no' }, { label: 'Sí', value: 'si' }]}
                value={answers.distension}
                onChange={v => update('distension', v)}
              />
            </div>
            <div>
              <FieldLabel label="Dolor abdominal / Cólico" />
              <SingleChip
                options={[{ label: 'No', value: 'no' }, { label: 'Sí', value: 'si' }]}
                value={answers.dolorAbdominal}
                onChange={v => update('dolorAbdominal', v)}
              />
            </div>
            <div>
              <FieldLabel label="Gases" />
              <SingleChip
                options={[{ label: 'No', value: 'no' }, { label: 'Sí', value: 'si' }]}
                value={answers.gases}
                onChange={v => update('gases', v)}
              />
            </div>
            <div>
              <FieldLabel label="Reflujo / Náusea" />
              <SingleChip
                options={[{ label: 'No', value: 'no' }, { label: 'Sí', value: 'si' }]}
                value={answers.reflujo}
                onChange={v => update('reflujo', v)}
              />
            </div>
            {answers.reflujo === 'si' && (
              <div>
                <ChipGroup
                  label="Alimentos que empeoran el reflujo"
                  options={[
                    { label: 'Lácteos', value: 'lacteos' },
                    { label: 'Gluten', value: 'gluten' },
                    { label: 'UPF', value: 'upf' },
                    { label: 'Azúcar', value: 'azucar' },
                    { label: 'Picantes', value: 'picantes' },
                    { label: 'Alcohol', value: 'alcohol' },
                    { label: 'Café', value: 'cafe' },
                    { label: 'Fritos', value: 'fritos' },
                    { label: 'Grasas saturadas', value: 'grasas_sat' },
                    { label: 'Comida rápida', value: 'comida_rapida' },
                    { label: 'Gaseosas', value: 'gaseosas' },
                    { label: 'Cítricos', value: 'citricos' },
                    { label: 'Tomate', value: 'tomate' },
                    { label: 'Chocolate', value: 'chocolate' },
                    { label: 'Menta', value: 'menta' },
                    { label: 'Cebolla', value: 'cebolla' },
                    { label: 'Ajo', value: 'ajo' },
                    { label: 'Especias fuertes', value: 'especias' },
                    { label: 'Comidas copiosas', value: 'copiosas' },
                    { label: 'Acostarse tras comer', value: 'acostarse' },
                  ]}
                  selected={answers.alimentosReflujo}
                  onChange={v => update('alimentosReflujo', v)}
                  columns={2}
                />
              </div>
            )}
            <div>
              <FieldLabel label="Señales de histamina (flushing, cefalea, picor tras vino/queso)" />
              <SingleChip
                options={[{ label: 'No', value: 'no' }, { label: 'Sí', value: 'si' }]}
                value={answers.histamina}
                onChange={v => update('histamina', v)}
              />
            </div>
            <div>
              <FieldLabel label="Uso de antibióticos o protectores gástricos (últimos 6 meses)" />
              <SingleChip
                options={[{ label: 'No', value: 'no' }, { label: 'Sí', value: 'si' }]}
                value={answers.antibioticos}
                onChange={v => update('antibioticos', v)}
              />
            </div>
          </div>
        )}

        {/* ───── Paso 4 ───── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 600 }}>
            <SkinScale label="Estrés percibido" value={answers.estres} onChange={v => update('estres', v)} />
            <SkinScale label="Ansiedad" value={answers.ansiedad} onChange={v => update('ansiedad', v)} />
            <SkinScale label="Ánimo bajo" value={answers.animo} onChange={v => update('animo', v)} />
            <SkinScale label="Energía / Fatiga" value={answers.energia} onChange={v => update('energia', v)} />
            <SkinScale label="Calidad del sueño" value={answers.calidadSueno} onChange={v => update('calidadSueno', v)} />
            <div>
              <FieldLabel label="Despertares nocturnos" />
              <SingleChip
                options={[{ label: '0', value: '0' }, { label: '1-2', value: '1a2' }, { label: '≥3', value: '3mas' }]}
                value={answers.despertares}
                onChange={v => update('despertares', v)}
              />
            </div>
            <div>
              <FieldLabel label="Descanso al despertar" />
              <SingleChip
                options={[{ label: 'No', value: 'no' }, { label: 'Sí', value: 'si' }]}
                value={answers.descanso}
                onChange={v => update('descanso', v)}
              />
            </div>
            <div>
              <FieldLabel label="Circunstancias estresoras actuales" />
              <TextArea value={answers.circunstanciasEstresoras} onChange={v => update('circunstanciasEstresoras', v)} placeholder="Describe tu situación actual..." />
            </div>
            <div>
              <ChipGroup
                label="Estrategias de regulación usadas"
                options={[
                  { label: 'Respiración', value: 'respiracion' },
                  { label: 'Mindfulness', value: 'mindfulness' },
                  { label: 'Ejercicio', value: 'ejercicio' },
                  { label: 'Terapia', value: 'terapia' },
                  { label: 'Meditación', value: 'meditacion' },
                  { label: 'Yoga', value: 'yoga' },
                  { label: 'Escritura', value: 'escritura' },
                  { label: 'Música', value: 'musica' },
                  { label: 'Arte', value: 'arte' },
                  { label: 'Relajación muscular', value: 'relajacion' },
                  { label: 'Contacto naturaleza', value: 'naturaleza' },
                  { label: 'Apoyo social', value: 'apoyo' },
                  { label: 'Rutina autocuidado', value: 'autocuidado' },
                  { label: 'Alimentación consciente', value: 'alim_consciente' },
                  { label: 'Lectura', value: 'lectura' },
                  { label: 'Mascotas', value: 'mascotas' },
                ]}
                selected={answers.regulacion}
                onChange={v => update('regulacion', v)}
                columns={2}
              />
            </div>
          </div>
        )}

        {/* ───── Paso 5 ───── */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 600 }}>
            <div>
              <ChipGroup
                label="Preocupación principal"
                options={[
                  { label: 'Manchas', value: 'manchas' },
                  { label: 'Acné', value: 'acne' },
                  { label: 'Rosácea', value: 'rosacea' },
                  { label: 'Dermatitis', value: 'dermatitis' },
                  { label: 'Rojeces', value: 'rojeces' },
                  { label: 'Envejecimiento', value: 'envejecimiento' },
                  { label: 'Sensibilidad', value: 'sensibilidad' },
                  { label: 'Deshidratación', value: 'deshidratacion' },
                  { label: 'Sequedad', value: 'sequedad' },
                  { label: 'Grasa / exceso sebo', value: 'grasa' },
                  { label: 'Poros dilatados', value: 'poros' },
                  { label: 'Ojeras', value: 'ojeras' },
                  { label: 'Bolsas', value: 'bolsas' },
                  { label: 'Flacidez', value: 'flacidez' },
                  { label: 'Cicatrices', value: 'cicatrices' },
                  { label: 'Marcas de acné', value: 'marcas_acne' },
                  { label: 'Estrías', value: 'estrias' },
                  { label: 'Celulitis', value: 'celulitis' },
                  { label: 'Textura irregular', value: 'textura' },
                  { label: 'Piel opaca', value: 'opaca' },
                  { label: 'Queratosis pilaris', value: 'queratosis' },
                  { label: 'Psoriasis', value: 'psoriasis' },
                  { label: 'Eczema', value: 'eczema' },
                  { label: 'Melasma', value: 'melasma' },
                ]}
                selected={answers.preocupacionPrincipal}
                onChange={v => update('preocupacionPrincipal', v)}
                columns={2}
              />
            </div>
            <div>
              <FieldLabel label="Limpieza actual" />
              <SingleChip
                options={[{ label: 'Ninguna', value: 'ninguna' }, { label: 'Suave', value: 'suave' }, { label: 'Astringente', value: 'astringente' }, { label: 'Excesiva', value: 'excesiva' }]}
                value={answers.limpiezaActual}
                onChange={v => update('limpiezaActual', v)}
              />
            </div>
            <div>
              <FieldLabel label="Hidratante actual" />
              <SingleChip
                options={[{ label: 'Con ceramidas', value: 'ceramidas' }, { label: 'Ligera', value: 'ligera' }, { label: 'No usa', value: 'no_usa' }]}
                value={answers.hidratanteActual}
                onChange={v => update('hidratanteActual', v)}
              />
            </div>
            <div>
              <ChipGroup
                label="Antioxidantes en uso"
                options={[
                  { label: 'No', value: 'no' },
                  { label: 'Vitamina C', value: 'vitc' },
                  { label: 'Vitamina E', value: 'vite' },
                  { label: 'Ácido Ferúlico', value: 'ferulico' },
                  { label: 'Resveratrol', value: 'resveratrol' },
                  { label: 'Coenzima Q10', value: 'coq10' },
                  { label: 'Niacinamida', value: 'niacinamida' },
                  { label: 'Polifenoles', value: 'polifenoles' },
                  { label: 'Melatonina tópica', value: 'melatonina' },
                ]}
                selected={answers.antioxidantes}
                onChange={v => update('antioxidantes', v)}
                columns={2}
              />
            </div>
            <div>
              <ChipGroup
                label="Activos actuales en uso"
                options={[
                  { label: 'Ácido hialurónico', value: 'hialuronico' },
                  { label: 'Retinol/Retinoides', value: 'retinol' },
                  { label: 'Péptidos', value: 'peptidos' },
                  { label: 'Ceramidas', value: 'ceramidas' },
                  { label: 'Bakuchiol', value: 'bakuchiol' },
                  { label: 'Ácido tranexámico', value: 'tranexamico' },
                  { label: 'Ácido azelaico', value: 'azelaico' },
                  { label: 'Zinc', value: 'zinc' },
                  { label: 'Centella asiática', value: 'centella' },
                  { label: 'AHA/BHA', value: 'ahabh' },
                ]}
                selected={answers.activosActuales}
                onChange={v => update('activosActuales', v)}
                columns={2}
              />
            </div>
            <div>
              <FieldLabel label="Producto para ojos" />
              <SingleChip
                options={[{ label: 'No', value: 'no' }, { label: 'Sí', value: 'si' }]}
                value={answers.productOjos}
                onChange={v => update('productOjos', v)}
              />
            </div>
            <div>
              <FieldLabel label="Crema reparadora" />
              <SingleChip
                options={[{ label: 'No', value: 'no' }, { label: 'Sí', value: 'si' }]}
                value={answers.cremaReparadora}
                onChange={v => update('cremaReparadora', v)}
              />
            </div>
            <div>
              <FieldLabel label="Fotoprotección diaria" required />
              <SingleChip
                options={[{ label: 'No', value: 'no' }, { label: 'Sí', value: 'si' }]}
                value={answers.fotoproteccionDiaria}
                onChange={v => update('fotoproteccionDiaria', v)}
              />
            </div>
            <div>
              <FieldLabel label="Tratamiento de noche" />
              <SingleChip
                options={[{ label: 'No', value: 'no' }, { label: 'Sí', value: 'si' }]}
                value={answers.tratamientoNoche}
                onChange={v => update('tratamientoNoche', v)}
              />
            </div>
            <div style={{ borderTop: `1px solid ${colorVars.border}`, paddingTop: '0.5rem' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: colorVars.fg, marginBottom: '0.75rem' }}>
                Reactividad / Sensibilidad
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <FieldLabel label="Reacciones a cosméticos" />
                  <SingleChip
                    options={[{ label: 'No', value: 'no' }, { label: 'Sí', value: 'si' }]}
                    value={answers.reaccionCosmeticos}
                    onChange={v => update('reaccionCosmeticos', v)}
                  />
                </div>
                <div>
                  <FieldLabel label="Empeora con alcohol/picante" />
                  <SingleChip
                    options={[{ label: 'No', value: 'no' }, { label: 'Sí', value: 'si' }]}
                    value={answers.empeoraAlcohol}
                    onChange={v => update('empeoraAlcohol', v)}
                  />
                </div>
                <div>
                  <FieldLabel label="Reacciones a joyas/bisutería" />
                  <SingleChip
                    options={[{ label: 'No', value: 'no' }, { label: 'Sí', value: 'si' }]}
                    value={answers.reaccionJoyas}
                    onChange={v => update('reaccionJoyas', v)}
                  />
                </div>
                <div>
                  <FieldLabel label="Dificultad para encontrar limpiador adecuado" />
                  <SingleChip
                    options={[{ label: 'No', value: 'no' }, { label: 'Sí', value: 'si' }]}
                    value={answers.dificultadLimpiador}
                    onChange={v => update('dificultadLimpiador', v)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───── Paso 6 ───── */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 600 }}>
            <div>
              <FieldLabel label="Email" />
              <Input
                type="email"
                value={answers.email}
                onChange={v => update('email', v)}
                placeholder="Tu email"
                disabled
              />
            </div>

            <div style={{
              background: colorVars.surface, borderRadius: 14,
              border: `1px solid ${colorVars.border}`, padding: '1.25rem',
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: colorVars.fg, marginBottom: '1rem' }}>
                Consentimientos
              </div>

              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                cursor: 'pointer', marginBottom: '1rem',
              }}>
                <div
                  onClick={() => update('consentPrivacidad', !answers.consentPrivacidad)}
                  style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                    background: answers.consentPrivacidad
                      ? `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`
                      : colorVars.surfaceHover,
                    border: `1.5px solid ${answers.consentPrivacidad ? 'transparent' : colorVars.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  {answers.consentPrivacidad && <Check size={14} color="#fff" strokeWidth={3} />}
                </div>
                <span style={{ fontSize: 13, color: colorVars.fg, lineHeight: 1.4 }}>
                  Acepto la política de privacidad y procesamiento de datos. <span style={{ color: colorVars.danger }}>*</span>
                </span>
              </label>

              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                cursor: 'pointer', marginBottom: '1rem',
              }}>
                <div
                  onClick={() => update('consentIA', !answers.consentIA)}
                  style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                    background: answers.consentIA
                      ? `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`
                      : colorVars.surfaceHover,
                    border: `1.5px solid ${answers.consentIA ? 'transparent' : colorVars.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  {answers.consentIA && <Check size={14} color="#fff" strokeWidth={3} />}
                </div>
                <span style={{ fontSize: 13, color: colorVars.fg, lineHeight: 1.4 }}>
                  Consiento expresamente el tratamiento de mis datos de salud mediante sistema automatizado de IA para la generación de la rutina. <span style={{ color: colorVars.danger }}>*</span>
                </span>
              </label>

              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                cursor: 'pointer',
              }}>
                <div
                  onClick={() => update('consentDerivacion', !answers.consentDerivacion)}
                  style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                    background: answers.consentDerivacion
                      ? `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`
                      : colorVars.surfaceHover,
                    border: `1.5px solid ${answers.consentDerivacion ? 'transparent' : colorVars.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  {answers.consentDerivacion && <Check size={14} color="#fff" strokeWidth={3} />}
                </div>
                <span style={{ fontSize: 13, color: colorVars.fgMuted, lineHeight: 1.4 }}>
                  Consiento la cesión opcional de datos a mi profesional dermatológico de referencia.
                </span>
              </label>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Bottom nav */}
      <div style={{
        borderTop: `1px solid ${colorVars.border}`, padding: '0.85rem 1.25rem',
        display: 'flex', gap: '0.75rem',
      }}>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext}
            style={{
              flex: 1, padding: '0.85rem', borderRadius: 14, border: 'none',
              background: canNext
                ? `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`
                : colorVars.surfaceHover,
              color: canNext ? '#fff' : colorVars.fgDim,
              fontSize: 15, fontWeight: 700,
              cursor: canNext ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
              transition: 'opacity 0.15s',
            }}
          >
            Siguiente <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canNext || submitting}
            style={{
              flex: 1, padding: '0.85rem', borderRadius: 14, border: 'none',
              background: canNext && !submitting
                ? `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`
                : colorVars.surfaceHover,
              color: canNext && !submitting ? '#fff' : colorVars.fgDim,
              fontSize: 15, fontWeight: 700,
              cursor: canNext && !submitting ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
            }}
          >
            {submitting ? <><Loader2 size={16} style={{ animation: 'dermoSpin 0.8s linear infinite' }} /> Generando...</>
              : <><Send size={16} /> Generar Rutina Avanzada con IA</>}
          </button>
        )}
      </div>

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
              Estamos analizando tus respuestas avanzadas para crear una rutina perfecta para ti. Espera por favor...
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
  );
}
