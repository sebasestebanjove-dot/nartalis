"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  Crown, Search, Sparkles, MessageCircle,
  ChevronDown, Clock, Lock, Star, Flame, Target,
  Sun, Moon, Check, Calendar, RefreshCw, ArrowLeft,
  Plane, Luggage, ShieldAlert, Pill, AlertTriangle, AlertCircle, Info,
  TrendingUp, TrendingDown, BarChart3, Package, Trash2, X, Plus,
  FlaskConical, Users, LayoutGrid, Zap, ArrowRight,
} from 'lucide-react';
import { colorVars } from '../styles';
import {
  getSearchHistory, logRoutineCompletion, logKpiEvent,
  getActiveTravel, createTravel, cancelTravel,
  getMedications, addMedication, removeMedication,
  getProductUsage, addProductUsage, removeProductUsage,
  getWeeklyReport, analyzeDermoProduct,
} from '../api';
import type { UserType, DashboardData, DermoUserRoutine, TravelProfile, UserMedication, ProductUsage, WeeklyReport } from '../types';
import SafetyAlerts from '../components/SafetyAlerts';

const FREE_MAX_CONSULTAS = 2;

interface DermaPanelProps {
  userType: UserType;
  userEmail: string;
  consultasConsumidas: number;
  dashboardData: DashboardData | null;
  loading: boolean;
  codigoPostal?: string;
  onSearch: (query: string) => void;
  onStartQuiz: () => void;
  onNavigateSearch?: () => void;
  onChangeCp?: () => void;
  onRoutineRestored?: (routine: DermoUserRoutine) => void;
  onRefreshDashboard?: () => Promise<void>;
  onShowPaywall?: (view: 'login' | 'register') => void;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function getRoutineItems(routine: DermoUserRoutine | null): { am: { id: string; productName: string; step: string; order: number; done: boolean }[]; pm: { id: string; productName: string; step: string; order: number; done: boolean }[] } {
  if (Array.isArray(routine?.am_routine) && routine.am_routine.length > 0) {
    return {
      am: routine.am_routine.map((r, i) => ({ id: `am-${r.order}-${i}`, productName: r.productName, step: r.step, order: r.order, done: false })),
      pm: Array.isArray(routine.pm_routine) ? routine.pm_routine.map((r, i) => ({ id: `pm-${r.order}-${i}`, productName: r.productName, step: r.step, order: r.order, done: false })) : [],
    };
  }
  return { am: [], pm: [] };
}

// ── Mock data for anonymous users ──
const ANONYMOUS_MOCK_DATA: DashboardData = {
  user: { name: 'Invitado', email: '', is_premium: false, consultas_consumidas: 0 },
  stats: { total_consultations: 0, total_bookings: 0, total_routines: 1 },
  skin_score: 75,
  skin_score_breakdown: { base: 50, routine: 10, consultations: 5, bookings: 5, consistency: 5 },
  consistency: 100,
  streak: 2,
  goal_label: 'Mejorar hidratación',
  goal_progress: 42,
  milestones: [
    { date: new Date().toISOString(), text: 'Bienvenido a Dermofarmacia IA', icon: '👋' },
    { date: new Date().toISOString(), text: 'Análisis INCI completado', icon: '🔬' },
  ],
  skin_score_history: [
    { label: 'Sem 1', value: 60 },
    { label: 'Sem 2', value: 65 },
    { label: 'Sem 3', value: 70 },
    { label: 'Sem 4', value: 75 },
  ],
  latest_routine: {
    id: 'mock-routine',
    user_email: '',
    skin_type: 'mixta',
    allergies: null,
    goals: ['Mejorar hidratación', 'Uniformizar tono'],
    am_routine: [
      { productId: 'mock-1', productName: 'Avène Gel Moussant Purifiant', step: 'Limpieza', order: 0 },
      { productId: 'mock-2', productName: 'SkinCeuticals C E Ferulic', step: 'Sérum', order: 1 },
      { productId: 'mock-3', productName: 'La Roche-Posay Toleriane Double Repair', step: 'Hidratante', order: 2 },
      { productId: 'mock-4', productName: 'Isdin Eryfotona Actinica SPF 50+', step: 'Protección solar', order: 3 },
    ],
    pm_routine: [
      { productId: 'mock-5', productName: 'Bioderma Sensibio H2O Micelar', step: 'Desmaquillante', order: 0 },
      { productId: 'mock-6', productName: 'Cerave Foaming Cleanser', step: 'Limpieza', order: 1 },
      { productId: 'mock-7', productName: 'Retinal 0.1%', step: 'Activo noche', order: 2 },
      { productId: 'mock-8', productName: 'Lipikar Baume AP+M', step: 'Hidratante', order: 3 },
    ],
    explanation: 'Rutina avanzada para piel mixta con tendencia acneica. Incluye antioxidantes por la mañana y retinal por la noche.',
    is_completed: true,
    name: 'Rutina Avanzada Fototipo III — cuidado facial1',
    status: 'active',
    created_at: new Date().toISOString(),
  },
  recent_consultations: [],
  recent_bookings: [],
};

// ── Sub-components ──

function PremiumBadge({ label = 'Premium' }: { label?: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '2px 8px', borderRadius: 4,
      background: `${colorVars.premiumGlow}`,
      border: `1px solid ${colorVars.premium}40`,
      fontSize: 9, fontWeight: 700, color: colorVars.premiumLight,
      textTransform: 'uppercase', letterSpacing: '0.3px',
    }}>
      <Lock size={8} /> {label}
    </div>
  );
}

function ProgressRing({ score, size = 88, strokeWidth = 5 }: { score: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={colorVars.surfaceHover} strokeWidth={strokeWidth} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={score >= 70 ? `url(#scoreGrad)` : score >= 40 ? colorVars.warning : colorVars.danger}
        strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
      <defs>
        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colorVars.premium} />
          <stop offset="100%" stopColor={colorVars.premiumLight} />
        </linearGradient>
      </defs>
    </svg>
  );
}

function EvolutionChart({ data, width = 260, height = 100 }: { data: { label: string; value: number }[]; width?: number; height?: number }) {
  const maxVal = Math.max(...data.map(d => d.value), 100);
  const minVal = Math.min(...data.map(d => d.value), 0);
  const range = maxVal - minVal || 1;
  const padX = 20;
  const padY = 10;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = data.map((d, i) => ({
    x: padX + (i / (data.length - 1)) * chartW,
    y: padY + chartH - ((d.value - minVal) / range) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorVars.premiumLight} stopOpacity="0.3" />
          <stop offset="100%" stopColor={colorVars.premiumLight} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={`${linePath} L${points[points.length - 1].x},${padY + chartH} L${points[0].x},${padY + chartH} Z`} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke={colorVars.premiumLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={colorVars.bg} stroke={colorVars.premiumLight} strokeWidth="2" />
      ))}
      {data.map((d, i) => (
        <text key={i} x={points[i].x} y={height - 2} textAnchor="middle" fill={colorVars.fgDim} fontSize={9} fontFamily="inherit">
          {d.label}
        </text>
      ))}
      {points.map((p, i) => (
        <text key={i} x={p.x} y={p.y - 8} textAnchor="middle" fill={colorVars.fgMuted} fontSize={10} fontWeight={700} fontFamily="inherit">
          {data[i].value}
        </text>
      ))}
    </svg>
  );
}

function formatRelativeDate(dateStr: string): string {
  if (!dateStr || dateStr === 'Reciente') return 'Reciente';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 14) return 'Hace 1 semana';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function MilestoneTimeline({ milestones }: { milestones: { date: string; text: string; icon: string }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {milestones.map((m, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.6rem', position: 'relative', paddingBottom: i < milestones.length - 1 ? '0.9rem' : 0 }}>
          {i < milestones.length - 1 && (
            <div style={{
              position: 'absolute', left: 9, top: 22, bottom: 0, width: 1.5,
              background: `linear-gradient(to bottom, ${colorVars.premiumGlow}, transparent)`,
            }} />
          )}
          <div style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
            background: i === milestones.length - 1
              ? `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`
              : colorVars.surfaceHover,
            border: `1.5px solid ${i === milestones.length - 1 ? colorVars.premiumLight : colorVars.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
          }}>
            {m.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: colorVars.fgDim, marginBottom: '0.1rem' }}>
              {formatRelativeDate(m.date)}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colorVars.fg, lineHeight: 1.4 }}>{m.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RoutineChecklist({
  items, label, icon, accentColor,
  checked, onToggle, collapsed: forcedCollapsed,
  conflicts,
}: {
  items: { id: string; productName: string; step: string; order: number; done: boolean }[];
  label: string;
  icon: React.ReactNode;
  accentColor: string;
  checked: Record<string, boolean>;
  onToggle: (id: string) => void;
  collapsed?: boolean;
  conflicts?: Set<string>;
}) {
  const [internalCollapsed, setInternalCollapsed] = useState(forcedCollapsed ?? false);
  const collapsed = internalCollapsed;
  const doneCount = items.filter(i => checked[i.id]).length;

  return (
    <div style={{
      background: colorVars.surface, borderRadius: 14, border: `1px solid ${colorVars.border}`,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setInternalCollapsed(!collapsed)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.75rem 1rem', border: 'none', background: 'transparent',
          color: colorVars.fg, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${accentColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
          <div style={{ fontSize: 11, color: colorVars.fgMuted }}>
            {doneCount}/{items.length} completados
          </div>
        </div>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: `conic-gradient(${colorVars.premiumLight} ${items.length > 0 ? (doneCount / items.length) * 360 : 0}deg, ${colorVars.surfaceHover} 0deg)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: colorVars.fg, flexShrink: 0,
        }}>
          {doneCount}
        </div>
        <ChevronDown size={15} color={colorVars.fgDim} style={{
          transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }} />
      </button>

      {!collapsed && (
        <div style={{ padding: '0 0.75rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {items.map(item => <RoutineChecklistItem
                key={item.id}
                item={item}
                checked={checked}
                onToggle={onToggle}
                conflicts={conflicts}
                accentColor={accentColor}
              />)}
        </div>
      )}
    </div>
  );
}

function RoutineChecklistItem({
  item, checked, onToggle, conflicts, accentColor,
}: {
  item: { id: string; productName: string; step: string; order: number; done: boolean };
  checked: Record<string, boolean>;
  onToggle: (id: string) => void;
  conflicts?: Set<string>;
  accentColor: string;
}) {
  const isConflict = conflicts?.has(item.productName);
  return (
    <label
      style={{
        display: 'flex', alignItems: 'center', gap: '0.55rem',
        padding: '0.5rem 0.6rem', borderRadius: 10, position: 'relative',
        background: isConflict ? 'rgba(239,68,68,0.06)' : (checked[item.id] ? `${accentColor}10` : 'transparent'),
        border: `1px solid ${isConflict ? 'rgba(239,68,68,0.3)' : (checked[item.id] ? `${accentColor}30` : 'transparent')}`,
        cursor: 'pointer', transition: 'all 0.15s',
        fontFamily: 'inherit',
      }}
    >
      {isConflict && (
        <div title="Posible interacción con medicación" style={{
          position: 'absolute', top: -4, right: -4, width: 16, height: 16,
          borderRadius: '50%', background: '#EF4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2,
        }}>
          <AlertTriangle size={9} color="#fff" strokeWidth={3} />
        </div>
      )}
      <div
        onClick={() => onToggle(item.id)}
        style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          background: checked[item.id]
            ? `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`
            : colorVars.surfaceHover,
          border: `1px solid ${checked[item.id] ? 'transparent' : colorVars.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        {checked[item.id] && <Check size={12} color="#fff" strokeWidth={3} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: isConflict ? '#EF4444' : (checked[item.id] ? colorVars.fgMuted : colorVars.fg),
          textDecoration: checked[item.id] ? 'line-through' : 'none',
          transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', gap: '0.3rem',
        }}>
          {item.productName}
          {isConflict && <AlertTriangle size={10} color="#EF4444" />}
        </div>
        <div style={{ fontSize: 11, color: colorVars.fgDim }}>{item.step}</div>
        {isConflict && (
          <div style={{ fontSize: 10, color: '#EF4444', marginTop: '0.15rem' }}>
            Posible interacción con tu medicación
          </div>
        )}
      </div>
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        border: `1px solid ${colorVars.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, color: colorVars.fgDim,
      }}>
        {item.order}
      </div>
    </label>
  );
}

