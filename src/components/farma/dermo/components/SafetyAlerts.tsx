import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { colorVars } from '../styles';

interface SafetyAlert {
  type: 'danger' | 'warning' | 'info';
  label: string;
}

interface SafetyAlertsProps {
  alerts: SafetyAlert[];
  isFree?: boolean;
}

function alertIcon(type: string) {
  switch (type) {
    case 'danger': return <AlertCircle size={14} color={colorVars.danger} />;
    case 'warning': return <AlertTriangle size={14} color={colorVars.warning} />;
    default: return <Info size={14} color={colorVars.accent} />;
  }
}

function alertBg(type: string) {
  switch (type) {
    case 'danger': return 'rgba(239,68,68,0.1)';
    case 'warning': return 'rgba(245,158,11,0.1)';
    default: return 'rgba(59,130,246,0.08)';
  }
}

function alertColor(type: string) {
  switch (type) {
    case 'danger': return colorVars.danger;
    case 'warning': return colorVars.warning;
    default: return colorVars.accent;
  }
}

const DEFAULT_ALERTS: SafetyAlert[] = [
  { type: 'warning', label: 'Sensibilidad alta a Retinoides' },
  { type: 'danger', label: 'Evitar Perfumes y Fragancias' },
  { type: 'info', label: 'Usar protección solar SPF50+ diaria' },
];

export default function SafetyAlerts({ alerts = DEFAULT_ALERTS, isFree }: SafetyAlertsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {alerts.map((a, i) => (
        <div
          key={i}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.45rem 0.6rem', borderRadius: 8,
            background: alertBg(a.type),
            fontSize: 12, fontWeight: 600, color: alertColor(a.type),
            lineHeight: 1.3, flexWrap: 'wrap',
            filter: isFree ? 'blur(3px)' : 'none',
            pointerEvents: isFree ? 'none' : 'auto',
            userSelect: isFree ? 'none' : 'auto',
          }}
        >
          {alertIcon(a.type)}
          {a.label}
        </div>
      ))}
    </div>
  );
}
