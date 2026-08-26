import type { CSSProperties } from 'react';

const c = {
  bg: '#EFF3F0',
  surface: '#FFFFFF',
  primary: '#0D9668',
  primaryDark: '#077A54',
  primaryLight: '#E8F5EE',
  primaryMuted: '#D1FADF',
  text: '#111827',
  textSec: '#4B5563',
  textTer: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderFocus: '#0D9668',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  star: '#F59E0B',
  starLight: '#FEF3C7',
};

const font = 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const shadow = {
  xs: '0 1px 2px rgba(0,0,0,0.04)',
  sm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  md: '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
  card: '0 1px 3px rgba(0,0,0,0.04)',
  cardHover: '0 4px 16px rgba(0,0,0,0.08)',
  dropdown: '0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.04)',
};

const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

const t = {
  fast: '0.12s ease',
  normal: '0.2s ease',
};

export const V = {
  c, font, shadow, radius, t,

  page: {
    minHeight: '100vh',
    background: c.bg,
    fontFamily: font,
    WebkitFontSmoothing: 'antialiased',
  } as CSSProperties,

  container: {
    maxWidth: 1080,
    margin: '0 auto',
    padding: '0 20px',
  } as CSSProperties,

  inner: {
    maxWidth: 1080,
    margin: '0 auto',
    padding: '0 20px 60px',
  } as CSSProperties,

  heroSection: {
    padding: '40px 0 0',
  } as CSSProperties,

  heroTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  } as CSSProperties,

  heroBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  } as CSSProperties,

  heroBrandMark: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    background: c.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: '-0.02em',
    flexShrink: 0,
  } as CSSProperties,

  heroBrandText: {
    fontSize: 14,
    fontWeight: 700,
    color: c.text,
    letterSpacing: '-0.01em',
  } as CSSProperties,

  heroControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  } as CSSProperties,

  adminPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12,
    fontWeight: 500,
    color: c.primary,
    background: c.primaryLight,
    border: 'none',
    borderRadius: radius.pill,
    padding: '6px 12px',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: `background ${t.fast}`,
    whiteSpace: 'nowrap' as const,
  } as CSSProperties,

  logoutPill: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 500,
    color: c.textSec,
    background: c.borderLight,
    border: 'none',
    borderRadius: radius.pill,
    padding: '6px 12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: `background ${t.fast}`,
  } as CSSProperties,

  greeting: {
    fontSize: 28,
    fontWeight: 700,
    color: c.text,
    lineHeight: 1.15,
    letterSpacing: '-0.025em',
    margin: 0,
  } as CSSProperties,

  subtitle: {
    fontSize: 14,
    color: c.textSec,
    marginTop: 6,
    lineHeight: 1.5,
  } as CSSProperties,

  planBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.04em',
    color: c.primary,
    background: c.primaryLight,
    borderRadius: radius.pill,
    padding: '2px 10px',
    marginLeft: 10,
    verticalAlign: 'middle',
  } as CSSProperties,

  searchSection: {
    marginTop: 24,
    marginBottom: 0,
  } as CSSProperties,

  searchLabel: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: c.text,
    marginBottom: 4,
    letterSpacing: '-0.01em',
  } as CSSProperties,

  searchHint: {
    display: 'block',
    fontSize: 13,
    color: c.textTer,
    marginBottom: 10,
    lineHeight: 1.4,
  } as CSSProperties,

  searchWrap: {
    position: 'relative' as const,
  } as CSSProperties,

  searchInput: {
    width: '100%',
    fontSize: 16,
    padding: '16px 48px 16px 48px',
    border: `2px solid ${c.border}`,
    borderRadius: radius.lg,
    background: c.surface,
    color: c.text,
    outline: 'none',
    transition: `border-color ${t.normal}, box-shadow ${t.normal}`,
    boxSizing: 'border-box' as const,
    fontFamily: font,
    lineHeight: 1.4,
  } as CSSProperties,

  searchIcon: {
    position: 'absolute' as const,
    left: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    color: c.primary,
    pointerEvents: 'none' as const,
    transition: `color ${t.normal}`,
  } as CSSProperties,

  searchClear: {
    position: 'absolute' as const,
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: c.borderLight,
    border: 'none',
    color: c.textSec,
    cursor: 'pointer',
    padding: 5,
    borderRadius: radius.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `background ${t.fast}, color ${t.fast}`,
  } as CSSProperties,

  searchLoader: {
    position: 'absolute' as const,
    right: 44,
    top: '50%',
    transform: 'translateY(-50%)',
    color: c.primary,
  } as CSSProperties,

  dropdown: {
    position: 'absolute' as const,
    top: 'calc(100% + 6px)',
    left: 0,
    right: 0,
    background: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: radius.lg,
    boxShadow: shadow.dropdown,
    zIndex: 50,
    maxHeight: 360,
    overflowY: 'auto' as const,
    padding: 4,
  } as CSSProperties,

  dropItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '11px 12px',
    cursor: 'pointer',
    borderRadius: radius.md,
    textDecoration: 'none',
    color: 'inherit',
    transition: `background ${t.fast}`,
  } as CSSProperties,

  dropItemIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    background: c.primaryLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: c.primary,
  } as CSSProperties,

  dropItemText: {
    flex: 1,
    minWidth: 0,
  } as CSSProperties,

  dropItemName: {
    fontSize: 14,
    fontWeight: 500,
    color: c.text,
    lineHeight: 1.3,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    display: '-webkit-box' as const,
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
  } as CSSProperties,

  dropItemLab: {
    fontSize: 12,
    color: c.textTer,
    marginTop: 2,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
  } as CSSProperties,

  dropArrow: {
    color: c.textTer,
    flexShrink: 0,
  } as CSSProperties,

  dropEmpty: {
    padding: '20px 16px',
    textAlign: 'center' as const,
    color: c.textSec,
    fontSize: 13,
  } as CSSProperties,

  divider: {
    height: 1,
    background: c.borderLight,
    margin: '24px 0',
  } as CSSProperties,

  section: {
    marginBottom: 0,
  } as CSSProperties,

  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  } as CSSProperties,

  sectionHeadLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  } as CSSProperties,

  sectionIcon: {
    color: c.primary,
  } as CSSProperties,

  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: c.text,
    letterSpacing: '-0.01em',
  } as CSSProperties,

  sectionCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 600,
    color: c.primary,
    background: c.primaryLight,
    borderRadius: radius.pill,
    padding: '1px 8px',
    marginLeft: 6,
    lineHeight: 1.5,
  } as CSSProperties,

  sectionLink: {
    fontSize: 13,
    fontWeight: 500,
    color: c.primary,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    transition: `opacity ${t.fast}`,
  } as CSSProperties,

  medGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
  } as CSSProperties,

  medGridInner: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
  } as CSSProperties,

  medCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '16px 14px 12px',
    background: c.surface,
    border: `1px solid ${c.borderLight}`,
    borderRadius: radius.md,
    cursor: 'pointer',
    textDecoration: 'none',
    color: 'inherit',
    transition: `border-color ${t.normal}, box-shadow ${t.normal}, transform ${t.fast}`,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  } as CSSProperties,

  medCardIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    background: c.primaryLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: c.primary,
    marginBottom: 10,
    flexShrink: 0,
  } as CSSProperties,

  medCardBody: {
    flex: 1,
    minWidth: 0,
  } as CSSProperties,

  medCardName: {
    fontSize: 13,
    fontWeight: 600,
    color: c.text,
    lineHeight: 1.35,
    overflow: 'hidden' as const,
    display: '-webkit-box' as const,
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical' as const,
    wordBreak: 'break-word' as const,
    marginBottom: 6,
  } as CSSProperties,

  medCardDate: {
    fontSize: 11,
    color: c.textTer,
    lineHeight: 1.3,
  } as CSSProperties,

  medCardStar: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    borderRadius: radius.sm,
    cursor: 'pointer',
    color: c.textTer,
    transition: `color ${t.fast}, background ${t.fast}`,
    padding: 0,
  } as CSSProperties,

  medCardStarActive: {
    color: c.star,
    background: c.starLight,
  } as CSSProperties,

  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  } as CSSProperties,

  iconBtn: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    borderRadius: radius.sm,
    cursor: 'pointer',
    color: c.textTer,
    transition: `color ${t.fast}, background ${t.fast}`,
    padding: 0,
  } as CSSProperties,

  starActive: {
    color: c.star,
  } as CSSProperties,

  favSection: {
    background: c.surface,
    border: `1px solid ${c.primaryLight}`,
    borderRadius: radius.lg,
    padding: '16px',
  } as CSSProperties,

  favRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    cursor: 'pointer',
    textDecoration: 'none',
    color: 'inherit',
    borderRadius: radius.sm,
    transition: `background ${t.fast}`,
  } as CSSProperties,

  favStar: {
    color: c.star,
    flexShrink: 0,
  } as CSSProperties,

  favBody: {
    flex: 1,
    minWidth: 0,
  } as CSSProperties,

  favName: {
    fontSize: 13,
    fontWeight: 500,
    color: c.text,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
    lineHeight: 1.4,
  } as CSSProperties,

  favArrow: {
    color: c.textTer,
    flexShrink: 0,
  } as CSSProperties,

  histRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    textDecoration: 'none',
    color: 'inherit',
    borderRadius: radius.sm,
    transition: `background ${t.fast}`,
    borderBottom: `1px solid ${c.borderLight}`,
  } as CSSProperties,

  histRowLast: {
    borderBottom: 'none',
  } as CSSProperties,

  histIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    background: c.borderLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: c.textTer,
  } as CSSProperties,

  histBody: {
    flex: 1,
    minWidth: 0,
  } as CSSProperties,

  histName: {
    fontSize: 13,
    fontWeight: 500,
    color: c.text,
    lineHeight: 1.3,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
  } as CSSProperties,

  histDate: {
    fontSize: 11,
    color: c.textTer,
    marginTop: 2,
  } as CSSProperties,

  histArrow: {
    color: c.textTer,
    flexShrink: 0,
  } as CSSProperties,

  histCard: {
    background: c.surface,
    border: `1px solid ${c.borderLight}`,
    borderRadius: radius.lg,
    overflow: 'hidden' as const,
  } as CSSProperties,

  empty: {
    textAlign: 'center' as const,
    padding: '28px 16px',
    background: c.surface,
    border: `1px dashed ${c.border}`,
    borderRadius: radius.lg,
  } as CSSProperties,

  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    background: c.primaryLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
    color: c.primary,
  } as CSSProperties,

  emptyTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: c.text,
    marginBottom: 4,
  } as CSSProperties,

  emptyDesc: {
    fontSize: 13,
    color: c.textSec,
    lineHeight: 1.5,
    maxWidth: 280,
    margin: '0 auto 14px',
  } as CSSProperties,

  emptyCta: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 500,
    color: c.primary,
    background: c.primaryLight,
    border: 'none',
    borderRadius: radius.pill,
    padding: '8px 18px',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: `background ${t.fast}`,
    fontFamily: font,
  } as CSSProperties,

  welcome: {
    background: c.surface,
    border: `1px solid ${c.primaryMuted}`,
    borderRadius: radius.xl,
    padding: '24px 20px',
    marginBottom: 28,
    textAlign: 'center' as const,
    boxShadow: shadow.xs,
  } as CSSProperties,

  welcomeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${c.primary}, ${c.primaryDark})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
  } as CSSProperties,

  welcomeTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: c.text,
    marginBottom: 4,
    letterSpacing: '-0.01em',
  } as CSSProperties,

  welcomeDesc: {
    fontSize: 13,
    color: c.textSec,
    lineHeight: 1.5,
    maxWidth: 340,
    margin: '0 auto',
  } as CSSProperties,

  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 16px',
    color: c.textTer,
    fontSize: 13,
  } as CSSProperties,

  error: {
    textAlign: 'center' as const,
    padding: '40px 16px',
    color: c.danger,
    fontSize: 13,
    background: c.dangerLight,
    borderRadius: radius.lg,
  } as CSSProperties,

  footer: {
    textAlign: 'center' as const,
    padding: '28px 16px 0',
    fontSize: 11,
    color: c.textTer,
    borderTop: `1px solid ${c.borderLight}`,
    marginTop: 36,
  } as CSSProperties,
};