// ── Metric Card ──

function MetricCard({
  icon, label, value, sub, accent = colorVars.premiumLight,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
}) {
  return (
    <div style={{
      background: colorVars.surface, borderRadius: 14,
      border: `1px solid ${colorVars.border}`,
      padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 60, height: 60,
        background: `radial-gradient(circle at top right, ${accent}15, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <div style={{ color: accent, flexShrink: 0, display: 'flex' }}>{icon}</div>
        <span style={{ fontSize: 11, color: colorVars.fgMuted, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: colorVars.fg, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: colorVars.fgDim }}>{sub}</div>}
    </div>
  );
}

// ── Main Component ──

export default function DermaPanel({
  userType, userEmail, consultasConsumidas, dashboardData, loading,
  codigoPostal, onSearch, onStartQuiz, onNavigateSearch, onChangeCp,
  onRoutineRestored, onRefreshDashboard, onShowPaywall,
}: DermaPanelProps) {
  const isPremium = userType === 'premium';
  const isFree = userType === 'free';
  const isAnon = userType === 'anonymous';
  const consultasRestantes = isFree ? Math.max(0, FREE_MAX_CONSULTAS - consultasConsumidas) : Infinity;
  const isMorning = new Date().getHours() < 12;
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [anonPreview, setAnonPreview] = useState<{ productName: string; lines: string[] } | null>(null);
  const [anonLoading, setAnonLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    getSearchHistory().then(res => {
      if (res.history) setSearchHistory(res.history);
    }).catch(() => {}).finally(() => setHistoryLoading(false));
  }, []);

  const effectiveData = isAnon ? ANONYMOUS_MOCK_DATA : dashboardData;
  const score = effectiveData?.skin_score ?? 50;
  const consistency = effectiveData?.consistency ?? 0;
  const goalLabel = effectiveData?.goal_label ?? 'Mejorar hidratación';
  const goalProgress = effectiveData?.goal_progress ?? 0;
  const milestones = effectiveData?.milestones ?? [];
  const evolutionData = effectiveData?.skin_score_history?.length ? effectiveData.skin_score_history : [];
  const name = effectiveData?.user?.name || (isAnon ? 'Invitado' : userEmail.split('@')[0] || 'Usuario');

  const activeRoutine = effectiveData?.latest_routine ?? null;
  const routineName = activeRoutine?.name || '';
  const routineCreatedAt = activeRoutine?.created_at || '';
  const routineDateStr = routineCreatedAt ? new Date(routineCreatedAt).toLocaleDateString('es-ES') : '';
  const routineData = useMemo(() => getRoutineItems(activeRoutine), [dashboardData]);
  const hasActiveRoutine = routineData.am.length > 0 || routineData.pm.length > 0;

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) onSearch(searchQuery.trim());
  }, [searchQuery, onSearch]);

  const handleAnonSearch = useCallback(async (query: string) => {
    setAnonLoading(true);
    setAnonPreview(null);
    try {
      const result = await analyzeDermoProduct(query);
      const lines = result.ingredients.map(ing =>
        `${ing.name} — ${ing.verdict === 'safe' ? 'Seguro' : ing.verdict === 'caution' ? 'Precaución' : 'Evitar'}`
      );
      setAnonPreview({ productName: result.productName, lines });
    } catch {
      setAnonPreview({
        productName: query,
        lines: ['No pudimos analizar este producto. Intenta con otro nombre.'],
      });
    } finally {
      setAnonLoading(false);
    }
  }, []);

  const improvement = score > 50 ? Math.round((score - 50) / 50 * 100) : 0;

  // ── Regen confirmation + history / restore ──
  const handleStartQuizClick = useCallback(() => {
    if (hasActiveRoutine) {
      setShowRegenConfirm(true);
    } else {
      onStartQuiz();
    }
  }, [hasActiveRoutine, onStartQuiz]);

  const handleConfirmRegen = useCallback(() => {
    setShowRegenConfirm(false);
    onStartQuiz();
  }, [onStartQuiz]);

  const handleOpenHistory = useCallback(async () => {
    setShowHistory(true);
    setRoutineHistoryLoading(true);
    try {
      const { getRoutines } = await import('../api');
      const res = await getRoutines();
      setRoutineHistory(res.history);
    } catch {} finally {
      setRoutineHistoryLoading(false);
    }
  }, []);

  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<DermoUserRoutine | null>(null);
  const [restoreError, setRestoreError] = useState('');

  const handleRestoreRoutine = useCallback((r: DermoUserRoutine) => {
    setRestoreTarget(r);
    setRestoreError('');
  }, []);

  const handleConfirmRestore = useCallback(async () => {
    if (!restoreTarget) return;
    const id = restoreTarget.id;
    setRestoringId(id);
    setRestoreError('');
    try {
      const { activateRoutine } = await import('../api');
      const res = await activateRoutine(id, restoreTarget.name || undefined);
      if (res.ok) {
        onRoutineRestored?.(res.routine);
        setShowHistory(false);
        setRestoreTarget(null);
        setRestoringId(null);
      } else {
        setRestoreError(res.error || 'Error al restaurar la rutina');
        setRestoringId(null);
      }
    } catch (err: any) {
      setRestoreError(err.message || 'Error de conexión');
      setRestoringId(null);
    }
  }, [restoreTarget, onRoutineRestored]);

  // ── Checkbox state lifted + date persistence ──
  const todayKey = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`dermo_routine_${todayKey}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });
  const completedTodayRef = useRef(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [localStreakOffset, setLocalStreakOffset] = useState(0);
  const [localMilestones, setLocalMilestones] = useState<{ date: string; text: string; icon: string }[]>([]);
  const [yesterdayIncomplete, setYesterdayIncomplete] = useState<{ label: string; items: string[] } | null>(null);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [routineHistory, setRoutineHistory] = useState<DermoUserRoutine[]>([]);
  const [routineHistoryLoading, setRoutineHistoryLoading] = useState(false);

  // ── Premium V2 states ──
  const [activeTravel, setActiveTravel] = useState<TravelProfile | null>(null);
  const [showTravelModal, setShowTravelModal] = useState(false);
  const [travelForm, setTravelForm] = useState({ destination: '', travel_type: 'playa', start_date: '', end_date: '' });
  const [travelGenerating, setTravelGenerating] = useState(false);
  const [showTravelRoutine, setShowTravelRoutine] = useState(false);
  const [showAllMilestones, setShowAllMilestones] = useState(false);
  const [weather, setWeather] = useState<{city:string;uv:number;temp:number;precip:number}|null>(null);
  const [weatherDenied, setWeatherDenied] = useState(false);

  const [medications, setMedications] = useState<UserMedication[]>([]);
  const [showMedModal, setShowMedModal] = useState(false);
  const [medForm, setMedForm] = useState({ medicine_name: '', active_ingredient: '', atc_code: '' });
  const [medAnalyzing, setMedAnalyzing] = useState(false);
  const [expandedMedId, setExpandedMedId] = useState<string | null>(null);
  const [medResult, setMedResult] = useState<{ medication: UserMedication; compatibility: any } | null>(null);

  const conflictingProducts = useMemo(() => {
    const names = new Set<string>();
    for (const med of medications) {
      const details = med.compatibility_result?.details || [];
      for (const d of details) {
        const match = d.match(/"([^"]+)"/);
        if (match) names.add(match[1]);
      }
    }
    return names;
  }, [medications]);

  const safetyAlerts = [
    ...(score < 40 ? [{ type: 'danger' as const, label: 'Salud de piel baja — revisa tu rutina' }] : []),
    ...(score < 60 && score >= 40 ? [{ type: 'warning' as const, label: 'Tu piel puede mejorar — sé constante con la rutina' }] : []),
    ...medications.flatMap(med => {
      const r: { type: 'danger' | 'warning'; label: string }[] = [];
      if (med.compatibility_result?.fotosensibilidad) {
        r.push({ type: 'danger', label: `Fotosensibilidad por ${med.medicine_name} — usa SPF50+ y evita el sol directo` });
      }
      if (med.compatibility_result?.irritacion) {
        r.push({ type: 'warning', label: `Posible irritación por ${med.medicine_name} al combinarlo con tu rutina` });
      }
      if (med.compatibility_result?.sequedad) {
        r.push({ type: 'warning', label: `Posible sequedad por ${med.medicine_name} — refuerza con hidratante` });
      }
      return r;
    }),
    { type: 'info' as const, label: 'Usar protección solar SPF50+ cada mañana' },
  ];
  const hasAlerts = safetyAlerts.length > 0;

  const [exhaustionProducts, setExhaustionProducts] = useState<ProductUsage[]>([]);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [usageForm, setUsageForm] = useState({ product_name: '', size_ml: '', use_frequency: '1_dia', unit: 'ml' });

  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(`dermo_routine_${todayKey}`, JSON.stringify(checkedItems));
    } catch {}
  }, [checkedItems, todayKey]);

  const allItems = useMemo(() => [...routineData.am, ...routineData.pm], [routineData]);
  const totalItems = allItems.length;
  const doneCount = allItems.filter(i => checkedItems[i.id]).length;
  const metaPercent = totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0;

  const handleToggleItem = useCallback((id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Watch for 100% completion
  useEffect(() => {
    if (totalItems === 0) return;
    if (doneCount >= totalItems && !completedTodayRef.current) {
      completedTodayRef.current = true;
      setShowSuccessBanner(true);
      setLocalStreakOffset(1);
      const today = new Date().toISOString().split('T')[0];
      setLocalMilestones(prev => [...prev, { date: today, text: 'Rutina diaria completada al 100%', icon: '✅' }]);

      // Persist to backend (fire-and-forget)
      logRoutineCompletion(totalItems, totalItems, todayKey).catch(() => {});
    }
  }, [doneCount, totalItems, todayKey]);

  // ── Yesterday summary from localStorage ──
  useEffect(() => {
    if (!hasActiveRoutine) return;
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = yesterday.toISOString().split('T')[0];
      const saved = localStorage.getItem(`dermo_routine_${yKey}`);
      if (!saved) return;
      const yChecked: Record<string, boolean> = JSON.parse(saved);
      const allRoutineItems = [...routineData.am, ...routineData.pm];
      const yDone = allRoutineItems.filter(i => yChecked[i.id]).length;
      const yTotal = allRoutineItems.length;
      if (yTotal === 0) return;
      if (yDone >= yTotal) return; // completed 100%, no need to show anything
      const missing = allRoutineItems.filter(i => !yChecked[i.id]).map(i => i.productName);
      const pct = Math.round((yDone / yTotal) * 100);
      setYesterdayIncomplete({
        label: `Ayer completaste el ${pct}% (${yDone}/${yTotal})`,
        items: missing.slice(0, 5),
      });
    } catch {}
  }, [hasActiveRoutine, routineData.am, routineData.pm]);

  // Auto-hide success banner after 5s
  useEffect(() => {
    if (showSuccessBanner) {
      const t = setTimeout(() => setShowSuccessBanner(false), 5000);
      return () => clearTimeout(t);
    }
  }, [showSuccessBanner]);

  // ── Premium V2 data fetching ──
  useEffect(() => {
    if (!isPremium) return;
    getActiveTravel().then(r => {
      if (r.travel && r.travel.days_left <= 0) {
        cancelTravel().then(() => {
          setActiveTravel(null);
          if (onRefreshDashboard) onRefreshDashboard();
        }).catch(() => {});
      } else {
        setActiveTravel(r.travel);
      }
    }).catch(() => {});
    getMedications().then(r => setMedications(r.medications)).catch(() => {});
    getProductUsage().then(r => setExhaustionProducts(r.products)).catch(() => {});
    getWeeklyReport().then(r => setWeeklyReport(r.report)).catch(() => {});
  }, [isPremium]);

  // ── Weather ──
  useEffect(() => {
    if (!isPremium || weatherDenied) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const w = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=uv_index_max,temperature_2m_max,precipitation_sum&timezone=auto&forecast_days=1`
        ).then(r => r.json());
        if (!w.daily) throw new Error('no data');
        const day = w.daily;
        let city = '';
        try {
          const g = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=es`,
            { headers: { 'User-Agent': 'Contrial/1.0' } }
          ).then(r => r.json());
          if (g.address?.city) city = g.address.city;
          else if (g.address?.town) city = g.address.town;
          else if (g.address?.village) city = g.address.village;
          else if (g.address?.municipality) city = g.address.municipality;
        } catch {}
        setWeather({ city, uv: day.uv_index_max[0], temp: day.temperature_2m_max[0], precip: day.precipitation_sum[0] });
      } catch { /* API error, banner stays hidden */ }
    }, () => setWeatherDenied(true), { timeout: 8000 });
  }, [isPremium, weatherDenied]);

  // ── Display values (local override for optimistic UI) ──
  const displayStreak = (dashboardData?.streak ?? 0) + localStreakOffset;
  const serverMilestones = (dashboardData?.milestones ?? []) as { date: string; text: string; icon: string }[];
  const serverKeys = new Set(serverMilestones.map(m => `${m.date}|${m.text}`));
  const uniqueLocal = localMilestones.filter(m => !serverKeys.has(`${m.date}|${m.text}`));
  const displayMilestones = [...serverMilestones, ...uniqueLocal];
  const DISPLAY_LIMIT = 10;
  const visibleMilestones = displayMilestones.slice(0, DISPLAY_LIMIT);
  if (displayMilestones.length === 0 && dashboardData) {
    console.log('[DermaPanel] No milestones — server:', serverMilestones.length, 'local:', uniqueLocal.length, 'hasRoutine:', !!dashboardData.latest_routine);
  }

  if (loading && !isAnon) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '4rem 1rem', color: colorVars.fgMuted, fontSize: 14, gap: 8,
        background: colorVars.bg, minHeight: '60vh',
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          border: `2px solid ${colorVars.border}`,
          borderTopColor: colorVars.premiumLight,
          animation: 'dermoSpin 0.8s linear infinite',
        }} />
        Cargando tu panel...
      </div>
    );
  }

  return (
    <div style={{
      background: colorVars.bg, color: colorVars.fg,
      padding: '1.25rem 0.85rem 2.5rem',
      maxWidth: 780, margin: '0 auto',
    }}>
      {/* ── Anonymous Header (Paywall-style) ── */}
      {isAnon ? (
        <>
          <div style={{
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
                onClick={() => onShowPaywall?.('login')}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: `1px solid ${colorVars.border}`,
                  background: 'transparent', color: colorVars.fgMuted,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Iniciar sesión
              </button>
              <button
                onClick={() => onShowPaywall?.('register')}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: 'none',
                  background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                  color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Crear Cuenta Gratis
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 style={{
              fontSize: 28, fontWeight: 800, lineHeight: 1.15, margin: '0 0 0.5rem',
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

          {/* Social Proof Bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '1.25rem', marginBottom: '1.25rem',
            padding: '0.5rem 0.75rem', borderRadius: 10,
            background: colorVars.surfaceHover, flexWrap: 'wrap',
          }}>
            {[
              { icon: <FlaskConical size={13} />, label: '+2.400 análisis' },
              { icon: <Star size={13} color={colorVars.gold} />, label: '4.9/5' },
              { icon: <Users size={13} />, label: '567 usuarios' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                fontSize: 12, fontWeight: 600, color: colorVars.fgMuted,
              }}>
                {item.icon} {item.label}
              </div>
            ))}
          </div>

        </>
      ) : (
        <>
          {/* ── Header (authenticated) ── */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.25, marginBottom: '0.15rem' }}>
              {getGreeting()}, {name.split(' ')[0]}.
              {isPremium && improvement > 0 && (
                <span style={{ color: colorVars.premiumLight }}> Tu piel ha mejorado un {improvement}% este mes.</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
              {isPremium ? (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 700, color: colorVars.gold,
                  padding: '2px 10px', borderRadius: 20,
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(251,191,36,0.12))',
                  border: '1px solid rgba(251,191,36,0.25)',
                }}>
                  <Crown size={11} /> Premium
                </span>
              ) : (
                <span style={{
                  fontSize: 11, fontWeight: 600, color: colorVars.fgDim,
                  padding: '2px 10px', borderRadius: 20,
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${colorVars.border}`,
                }}>
                  Plan Gratuito
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Search bar (visible siempre) ── */}
      <div style={{
        background: colorVars.surface, borderRadius: 14, border: `1px solid ${colorVars.border}`,
        padding: '0.85rem', marginBottom: '1rem',
      }}>
        {isFree && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            fontSize: 12, fontWeight: 600, color: colorVars.premiumLight,
            padding: '0.4rem 0.6rem', borderRadius: 8,
            background: colorVars.premiumGlow,
            marginBottom: '0.6rem',
          }}>
            <MessageCircle size={13} />
            {consultasRestantes > 0
              ? `Te quedan ${consultasRestantes} consulta${consultasRestantes !== 1 ? 's' : ''} gratuita${consultasRestantes !== 1 ? 's' : ''}`
              : 'Has agotado tus consultas gratuitas'}
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); if (searchQuery.trim()) { if (isAnon) { handleAnonSearch(searchQuery.trim()); } else { onSearch(searchQuery.trim()); } } }} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); if (isAnon) setAnonPreview(null); }}
            placeholder={'Buscar producto o ingrediente...'}
            style={{
              flex: 1, fontSize: 14, padding: '0.6rem 0.85rem',
              borderRadius: 10, border: `1px solid ${colorVars.border}`,
              background: colorVars.bg, color: colorVars.fg, outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            disabled={anonLoading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0.6rem 1rem', borderRadius: 10, border: 'none',
              background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: anonLoading ? 'default' : 'pointer',
              fontFamily: 'inherit', gap: '0.3rem', opacity: anonLoading ? 0.65 : 1,
            }}
          >
            {anonLoading ? <Clock size={15} /> : <Search size={15} />} {anonLoading ? 'Analizando...' : 'Buscar'}
          </button>
        </form>
        {isAnon && anonPreview && (
          <div style={{
            marginTop: '0.6rem', padding: '0.65rem', borderRadius: 10,
            background: colorVars.bg, border: `1px solid ${colorVars.border}`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: '0.35rem', color: colorVars.fg }}>
              {anonPreview.productName}
            </div>
            <div style={{ fontSize: 12, color: colorVars.fgMuted, lineHeight: 1.6 }}>
              {anonPreview.lines.slice(0, 3).map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.25rem', alignItems: 'baseline' }}>
                  <span style={{ color: line.includes('Precaución') ? colorVars.warning : line.includes('Evitar') ? colorVars.danger : colorVars.success }}>●</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
            <div
              onClick={() => onShowPaywall?.('register')}
              style={{
                marginTop: '0.5rem', padding: '0.4rem 0.6rem', borderRadius: 8,
                background: colorVars.premiumGlow, textAlign: 'center',
                fontSize: 11, color: colorVars.premiumLight, fontWeight: 700,
                cursor: 'pointer', transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              Crea tu cuenta gratis para ver el análisis completo
            </div>
          </div>
        )}
      </div>

      {isAnon && (
        <>
          {/* CTA Principal */}
          <button
            onClick={() => onShowPaywall?.('register')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              width: '100%', padding: '0.85rem 1.25rem', marginBottom: '1rem',
              borderRadius: 14, border: 'none',
              background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
              color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'inherit', letterSpacing: '-0.01em',
              boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
            }}
          >
            Diagnosticar Mi Piel con IA <ArrowRight size={18} />
          </button>

          {/* Grid de 4 Pilares */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
            marginBottom: '1rem',
          }}>
            {[
              { icon: <FlaskConical size={15} />, title: 'Analizador INCI', desc: 'Escanea ingredientes al instante', accent: colorVars.premiumLight },
              { icon: <BarChart3 size={15} />, title: 'Diagnóstico IA', desc: 'Analiza tu tipo de piel', accent: colorVars.success },
              { icon: <Sun size={15} />, title: 'Rutinas AM/PM', desc: 'Plan diario personalizado', accent: colorVars.gold },
              { icon: <ShieldAlert size={15} />, title: 'Alertas Seguridad', desc: 'Evita mezclas peligrosas', accent: colorVars.danger },
            ].map((item, i) => (
              <div
                key={i}
                onClick={() => onShowPaywall?.('register')}
                style={{
                  padding: '0.7rem', borderRadius: 12,
                  background: `linear-gradient(135deg, ${item.accent}10, rgba(59,130,246,0.04))`,
                  border: `1px solid ${colorVars.border}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${item.accent}30`; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = colorVars.border; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: `${item.accent}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: item.accent, marginBottom: '0.3rem',
                }}>
                  {item.icon}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: '0.05rem' }}>{item.title}</div>
                <div style={{ fontSize: 11, color: colorVars.fgMuted, lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            ))}
          </div>

          {/* Banner Compatibilidad */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 0.85rem', borderRadius: 12, marginBottom: '1rem',
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.2)',
            flexWrap: 'wrap',
          }}>
            <ShieldAlert size={18} color={colorVars.success} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: colorVars.fgMuted, lineHeight: 1.5, flex: 1 }}>
              <strong style={{ color: colorVars.fg }}>¿Tomas medicamentos?</strong> Nuestra IA analiza la compatibilidad con tu rutina cosmética al crear tu cuenta.
            </div>
          </div>

          {/* Footer CTA */}
          <div style={{
            background: `linear-gradient(135deg, ${colorVars.premiumGlow}, rgba(139,92,246,0.03))`,
            borderRadius: 14, border: `1px solid ${colorVars.border}`,
            padding: '1rem 1.25rem', marginBottom: '0.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '0.75rem', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={20} color={colorVars.premiumLight} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: colorVars.fg }}>Crea tu cuenta gratis</div>
                <div style={{ fontSize: 12, color: colorVars.fgMuted }}>2 análisis gratuitos al registrarte</div>
              </div>
            </div>
            <button
              onClick={() => onShowPaywall?.('register')}
              style={{
                padding: '0.55rem 1.25rem', borderRadius: 10, border: 'none',
                background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >
              Crear Cuenta Gratis
            </button>
          </div>
        </>
      )}

      {!isAnon && (<>
      {/* ── TOP ROW: Skin Score + Safety Alerts ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem',
        marginBottom: '1rem', alignItems: 'start',
      }}>
        {/* Skin Score + mini metrics */}
        <div>
          <div style={{
            background: colorVars.surface, borderRadius: 14,
            border: `1px solid ${colorVars.border}`,
            padding: '0.85rem', marginBottom: '0.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ProgressRing score={score} size={72} strokeWidth={5} />
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
                  {score}<span style={{ fontSize: 14, color: colorVars.fgMuted, fontWeight: 600 }}>/100</span>
                </div>
                <div style={{ fontSize: 12, color: colorVars.fgMuted, marginTop: '0.1rem' }}>Skin Score</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.35rem' }}>
                  <div style={{
                    flex: 1, height: 3, borderRadius: 2, background: colorVars.surfaceHover, overflow: 'hidden', maxWidth: 80,
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      background: `linear-gradient(90deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                      width: `${consistency}%`, transition: 'width 0.6s ease-out',
                    }} />
                  </div>
                  <span style={{ fontSize: 10, color: colorVars.fgDim }}>Constancia {consistency}%</span>
                </div>
              </div>
            </div>
          </div>
          {/* Mini row: racha + meta */}
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <div style={{
              flex: 1, background: colorVars.surface, borderRadius: 10,
              border: `1px solid ${colorVars.border}`, padding: '0.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.1rem' }}>
                <Flame size={11} color={colorVars.warning} />
                <span style={{ fontSize: 10, color: colorVars.fgMuted }}>Racha</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{displayStreak}<span style={{ fontSize: 10, color: colorVars.fgMuted, fontWeight: 500 }}>d</span></div>
            </div>
            <div style={{
              flex: 1, background: colorVars.surface, borderRadius: 10,
              border: `1px solid ${colorVars.border}`, padding: '0.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.1rem' }}>
                <Target size={11} color={colorVars.success} />
                <span style={{ fontSize: 10, color: colorVars.fgMuted }}>Meta</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{metaPercent}%</div>
            </div>
          </div>
        </div>

        {/* Safety Alerts */}
        <div>
          <div style={{
            background: colorVars.surface, borderRadius: 14,
            border: `1px solid ${colorVars.border}`,
            padding: '0.85rem', height: '100%',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Star size={14} color={colorVars.premiumLight} /> Alertas de Seguridad
              {(isFree || isAnon) && <PremiumBadge />}
            </div>
            <SafetyAlerts alerts={safetyAlerts} isFree={isFree || isAnon} />
          </div>
        </div>
      </div>

      {/* ── Weather ── */}
      {isPremium && weather && (
        <div style={{
          background: weather.uv >= 8 ? 'rgba(239,68,68,0.08)' : weather.uv >= 5 ? 'rgba(251,191,36,0.08)' : 'rgba(16,185,129,0.08)',
          borderRadius: 14, border: `1px solid ${
            weather.uv >= 8 ? 'rgba(239,68,68,0.2)' : weather.uv >= 5 ? 'rgba(251,191,36,0.2)' : 'rgba(16,185,129,0.2)'
          }`, padding: '0.7rem 1rem', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: colorVars.fg }}>
              📍 {weather.city || 'Tu ubicación'} · {new Date().toLocaleDateString('es-ES', { day:'numeric', month:'short' })}
            </div>
            <div style={{ fontSize: 12, color: colorVars.fgMuted, marginTop: '0.15rem' }}>
              ☀️ UV {weather.uv}/10 · 🌡️ {weather.temp}°C · 🌧️ {weather.precip}mm
            </div>
          </div>
          <div style={{
            fontSize: 12, fontWeight: 700,
            color: weather.uv >= 8 ? '#EF4444' : weather.uv >= 5 ? '#FBBF24' : '#34D399',
            textAlign: 'right', maxWidth: '11rem',
          }}>
            {weather.uv >= 8 ? 'Protección solar esencial' :
             weather.uv >= 5 ? 'Protección solar recomendada' :
             'Hoy tu piel está tranquila'}
          </div>
        </div>
      )}

      {/* ── MODO VACACIONES ── */}
      <div style={{
        background: `linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.06))`,
        borderRadius: 14, border: `1px solid rgba(59,130,246,0.2)`,
        padding: '0.85rem', marginBottom: '1rem', position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plane size={16} color="#60A5FA" />
            <span style={{ fontSize: 14, fontWeight: 700, color: colorVars.fg }}>Modo Vacaciones</span>
            {(isFree || isAnon) && <PremiumBadge />}
          </div>
          {!activeTravel && (
            <button
              onClick={isPremium ? () => { setShowTravelModal(true); logKpiEvent('vacation_mode_enabled'); } : () => onShowPaywall?.('register')}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: 8, border: 'none',
                background: isPremium ? `linear-gradient(135deg, #3B82F6, #8B5CF6)` : colorVars.surfaceHover,
                color: isPremium ? '#fff' : colorVars.fgDim,
                fontSize: 12, fontWeight: 700, cursor: isPremium ? 'pointer' : 'pointer', fontFamily: 'inherit',
                opacity: isPremium ? 1 : 0.6,
              }}
            >
              Planificar viaje
            </button>
          )}
        </div>
        {activeTravel ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: colorVars.fg }}>
              ✈️ {activeTravel.destination}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: 11, color: colorVars.fgMuted }}>
              <span>🗓️ {new Date(activeTravel.start_date).toLocaleDateString('es-ES')} — {new Date(activeTravel.end_date).toLocaleDateString('es-ES')}</span>
              <span>🎒 {activeTravel.travel_type}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: activeTravel.days_left <= 3 ? '#EF4444' : activeTravel.days_left <= 7 ? '#FBBF24' : '#34D399',
              }}>
                {activeTravel.days_left} días restantes
              </span>
              <button onClick={isPremium ? () => setShowTravelRoutine(true) : () => onShowPaywall?.('register')} style={{
                padding: '0.25rem 0.6rem', borderRadius: 6, border: 'none',
                background: isPremium ? 'rgba(59,130,246,0.15)' : colorVars.surfaceHover,
                color: isPremium ? '#60A5FA' : colorVars.fgDim,
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: isPremium ? 1 : 0.6,
              }}>
                Ver rutina
              </button>
              <button onClick={isPremium ? async () => {
                try {
                  await cancelTravel()
                  setActiveTravel(null)
                  if (onRefreshDashboard) await onRefreshDashboard()
                } catch {}
              } : () => onShowPaywall?.('register')} style={{
                padding: '0.25rem 0.6rem', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)',
                background: isPremium ? 'rgba(239,68,68,0.08)' : colorVars.surfaceHover,
                color: isPremium ? '#EF4444' : colorVars.fgDim,
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: isPremium ? 1 : 0.6,
              }}>
                Finalizar viaje
              </button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: colorVars.fgMuted }}>
            Crea una rutina adaptada a tu próximo destino
          </div>
        )}
      </div>

      {/* ── MEDICAMENTOS ACTIVOS ── */}
      <div style={{
        background: colorVars.surface, borderRadius: 14, border: `1px solid ${colorVars.border}`,
        padding: '0.85rem', marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Pill size={16} color={colorVars.accent} />
            <span style={{ fontSize: 14, fontWeight: 700, color: colorVars.fg }}>Medicamentos Activos</span>
            {(isFree || isAnon) && <PremiumBadge />}
          </div>
          <button
            onClick={isPremium ? () => setShowMedModal(true) : () => onShowPaywall?.('register')}
            style={{
              padding: '0.35rem 0.75rem', borderRadius: 8, border: 'none',
              background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Plus size={13} style={{ verticalAlign: 'middle', marginRight: 2 }} /> Añadir
            </button>
          </div>
          {medications.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {medications.map(med => (
                <div key={med.id}>
                  <div
                    onClick={() => setExpandedMedId(expandedMedId === med.id ? null : med.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 0.6rem', borderRadius: expandedMedId === med.id ? '10px 10px 0 0' : 10,
                      background: med.compatibility_result?.compatible ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                      border: `1px solid ${
                        med.compatibility_result?.compatible
                          ? 'rgba(16,185,129,0.2)'
                          : 'rgba(239,68,68,0.2)'
                      }`,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: med.compatibility_result?.compatible ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    }}>
                      {med.compatibility_result?.compatible
                        ? <Check size={14} color="#34D399" />
                        : <AlertTriangle size={14} color="#EF4444" />
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: colorVars.fg }}>{med.medicine_name}</div>
                      {med.active_ingredient && (
                        <div style={{ fontSize: 11, color: colorVars.fgMuted }}>{med.active_ingredient}</div>
                      )}
                      {med.compatibility_result && !med.compatibility_result.compatible && (
                        <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                          {med.compatibility_result.fotosensibilidad && (
                            <span style={{ fontSize: 10, fontWeight: 600, color: '#EF4444', padding: '1px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.1)' }}>
                              Fotosensibilidad
                            </span>
                          )}
                          {med.compatibility_result.irritacion && (
                            <span style={{ fontSize: 10, fontWeight: 600, color: '#F59E0B', padding: '1px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.1)' }}>
                              Irritación
                            </span>
                          )}
                          {med.compatibility_result.sequedad && (
                            <span style={{ fontSize: 10, fontWeight: 600, color: '#60A5FA', padding: '1px 6px', borderRadius: 4, background: 'rgba(96,165,250,0.1)' }}>
                              Sequedad
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      {!med.compatibility_result?.compatible && (
                        <AlertCircle size={13} color="#EF4444" />
                      )}
                      <ChevronDown size={14} color={colorVars.fgDim} style={{
                        transform: expandedMedId === med.id ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }} />
                    </div>
                    <button onClick={e => { e.stopPropagation(); removeMedication(med.id); setMedications(prev => prev.filter(m => m.id !== med.id)); }} style={{
                      background: 'none', border: 'none', color: colorVars.fgDim, cursor: 'pointer', padding: 4,
                    }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {expandedMedId === med.id && med.compatibility_result && (() => {
                    const cr = med.compatibility_result!;
                    return (
                    <div style={{
                      padding: '0.65rem 0.75rem',
                      background: 'rgba(0,0,0,0.15)',
                      border: `1px solid ${cr.compatible ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                      borderTop: 'none',
                      borderRadius: '0 0 10px 10px',
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: colorVars.fgMuted,
                    }}>
                      {cr.details.map((d, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.35rem', marginBottom: i < cr.details.length - 1 ? '0.35rem' : 0 }}>
                          <span style={{ color: d.startsWith('No se detectaron') ? '#34D399' : '#EF4444', flexShrink: 0 }}>
                            {d.startsWith('No se detectaron') ? '✅' : '⚠️'}
                          </span>
                          <span>{d}</span>
                        </div>
                      ))}
                      {!cr.compatible && (
                        <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.5rem', borderRadius: 6, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: colorVars.premiumLight, marginBottom: '0.2rem' }}>Recomendación</div>
                          <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: 11, color: colorVars.fgDim }}>
                            {cr.fotosensibilidad && <li>Usa protección solar SPF50+ todas las mañanas, incluso en días nublados</li>}
                            {cr.irritacion && <li>Aplica productos con retinoides solo por la noche para reducir irritación</li>}
                            {cr.sequedad && <li>Añade una crema hidratante reparadora con ceramidas o ácido hialurónico</li>}
                            {!cr.fotosensibilidad && !cr.irritacion && !cr.sequedad && <li>Consulta con tu dermatólogo si notas algún cambio en tu piel</li>}
                          </ul>
                        </div>
                      )}
                    </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: colorVars.fgMuted, textAlign: 'center', padding: '0.5rem' }}>
              No hay medicamentos registrados. Añade los que tomes para analizar compatibilidad con tu rutina.
            </div>
          )}
        </div>

      {/* ── BOTTOM ROW: Rutina de Hoy + Timeline ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem',
        alignItems: 'start',
      }}>
        {/* LEFT: Mi Rutina de Hoy */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={15} color={colorVars.premiumLight} /> Mi Rutina de Hoy
            </div>
            {hasActiveRoutine && (
              <button onClick={handleOpenHistory} style={{
                background: 'none', border: 'none', color: colorVars.fgMuted,
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', textDecoration: 'underline',
                padding: 0,
              }}>
                Ver historial
              </button>
            )}
          </div>
          {hasActiveRoutine && routineName && (
            <div style={{ fontSize: 11, color: colorVars.premiumLight, marginBottom: '0.5rem', fontWeight: 600 }}>
              {routineName}{routineDateStr ? ` · Creada el ${routineDateStr}` : ''}
            </div>
          )}
          {yesterdayIncomplete && (
            <div style={{
              padding: '0.5rem 0.75rem', borderRadius: 10, marginBottom: '0.5rem',
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.25)',
              fontSize: 12, color: '#FBBF24', lineHeight: 1.5,
              display: 'flex', flexDirection: 'column', gap: '0.25rem',
            }}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>
                {yesterdayIncomplete.label}
              </div>
              {yesterdayIncomplete.items.length > 0 && (
                <div style={{ fontSize: 11, opacity: 0.85 }}>
                  Te faltaron: {yesterdayIncomplete.items.join(', ')}
                </div>
              )}
            </div>
          )}
          {showSuccessBanner && (
            <div style={{
              padding: '0.5rem 0.75rem', borderRadius: 10, marginBottom: '0.5rem',
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.25)',
              fontSize: 13, fontWeight: 700, color: '#34D399',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}>
              Rutina completada hoy!
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {routineData.am.length > 0 ? (
              <RoutineChecklist
                items={routineData.am}
                label="Rutina AM (Mañana)"
                icon={<Sun size={14} color="#FBBF24" />}
                accentColor="#FBBF24"
                checked={checkedItems}
                onToggle={handleToggleItem}
                collapsed={!isMorning}
                conflicts={conflictingProducts}
              />
            ) : null}
            {routineData.pm.length > 0 ? (
              <RoutineChecklist
                items={routineData.pm}
                label="Rutina PM (Noche)"
                icon={<Moon size={14} color="#60A5FA" />}
                accentColor="#60A5FA"
                checked={checkedItems}
                onToggle={handleToggleItem}
                collapsed={isMorning}
                conflicts={conflictingProducts}
              />
            ) : null}
          </div>
          {routineData.am.length === 0 && routineData.pm.length === 0 && (
            <div style={{
              marginTop: '0.5rem', padding: '0.6rem', borderRadius: 10,
              background: colorVars.premiumGlow, textAlign: 'center',
              fontSize: 12, color: colorVars.fgMuted,
            }}>
              ¿Primera vez?{' '}
              {isPremium ? (
                <button onClick={handleStartQuizClick} style={{
                  background: 'none', border: 'none', color: colorVars.premiumLight,
                  fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
                  textDecoration: 'underline',
                }}>Haz el Test de Piel</button>
              ) : (
                <span style={{ color: colorVars.premiumLight, fontWeight: 600 }}>
                  Haz el Test de Piel (Premium)
                </span>
              )} para obtener tu rutina personalizada.
            </div>
          )}
        </div>

        {/* RIGHT: Timeline + Reajuste IA */}
        <div>
          {/* Timeline */}
          <div style={{
            background: colorVars.surface, borderRadius: 14, border: `1px solid ${colorVars.border}`,
            padding: '0.85rem', marginBottom: '0.5rem',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={15} color={colorVars.accent} /> Timeline de Hitos
              {(isFree || isAnon) && <PremiumBadge />}
            </div>
            {displayMilestones.length > 0 ? (
              <>
                <MilestoneTimeline milestones={visibleMilestones} />
                {displayMilestones.length > DISPLAY_LIMIT && (
                  <button onClick={isPremium ? () => setShowAllMilestones(true) : () => onShowPaywall?.('register')} style={{
                    display: 'block', width: '100', marginTop: '0.5rem', padding: '0.4rem 0.75rem',
                    borderRadius: 8, border: `1px solid ${colorVars.border}`,
                    background: colorVars.surfaceHover, color: isPremium ? colorVars.premiumLight : colorVars.fgDim,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    textAlign: 'center', opacity: isPremium ? 1 : 0.6,
                  }}>
                    Ver todos los hitos ({displayMilestones.length})
                  </button>
                )}
              </>
            ) : (
              <div style={{ fontSize: 12, color: colorVars.fgMuted, textAlign: 'center', padding: '1rem' }}>
                Comienza a usar la IA para ver tu timeline
              </div>
            )}
          </div>

          {/* Reajustar con IA */}
          <div style={{
            background: colorVars.surface, borderRadius: 14, border: `1px solid ${colorVars.border}`,
            padding: '0.75rem', textAlign: 'center',
          }}>
            <button
              onClick={isPremium ? handleStartQuizClick : () => onShowPaywall?.('register')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.55rem 1.2rem', borderRadius: 10, border: 'none',
                background: isPremium ? `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})` : colorVars.surfaceHover,
                color: isPremium ? '#fff' : colorVars.fgDim,
                fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', opacity: isPremium ? 1 : 0.6,
              }}
            >
              <RefreshCw size={14} /> Reajustar mi rutina con IA
            </button>
            <div style={{ fontSize: 11, color: colorVars.fgMuted, marginTop: '0.35rem' }}>
              Actualiza tu rutina según tu evolución
            </div>
          </div>
        </div>
      </div>

      {/* ── SKIN COACH SEMANAL ── */}
      <div style={{
        background: `linear-gradient(135deg, ${colorVars.premiumGlow}, rgba(139,92,246,0.03))`,
        borderRadius: 14, border: `1px solid ${colorVars.border}`,
        padding: '0.85rem', marginTop: '1rem', marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
          <BarChart3 size={16} color={colorVars.premiumLight} />
          <span style={{ fontSize: 14, fontWeight: 700, color: colorVars.fg }}>Skin Coach Semanal</span>
          {(isFree || isAnon) && <PremiumBadge />}
        </div>
        {reportLoading ? (
          <div style={{ fontSize: 12, color: colorVars.fgMuted }}>Cargando informe...</div>
        ) : weeklyReport ? (
          <div>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.6rem' }}>
              <div style={{ flex: 1, background: colorVars.surface, borderRadius: 10, padding: '0.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: colorVars.fgMuted }}>Antes</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: colorVars.fg }}>
                  {weeklyReport.score_before}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {weeklyReport.score_after >= weeklyReport.score_before
                  ? <TrendingUp size={20} color="#34D399" />
                  : <TrendingDown size={20} color="#EF4444" />
                }
              </div>
              <div style={{ flex: 1, background: colorVars.surface, borderRadius: 10, padding: '0.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: colorVars.fgMuted }}>Ahora</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: colorVars.fg }}>
                  {weeklyReport.score_after}
                </div>
              </div>
              <div style={{ flex: 1, background: colorVars.surface, borderRadius: 10, padding: '0.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: colorVars.fgMuted }}>Constancia</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: colorVars.fg }}>
                  {weeklyReport.completion_rate}%
                </div>
              </div>
            </div>
            <div style={{
              background: colorVars.surface, borderRadius: 10, padding: '0.65rem',
              marginBottom: '0.5rem',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: colorVars.fg, marginBottom: '0.3rem' }}>
                {weeklyReport.report_json.summary}
              </div>
              {weeklyReport.report_json.insights?.slice(0, 2).map((insight, i) => (
                <div key={i} style={{ fontSize: 11, color: colorVars.fgMuted, paddingLeft: '0.5rem', marginTop: '0.15rem' }}>
                  • {insight}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: colorVars.fgMuted, textAlign: 'center', padding: '0.75rem' }}>
            Tu informe semanal se genera automáticamente los domingos. Vuelve el lunes para ver tu primera evaluación.
          </div>
        )}
      </div>

      {/* ── PRODUCTOS PRÓXIMOS A AGOTARSE ── */}
      <div style={{
        background: colorVars.surface, borderRadius: 14, border: `1px solid ${colorVars.border}`,
        padding: '0.85rem', marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Package size={16} color={colorVars.warning} />
            <span style={{ fontSize: 14, fontWeight: 700, color: colorVars.fg }}>Control de Agotamiento</span>
            {(isFree || isAnon) && <PremiumBadge />}
          </div>
          <button
            onClick={isPremium ? () => setShowUsageModal(true) : () => onShowPaywall?.('register')}
            style={{
              padding: '0.35rem 0.75rem', borderRadius: 8, border: 'none',
              background: isPremium ? `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})` : colorVars.surfaceHover,
              color: isPremium ? '#fff' : colorVars.fgDim,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: isPremium ? 1 : 0.6,
            }}>
            <Plus size={13} style={{ verticalAlign: 'middle', marginRight: 2 }} /> Añadir
          </button>
        </div>
        {exhaustionProducts.length > 0 && (
          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.6rem' }}>
            <div style={{ flex: 1, padding: '0.35rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)', textAlign: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444' }}>🔴 {exhaustionProducts.filter(p => p.status === 'critical').length}</span>
              <span style={{ fontSize: 9, color: colorVars.fgMuted, display: 'block' }}>Critical</span>
            </div>
            <div style={{ flex: 1, padding: '0.35rem', borderRadius: 8, background: 'rgba(245,158,11,0.1)', textAlign: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#FBBF24' }}>🟠 {exhaustionProducts.filter(p => p.status === 'warning').length}</span>
              <span style={{ fontSize: 9, color: colorVars.fgMuted, display: 'block' }}>Warning</span>
            </div>
            <div style={{ flex: 1, padding: '0.35rem', borderRadius: 8, background: 'rgba(16,185,129,0.1)', textAlign: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#34D399' }}>🟢 {exhaustionProducts.filter(p => p.status === 'ok').length}</span>
              <span style={{ fontSize: 9, color: colorVars.fgMuted, display: 'block' }}>OK</span>
            </div>
          </div>
        )}
        {exhaustionProducts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {exhaustionProducts.slice(0, 5).map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.45rem 0.6rem', borderRadius: 8,
                background: p.status === 'critical' ? 'rgba(239,68,68,0.06)' : p.status === 'warning' ? 'rgba(245,158,11,0.06)' : 'transparent',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colorVars.fg }}>{p.product_name}</div>
                  <div style={{ fontSize: 11, color: colorVars.fgMuted }}>
                    {p.size_ml}{p.unit || 'ml'} · {p.days_left} días restantes
                  </div>
                </div>
                <div style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                  background: p.status === 'critical' ? 'rgba(239,68,68,0.15)' : p.status === 'warning' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                  color: p.status === 'critical' ? '#EF4444' : p.status === 'warning' ? '#FBBF24' : '#34D399',
                }}>
                  {p.status === 'critical' ? 'CRITICAL' : p.status === 'warning' ? 'WARNING' : 'OK'}
                </div>
                <button onClick={() => { removeProductUsage(p.id); setExhaustionProducts(prev => prev.filter(x => x.id !== p.id)); }} style={{
                  background: 'none', border: 'none', color: colorVars.fgDim, cursor: 'pointer', padding: 4,
                }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: colorVars.fgMuted, textAlign: 'center', padding: '0.5rem' }}>
            Añade tus productos cosméticos para saber cuándo se agotarán.
          </div>
        )}
      </div>

      {/* ── Quick actions ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          padding: '0.65rem', borderRadius: 12,
          background: colorVars.surfaceHover,
          border: `1px solid ${colorVars.border}`, cursor: 'default',
          color: colorVars.fgDim, fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
          opacity: 0.6,
        }}>
          <Clock size={16} color={colorVars.fgDim} />
          Pendiente de asignar
        </button>
        <button onClick={handleStartQuizClick} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          padding: '0.65rem', borderRadius: 12,
          background: `linear-gradient(135deg, ${colorVars.premiumGlow}, rgba(167,139,250,0.06))`,
          border: `1px solid ${colorVars.border}`, cursor: 'pointer',
          color: colorVars.fg, fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
        }}>
          <Sparkles size={16} color={colorVars.premiumLight} />
          Test de Piel
        </button>
      </div>

      </>)}
      {/* ── Regenerate confirmation modal ── */}
      {showRegenConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 80,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
          animation: 'dermoFadeIn 0.2s ease-out',
        }} onClick={() => setShowRegenConfirm(false)}>
          <div style={{
            background: colorVars.surface, borderRadius: 16,
            border: `1px solid ${colorVars.border}`,
            padding: '1.5rem', maxWidth: 380, width: '90%', textAlign: 'center',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, color: colorVars.fg, marginBottom: '0.5rem' }}>
              Generar nueva rutina
            </div>
            <p style={{ fontSize: 13, color: colorVars.fgMuted, margin: '0 0 1.25rem', lineHeight: 1.5 }}>
              Al generar una nueva rutina, la actual se archivará y los checkboxes del día de hoy se reiniciarán. Puedes consultar tus rutinas anteriores desde el historial.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={() => setShowRegenConfirm(false)} style={{
                padding: '0.6rem 1.25rem', borderRadius: 10,
                border: `1px solid ${colorVars.border}`,
                background: 'transparent', color: colorVars.fgMuted,
                fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Cancelar
              </button>
              <button onClick={handleConfirmRegen} style={{
                padding: '0.6rem 1.25rem', borderRadius: 10, border: 'none',
                background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Generar nueva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Restore confirmation modal ── */}
      {restoreTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 85,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
          animation: 'dermoFadeIn 0.2s ease-out',
        }} onClick={() => { setRestoreTarget(null); setRestoreError(''); }}>
          <div style={{
            background: colorVars.surface, borderRadius: 16,
            border: `1px solid ${colorVars.border}`,
            padding: '1.5rem', maxWidth: 380, width: '90%', textAlign: 'center',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, color: colorVars.fg, marginBottom: '0.5rem' }}>
              Restaurar rutina
            </div>
            <p style={{ fontSize: 13, color: colorVars.fgMuted, margin: '0 0 0.5rem', lineHeight: 1.5 }}>
              Se va a restaurar la rutina:
            </p>
            <div style={{
              fontSize: 14, fontWeight: 700, color: colorVars.premiumLight,
              marginBottom: '1rem',
            }}>
              {restoreTarget.name || 'Rutina personalizada'}
            </div>
            <p style={{ fontSize: 13, color: colorVars.warning, margin: '0 0 1.25rem', lineHeight: 1.5 }}>
              La rutina actual se archivará y esta pasará a ser tu rutina activa.
            </p>
            {restoreError && (
              <div style={{ color: colorVars.danger, fontSize: 12, marginBottom: '0.75rem' }}>
                {restoreError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={() => { setRestoreTarget(null); setRestoreError(''); }} style={{
                padding: '0.6rem 1.25rem', borderRadius: 10,
                border: `1px solid ${colorVars.border}`,
                background: 'transparent', color: colorVars.fgMuted,
                fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Cancelar
              </button>
              <button onClick={handleConfirmRestore} disabled={restoringId !== null} style={{
                padding: '0.6rem 1.25rem', borderRadius: 10, border: 'none',
                background: restoringId !== null
                  ? colorVars.surfaceHover
                  : `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: restoringId !== null ? 'not-allowed' : 'pointer',
                opacity: restoringId !== null ? 0.6 : 1,
                fontFamily: 'inherit',
              }}>
                {restoringId !== null ? 'Restaurando...' : 'Sí, restaurar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Travel routine modal ── */}
      {showTravelRoutine && activeTravel?.generated_routine && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 80,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
          animation: 'dermoFadeIn 0.2s ease-out',
        }} onClick={() => setShowTravelRoutine(false)}>
          <div style={{
            background: colorVars.surface, borderRadius: 16,
            border: `1px solid ${colorVars.border}`,
            padding: '1.5rem', maxWidth: 420, width: '90%', maxHeight: '80vh',
            overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: colorVars.fg }}>
                ✈️ Rutina de viaje — {activeTravel.destination}
              </div>
              <button onClick={() => setShowTravelRoutine(false)} style={{
                width: 32, height: 32, borderRadius: '50%',
                border: `1px solid ${colorVars.border}`,
                background: colorVars.surface, color: colorVars.fg,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontFamily: 'inherit',
              }}>
                &times;
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activeTravel.generated_routine.am_routine?.map((step, i) => (
                <div key={`am-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'rgba(251,191,36,0.15)', color: '#FBBF24',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>{step.order}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: colorVars.fg, wordBreak: 'break-word' }}>{step.productName}</div>
                    <div style={{ fontSize: 11, color: colorVars.fgMuted }}>☀️ {step.step}</div>
                  </div>
                </div>
              ))}
              {activeTravel.generated_routine.pm_routine?.map((step, i) => (
                <div key={`pm-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'rgba(96,165,250,0.15)', color: '#60A5FA',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>{step.order}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: colorVars.fg, wordBreak: 'break-word' }}>{step.productName}</div>
                    <div style={{ fontSize: 11, color: colorVars.fgMuted }}>🌙 {step.step}</div>
                  </div>
                </div>
              ))}
              {activeTravel.generated_routine.explanation && (
                <div style={{
                  marginTop: '0.5rem', padding: '0.65rem', borderRadius: 10,
                  background: colorVars.bg, fontSize: 12, color: colorVars.fgMuted, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                }}>
                  {activeTravel.generated_routine.explanation}
                </div>
              )}
              <button onClick={() => { setShowTravelRoutine(false); if (onRefreshDashboard) onRefreshDashboard(); }} style={{
                display: 'block', width: '100%', marginTop: '0.75rem', padding: '0.6rem',
                borderRadius: 10, border: 'none',
                background: `linear-gradient(135deg, #3B82F6, #8B5CF6)`, color: '#fff',
                fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                ✅ Aceptar rutina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── All milestones modal ── */}
      {showAllMilestones && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 80,
          display: 'flex', flexDirection: 'column',
          background: colorVars.bg,
          animation: 'dermoFadeIn 0.2s ease-out',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.85rem 1rem', borderBottom: `1px solid ${colorVars.border}`,
          }}>
            <button onClick={() => setShowAllMilestones(false)} style={{
              width: 32, height: 32, borderRadius: '50%',
              border: `1px solid ${colorVars.border}`,
              background: colorVars.surface, color: colorVars.fg,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
            }}>
              <ArrowLeft size={16} />
            </button>
            <span style={{ fontSize: 16, fontWeight: 700, color: colorVars.fg }}>
              Timeline de Hitos
            </span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            <MilestoneTimeline milestones={displayMilestones} />
          </div>
        </div>
      )}

      {/* ── Travel modal ── */}
      {showTravelModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 80,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
          animation: 'dermoFadeIn 0.2s ease-out',
        }} onClick={() => { if (!travelGenerating) setShowTravelModal(false); }}>
          <div style={{
            background: colorVars.surface, borderRadius: 16,
            border: `1px solid ${colorVars.border}`,
            padding: '1.5rem', maxWidth: 400, width: '90%',
          }} onClick={e => e.stopPropagation()}>
            {travelGenerating ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', margin: '0 auto 1rem',
                  border: `3px solid ${colorVars.surfaceHover}`,
                  borderTopColor: colorVars.premiumLight,
                  animation: 'dermoSpin 0.8s linear infinite',
                }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: colorVars.fg, marginBottom: '0.5rem' }}>
                  Generando rutina de viaje...
                </div>
                <div style={{ fontSize: 12, color: colorVars.fgMuted, lineHeight: 1.5 }}>
                  Estamos analizando el clima y condiciones de tu destino para crear una rutina personalizada. Espera por favor...
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
            ) : (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: colorVars.fg, marginBottom: '0.5rem' }}>
                  Planificar viaje
                </div>
                <p style={{ fontSize: 12, color: colorVars.fgMuted, margin: '0 0 1rem', lineHeight: 1.5 }}>
                  La IA generará una rutina adaptada al clima y condiciones de tu destino.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div>
                    <label style={{ fontSize: 11, color: colorVars.fgMuted, fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Destino</label>
                    <input
                      value={travelForm.destination}
                      onChange={e => setTravelForm(f => ({ ...f, destination: e.target.value }))}
                      placeholder="Ej: Cancún, París, Barcelona..."
                      style={{
                        width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8,
                        border: `1px solid ${colorVars.border}`, background: colorVars.bg,
                        color: colorVars.fg, fontSize: 13, fontFamily: 'inherit', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: colorVars.fgMuted, fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Tipo de viaje</label>
                    <select
                      value={travelForm.travel_type}
                      onChange={e => setTravelForm(f => ({ ...f, travel_type: e.target.value }))}
                      style={{
                        width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8,
                        border: `1px solid ${colorVars.border}`, background: colorVars.bg,
                        color: colorVars.fg, fontSize: 13, fontFamily: 'inherit', outline: 'none',
                      }}
                    >
                      <option value="playa">🌊 Playa / Tropical</option>
                      <option value="montaña">⛰️ Montaña</option>
                      <option value="ciudad">🏙️ Ciudad</option>
                      <option value="nieve">❄️ Nieve / Esquí</option>
                      <option value="tropical">🌴 Tropical</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: colorVars.fgMuted, fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Inicio</label>
                      <input
                        type="date"
                        value={travelForm.start_date}
                        onChange={e => setTravelForm(f => ({ ...f, start_date: e.target.value }))}
                        style={{
                          width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8,
                          border: `1px solid ${colorVars.border}`, background: colorVars.bg,
                          color: colorVars.fg, fontSize: 13, fontFamily: 'inherit', outline: 'none',
                          boxSizing: 'border-box', colorScheme: 'dark',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: colorVars.fgMuted, fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Fin</label>
                      <input
                        type="date"
                        value={travelForm.end_date}
                        onChange={e => setTravelForm(f => ({ ...f, end_date: e.target.value }))}
                        style={{
                          width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8,
                          border: `1px solid ${colorVars.border}`, background: colorVars.bg,
                          color: colorVars.fg, fontSize: 13, fontFamily: 'inherit', outline: 'none',
                          boxSizing: 'border-box', colorScheme: 'dark',
                        }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!travelForm.destination || !travelForm.start_date || !travelForm.end_date) return;
                      setTravelGenerating(true);
                      try {
                        const result = await createTravel(travelForm);
                        setActiveTravel({
                          id: result.id,
                          destination: result.destination,
                          travel_type: result.travel_type,
                          start_date: result.start_date,
                          end_date: result.end_date,
                          generated_routine: result.generated_routine,
                          days_left: Math.max(0, Math.ceil((new Date(result.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))),
                        });
                        setShowTravelModal(false);
                        setShowTravelRoutine(true);
                      } catch (err: any) {
                        alert(err.message);
                      } finally {
                        setTravelGenerating(false);
                      }
                    }}
                    disabled={travelGenerating || !travelForm.destination || !travelForm.start_date || !travelForm.end_date}
                    style={{
                      width: '100%', padding: '0.65rem', borderRadius: 10, border: 'none',
                      background: travelGenerating ? colorVars.surfaceHover : `linear-gradient(135deg, #3B82F6, #8B5CF6)`,
                      color: '#fff', fontSize: 14, fontWeight: 700, cursor: travelGenerating ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', marginTop: '0.25rem',
                    }}
                  >
                    {travelGenerating ? 'Generando rutina de viaje...' : 'Generar rutina de viaje'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Medication modal ── */}
      {showMedModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 80,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
          animation: 'dermoFadeIn 0.2s ease-out',
        }} onClick={() => { if (!medAnalyzing && !medResult) setShowMedModal(false); }}>
          <div style={{
            background: colorVars.surface, borderRadius: 16,
            border: `1px solid ${colorVars.border}`,
            padding: '1.5rem', maxWidth: 400, width: '90%', maxHeight: '90vh', overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            {medResult ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: colorVars.fg, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {medResult.compatibility.compatible
                    ? <Check size={18} color="#34D399" />
                    : <AlertTriangle size={18} color="#EF4444" />
                  }
                  {medResult.medication.medicine_name}
                </div>
                <div style={{ fontSize: 12, color: colorVars.fgMuted, marginBottom: '0.75rem' }}>
                  {medResult.medication.active_ingredient && (
                    <span>Principio activo: {medResult.medication.active_ingredient} · </span>
                  )}
                  {medResult.compatibility.compatible
                    ? 'Compatible con tu rutina'
                    : 'Se detectaron posibles interacciones'
                  }
                </div>

                {!medResult.compatibility.compatible && (
                  <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    {medResult.compatibility.fotosensibilidad && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#EF4444', padding: '2px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.1)' }}>Fotosensibilidad</span>
                    )}
                    {medResult.compatibility.irritacion && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#F59E0B', padding: '2px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.1)' }}>Irritación</span>
                    )}
                    {medResult.compatibility.sequedad && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#60A5FA', padding: '2px 8px', borderRadius: 6, background: 'rgba(96,165,250,0.1)' }}>Sequedad</span>
                    )}
                  </div>
                )}

                <div style={{ fontSize: 12, lineHeight: 1.5, color: colorVars.fgMuted, marginBottom: '1rem' }}>
                  {medResult.compatibility.details.map((d: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      <span>{d.startsWith('No se detectaron') ? '✅' : '⚠️'}</span>
                      <span>{d}</span>
                    </div>
                  ))}
                </div>

                {!medResult.compatibility.compatible && (
                  <div style={{ padding: '0.65rem', borderRadius: 10, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', marginBottom: '1rem' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: colorVars.premiumLight, marginBottom: '0.35rem' }}>Recomendaciones</div>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: 11, color: colorVars.fgDim, lineHeight: 1.6 }}>
                      {medResult.compatibility.fotosensibilidad && <li>Usa protección solar SPF50+ todas las mañanas, incluso en días nublados</li>}
                      {medResult.compatibility.irritacion && <li>Aplica productos potencialmente irritantes (retinoides, ácidos) solo por la noche</li>}
                      {medResult.compatibility.sequedad && <li>Incorpora una crema hidratante con ceramidas o ácido hialurónico</li>}
                      {!medResult.compatibility.fotosensibilidad && !medResult.compatibility.irritacion && !medResult.compatibility.sequedad && <li>Consulta con tu dermatólogo si notas algún cambio en tu piel</li>}
                    </ul>
                  </div>
                )}

                <button
                  onClick={() => { setShowMedModal(false); setMedResult(null); setMedForm({ medicine_name: '', active_ingredient: '', atc_code: '' }); }}
                  style={{
                    width: '100%', padding: '0.65rem', borderRadius: 10, border: 'none',
                    background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                    color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Entendido
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: colorVars.fg, marginBottom: '0.5rem' }}>
                  Añadir medicamento
                </div>
                <p style={{ fontSize: 12, color: colorVars.fgMuted, margin: '0 0 1rem', lineHeight: 1.5 }}>
                  La IA buscará automáticamente el principio activo en CIMA (AEMPS) y analizará la compatibilidad con tu rutina cosmética.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div>
                    <label style={{ fontSize: 11, color: colorVars.fgMuted, fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Nombre del medicamento *</label>
                    <input
                      value={medForm.medicine_name}
                      onChange={e => setMedForm(f => ({ ...f, medicine_name: e.target.value }))}
                      placeholder="Ej: Ebastel, Dacortín, Roacután..."
                      style={{
                        width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8,
                        border: `1px solid ${colorVars.border}`, background: colorVars.bg,
                        color: colorVars.fg, fontSize: 13, fontFamily: 'inherit', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: colorVars.fgMuted, fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Principio activo (opcional — se autocompleta vía CIMA)</label>
                    <input
                      value={medForm.active_ingredient}
                      onChange={e => setMedForm(f => ({ ...f, active_ingredient: e.target.value }))}
                      placeholder="Se rellena automáticamente..."
                      style={{
                        width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8,
                        border: `1px solid ${colorVars.border}`, background: colorVars.bg,
                        color: colorVars.fg, fontSize: 13, fontFamily: 'inherit', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (!medForm.medicine_name) return;
                      setMedAnalyzing(true);
                      try {
                        const result = await addMedication({
                          medicine_name: medForm.medicine_name,
                          active_ingredient: medForm.active_ingredient || undefined,
                          atc_code: medForm.atc_code || undefined,
                        });
                        if (result.medication) {
                          setMedications(prev => [result.medication, ...prev]);
                          logKpiEvent('medication_added', { medicine_name: medForm.medicine_name });
                          setMedResult(result);
                        } else {
                          setShowMedModal(false);
                          setMedForm({ medicine_name: '', active_ingredient: '', atc_code: '' });
                        }
                      } catch (err: any) {
                        alert(err.message);
                      } finally {
                        setMedAnalyzing(false);
                      }
                    }}
                    disabled={medAnalyzing || !medForm.medicine_name}
                    style={{
                      width: '100%', padding: '0.65rem', borderRadius: 10, border: 'none',
                      background: medAnalyzing ? colorVars.surfaceHover : `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                      color: '#fff', fontSize: 14, fontWeight: 700, cursor: medAnalyzing ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', marginTop: '0.25rem',
                    }}
                  >
                    {medAnalyzing ? 'Analizando compatibilidad...' : 'Añadir y analizar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Product usage modal ── */}
      {showUsageModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 80,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
          animation: 'dermoFadeIn 0.2s ease-out',
        }} onClick={() => setShowUsageModal(false)}>
          <div style={{
            background: colorVars.surface, borderRadius: 16,
            border: `1px solid ${colorVars.border}`,
            padding: '1.5rem', maxWidth: 400, width: '90%',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, color: colorVars.fg, marginBottom: '0.5rem' }}>
              Añadir producto
            </div>
            <p style={{ fontSize: 12, color: colorVars.fgMuted, margin: '0 0 1rem', lineHeight: 1.5 }}>
              Te avisaremos antes de que se agote para que puedas reponerlo.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div>
                <label style={{ fontSize: 11, color: colorVars.fgMuted, fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Nombre del producto</label>
                <input
                  value={usageForm.product_name}
                  onChange={e => setUsageForm(f => ({ ...f, product_name: e.target.value }))}
                  placeholder="Ej: Crema hidratante, Sérum Vitamina C..."
                  style={{
                    width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8,
                    border: `1px solid ${colorVars.border}`, background: colorVars.bg,
                    color: colorVars.fg, fontSize: 13, fontFamily: 'inherit', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: colorVars.fgMuted, fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Tamaño</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                  <input
                    type="number"
                    value={usageForm.size_ml}
                    onChange={e => setUsageForm(f => ({ ...f, size_ml: e.target.value }))}
                    placeholder="Ej: 50"
                    style={{
                      flex: 1, padding: '0.55rem 0.75rem', borderRadius: 8,
                      border: `1px solid ${colorVars.border}`, background: colorVars.bg,
                      color: colorVars.fg, fontSize: 13, fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${colorVars.border}`, flexShrink: 0 }}>
                    {['ml', 'g'].map(u => (
                      <button
                        key={u}
                        onClick={() => setUsageForm(f => ({ ...f, unit: u }))}
                        style={{
                          padding: '0.4rem 0.7rem', border: 'none', cursor: 'pointer',
                          background: usageForm.unit === u ? colorVars.premiumLight : 'transparent',
                          color: usageForm.unit === u ? '#fff' : colorVars.fg,
                          fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                          transition: 'all 0.15s',
                        }}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: colorVars.fgMuted, fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Frecuencia de uso</label>
                <select
                  value={usageForm.use_frequency}
                  onChange={e => setUsageForm(f => ({ ...f, use_frequency: e.target.value }))}
                  style={{
                    width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8,
                    border: `1px solid ${colorVars.border}`, background: colorVars.bg,
                    color: colorVars.fg, fontSize: 13, fontFamily: 'inherit', outline: 'none',
                  }}
                >
                  <option value="1_dia">1 vez al día</option>
                  <option value="2_dia">2 veces al día</option>
                  <option value="1_semana">1 vez a la semana</option>
                  <option value="2_semana">2-3 veces a la semana</option>
                  <option value="1_mes">1 vez al mes</option>
                </select>
              </div>
              <button
                onClick={async () => {
                  if (!usageForm.product_name || !usageForm.size_ml) return;
                  try {
                    const result = await addProductUsage({
                      product_name: usageForm.product_name,
                      size_ml: Number(usageForm.size_ml),
                      use_frequency: usageForm.use_frequency,
                      unit: usageForm.unit,
                    });
                    if (result.product) {
                      setExhaustionProducts(prev => [result.product, ...prev]);
                    }
                    setShowUsageModal(false);
                    setUsageForm({ product_name: '', size_ml: '', use_frequency: '1_dia', unit: 'ml' });
                  } catch (err: any) {
                    alert(err.message);
                  }
                }}
                disabled={!usageForm.product_name || !usageForm.size_ml}
                style={{
                  width: '100%', padding: '0.65rem', borderRadius: 10, border: 'none',
                  background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                  color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit', marginTop: '0.25rem',
                }}
              >
                Añadir producto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── History modal ── */}
      {showHistory && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 80,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
          animation: 'dermoFadeIn 0.2s ease-out',
        }} onClick={() => setShowHistory(false)}>
          <div style={{
            background: colorVars.surface, borderRadius: 16,
            border: `1px solid ${colorVars.border}`,
            padding: '1.5rem', maxWidth: 440, width: '90%', maxHeight: '80vh',
            display: 'flex', flexDirection: 'column',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: colorVars.fg }}>
                Historial de Rutinas
              </div>
              <button onClick={() => setShowHistory(false)} style={{
                width: 32, height: 32, borderRadius: '50%',
                border: `1px solid ${colorVars.border}`,
                background: colorVars.surface, color: colorVars.fg,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontFamily: 'inherit',
              }}>
                &times;
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {routineHistoryLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: colorVars.fgMuted, fontSize: 13 }}>
                  Cargando...
                </div>
              ) : routineHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: colorVars.fgMuted, fontSize: 13 }}>
                  No hay rutinas anteriores
                </div>
              ) : (
                routineHistory.map(r => (
                  <div key={r.id} style={{
                    background: colorVars.bg, borderRadius: 10,
                    border: `1px solid ${colorVars.border}`,
                    padding: '0.75rem',
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: colorVars.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.name || 'Rutina personalizada'}
                      </div>
                      <div style={{ fontSize: 11, color: colorVars.fgMuted }}>
                        {r.created_at ? new Date(r.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha desconocida'}
                      </div>
                      <div style={{ fontSize: 11, color: colorVars.fgDim, marginTop: '0.15rem' }}>
                        {r.am_routine?.length ?? 0} AM · {r.pm_routine?.length ?? 0} PM
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestoreRoutine(r)}
                      disabled={restoringId === r.id}
                      style={{
                        padding: '0.4rem 0.8rem', borderRadius: 8, border: 'none',
                        background: restoringId === r.id
                          ? colorVars.surfaceHover
                          : `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                        color: '#fff', fontSize: 11, fontWeight: 700,
                        cursor: restoringId === r.id ? 'not-allowed' : 'pointer',
                        opacity: restoringId === r.id ? 0.6 : 1,
                        fontFamily: 'inherit', whiteSpace: 'nowrap',
                      }}
                    >
                      {restoringId === r.id ? 'Restaurando...' : 'Restaurar'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
