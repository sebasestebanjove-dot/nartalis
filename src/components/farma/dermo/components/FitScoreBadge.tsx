import { colorVars } from '../styles';

function scoreColor(score: number): string {
  if (score >= 70) return colorVars.success;
  if (score >= 40) return colorVars.warning;
  return colorVars.danger;
}

function scoreLabel(score: number): string {
  if (score >= 70) return 'Alta compatibilidad';
  if (score >= 40) return 'Compatibilidad moderada';
  return 'Baja compatibilidad';
}

function scoreBg(score: number): string {
  if (score >= 70) return 'rgba(16,185,129,0.1)';
  if (score >= 40) return 'rgba(245,158,11,0.1)';
  return 'rgba(239,68,68,0.1)';
}

export default function FitScoreBadge({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(score, 100) / 100);

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
      padding: '0.5rem 0.75rem', borderRadius: 10,
      background: scoreBg(score),
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={colorVars.surfaceHover} strokeWidth={3} />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={scoreColor(score)} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          fill={scoreColor(score)} fontSize={size * 0.3} fontWeight={800} fontFamily="inherit">
          {Math.min(score, 100)}
        </text>
      </svg>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: colorVars.fg }}>Fit Score</div>
        <div style={{ fontSize: 11, color: scoreColor(score), fontWeight: 600 }}>{scoreLabel(score)}</div>
      </div>
    </div>
  );
}
