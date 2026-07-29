import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';

const bg = '#0A0A0B';
const surface = '#18181B';
const surfaceHover = '#27272A';
const border = 'rgba(255,255,255,0.08)';
const borderHover = 'rgba(255,255,255,0.14)';
const fg = '#FFFFFF';
const fgMuted = '#A1A1AA';
const fgDim = '#71717A';
const accent = '#3B82F6';
const accentDim = 'rgba(59,130,246,0.12)';
const premium = '#7C3AED';
const premiumLight = '#A78BFA';
const premiumGlow = 'rgba(124,58,237,0.25)';
const danger = '#EF4444';
const warning = '#F59E0B';
const success = '#10B981';
const gold = '#FBBF24';

function focusRing() {
  return { outline: 'none', boxShadow: `0 0 0 2px ${premiumLight}` } as CSSProperties;
}

export const dermoStyles: Record<string, CSSProperties> = {
  // ────── LAYOUT ──────
  container: {
    minHeight: '100vh',
    background: bg,
    color: fg,
    padding: '1.5rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  hero: {
    textAlign: 'center',
    maxWidth: 600,
    marginBottom: '2rem',
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 800,
    color: fg,
    margin: '0 0 0.5rem',
    lineHeight: 1.15,
    letterSpacing: '-0.02em',
  },
  titleAccent: {
    color: premiumLight,
  },
  subtitle: {
    fontSize: 16,
    color: fgMuted,
    margin: 0,
    lineHeight: 1.6,
  },

  // ────── SEARCH ──────
  searchBox: {
    width: '100%',
    maxWidth: 600,
    background: surface,
    borderRadius: 16,
    padding: '1.25rem',
    marginBottom: '1rem',
    border: `1px solid ${border}`,
  },
  filterRow: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.75rem',
    flexWrap: 'wrap',
  },
  select: {
    flex: 1,
    minWidth: 130,
    fontSize: 14,
    padding: '0.55rem 0.85rem',
    borderRadius: 10,
    border: `1px solid ${border}`,
    background: bg,
    color: fg,
    outline: 'none',
    minHeight: 42,
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  inputRow: {
    display: 'flex',
    gap: '0.6rem',
    alignItems: 'stretch',
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: '0.65rem 1rem',
    borderRadius: 12,
    border: `1px solid ${border}`,
    background: bg,
    color: fg,
    outline: 'none',
    minHeight: 46,
    transition: 'border-color 0.15s',
  },
  searchBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    padding: '0.65rem 1.25rem',
    borderRadius: 12,
    border: 'none',
    background: `linear-gradient(135deg, ${premium}, ${premiumLight})`,
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    minHeight: 46,
    minWidth: 46,
    transition: 'opacity 0.15s, transform 0.15s',
  },

  // ────── RESULTS ──────
  resultsContainer: {
    minHeight: '100vh',
    background: bg,
    color: fg,
    padding: '0.75rem',
  },
  resultsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    marginBottom: '0.75rem',
    paddingBottom: '0.6rem',
    borderBottom: `1px solid ${border}`,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 10,
    border: `1px solid ${border}`,
    background: surface,
    color: fg,
    cursor: 'pointer',
    fontSize: 18,
    flexShrink: 0,
    transition: 'background 0.15s',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: fg,
    margin: 0,
    flex: 1,
  },
  resultsCount: {
    fontSize: 13,
    color: fgMuted,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '0.6rem',
  },
  productCard: {
    display: 'flex',
    flexDirection: 'column',
    padding: '0.85rem',
    background: surface,
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'transform 0.15s, border-color 0.15s',
    border: `1px solid ${border}`,
    minHeight: 180,
    position: 'relative' as const,
  },
  productCardImg: {
    width: '100%',
    height: 100,
    objectFit: 'contain' as const,
    borderRadius: 6,
    background: bg,
    marginBottom: '0.6rem',
  },
  productCardImgPlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: 6,
    background: border,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 32,
    marginBottom: '0.6rem',
  },
  productCardName: {
    fontSize: 13,
    fontWeight: 700,
    color: fg,
    lineHeight: 1.3,
    marginBottom: '0.2rem',
  },
  productCardBrand: {
    fontSize: 11,
    color: fgMuted,
    marginBottom: '0.25rem',
  },

  // ────── DETAIL ──────
  detailContainer: {
    minHeight: '100vh',
    background: bg,
    color: fg,
    padding: '0.75rem',
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.6rem',
    marginBottom: '1rem',
  },
  detailBody: {
    maxWidth: 520,
    margin: '0 auto',
  },
  detailImg: {
    width: '100%',
    maxWidth: 160,
    borderRadius: 12,
    margin: '0 auto 1.25rem',
    display: 'block',
  },
  detailName: {
    fontSize: 22,
    fontWeight: 800,
    color: fg,
    lineHeight: 1.25,
    marginBottom: '0.2rem',
  },
  detailBrand: {
    fontSize: 14,
    color: fgMuted,
    marginBottom: '0.75rem',
  },
  section: {
    marginBottom: '1.25rem',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: fg,
    marginBottom: '0.6rem',
  },
  infoCard: {
    padding: '0.85rem 1rem',
    background: surface,
    borderRadius: 12,
    border: `1px solid ${border}`,
    fontSize: 15,
    color: fg,
    lineHeight: 1.6,
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.55rem',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    marginRight: '0.3rem',
    marginBottom: '0.3rem',
  },
  chipSkin: {
    background: accentDim,
    color: '#93C5FD',
  },
  chipIngredient: {
    background: 'rgba(167,139,250,0.15)',
    color: premiumLight,
  },

  // ────── PAYWALL ──────
  paywallOverlay: {
    position: 'relative' as const,
  },
  paywallBlur: {
    filter: 'blur(6px)',
    pointerEvents: 'none' as const,
    userSelect: 'none' as const,
  },
  paywallCard: {
    margin: '1.25rem 0',
    padding: '1.5rem',
    background: `linear-gradient(135deg, ${premiumGlow}, rgba(167,139,250,0.08))`,
    border: `1px solid rgba(124,58,237,0.25)`,
    borderRadius: 16,
    textAlign: 'center' as const,
  },
  paywallTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: premiumLight,
    marginBottom: '0.4rem',
  },
  paywallText: {
    fontSize: 14,
    color: fgMuted,
    marginBottom: '1rem',
    lineHeight: 1.5,
  },
  paywallPrice: {
    fontSize: 28,
    fontWeight: 800,
    color: fg,
    marginBottom: '0.2rem',
  },
  paywallPriceSub: {
    fontSize: 13,
    color: fgMuted,
    marginBottom: '1rem',
  },
  paywallBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    padding: '0.75rem 1.75rem',
    borderRadius: 12,
    border: 'none',
    background: `linear-gradient(135deg, ${premium}, ${premiumLight})`,
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    minHeight: 46,
    transition: 'opacity 0.15s, transform 0.15s',
  },
  paywallActive: {
    padding: '0.75rem 1.75rem',
    borderRadius: 12,
    border: `1px solid ${premiumLight}`,
    background: 'transparent',
    color: premiumLight,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'default',
    minHeight: 46,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
  },

  // ────── TOP BAR ──────
  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '10px 16px',
    background: surface,
    borderBottom: `1px solid ${border}`,
  },
  topbarEmail: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: fgMuted,
    whiteSpace: 'nowrap' as const,
  },
  topbarDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: success,
    flexShrink: 0,
  },
  topbarBadgeFree: {
    padding: '3px 8px',
    borderRadius: 20,
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${border}`,
    fontSize: 10,
    fontWeight: 600,
    color: fgDim,
    whiteSpace: 'nowrap' as const,
  },
  topbarBadgePremium: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    padding: '3px 10px',
    borderRadius: 20,
    background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(251,191,36,0.12))',
    border: '1px solid rgba(251,191,36,0.25)',
    fontSize: 10,
    fontWeight: 700,
    color: gold,
    whiteSpace: 'nowrap' as const,
  },
  topbarBtn: {
    padding: '5px 10px',
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: 'rgba(255,255,255,0.03)',
    color: fgMuted,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'background 0.15s',
  },

  // ────── AVAILABILITY ──────
  availabilitySection: {
    marginTop: '1.25rem',
  },
  pcInput: {
    width: '100%',
    maxWidth: 260,
    fontSize: 14,
    padding: '0.5rem 0.85rem',
    borderRadius: 10,
    border: `1px solid ${border}`,
    background: bg,
    color: fg,
    outline: 'none',
    marginBottom: '0.6rem',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  },
  pharmacyCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.75rem 0.85rem',
    background: surface,
    borderRadius: 10,
    border: `1px solid ${border}`,
    marginBottom: '0.4rem',
  },
  pharmacyName: {
    fontSize: 14,
    fontWeight: 600,
    color: fg,
    flex: 1,
  },
  pharmacyAddress: {
    fontSize: 11,
    color: fgMuted,
  },
  stockBadge: {
    padding: '0.2rem 0.5rem',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
  },
  stockAvailable: {
    background: 'rgba(16,185,129,0.15)',
    color: success,
  },
  stockUnavailable: {
    background: 'rgba(239,68,68,0.12)',
    color: danger,
  },

  // ────── MODAL ──────
  modalOverlay: {
    position: 'fixed' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modalCard: {
    background: surface,
    borderRadius: 16,
    border: `1px solid ${border}`,
    padding: '1.5rem',
    maxWidth: 380,
    width: '100%',
    textAlign: 'center' as const,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: fg,
    marginBottom: '0.6rem',
  },
  modalText: {
    fontSize: 14,
    color: fgMuted,
    marginBottom: '1.25rem',
    lineHeight: 1.5,
  },
  modalBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    padding: '0.6rem 1.25rem',
    borderRadius: 10,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    minWidth: 100,
  },
  modalBtnPrimary: {
    background: `linear-gradient(135deg, ${premium}, ${premiumLight})`,
    color: '#fff',
  },
  modalBtnSecondary: {
    background: surfaceHover,
    color: fg,
    marginLeft: '0.6rem',
  },

  // ────── CHAT ──────
  chatSection: {
    marginTop: '1.25rem',
    borderTop: `1px solid ${border}`,
    paddingTop: '1.25rem',
  },
  chatMessages: {
    maxHeight: 280,
    overflowY: 'auto' as const,
    marginBottom: '0.6rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  chatBubble: {
    padding: '0.65rem 0.85rem',
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.5,
    maxWidth: '85%',
  },
  chatUser: {
    background: `linear-gradient(135deg, ${premium}, ${premiumLight})`,
    color: '#fff',
    alignSelf: 'flex-end' as const,
    borderBottomRightRadius: 4,
  },
  chatBot: {
    background: surfaceHover,
    color: fg,
    alignSelf: 'flex-start' as const,
    borderBottomLeftRadius: 4,
  },
  chatInputRow: {
    display: 'flex',
    gap: '0.4rem',
  },
  chatInput: {
    flex: 1,
    fontSize: 14,
    padding: '0.5rem 0.85rem',
    borderRadius: 10,
    border: `1px solid ${border}`,
    background: bg,
    color: fg,
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  chatSendBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 10,
    border: 'none',
    background: `linear-gradient(135deg, ${premium}, ${premiumLight})`,
    color: '#fff',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'opacity 0.15s',
  },

  // ────── UTILITY ──────
  noResults: {
    textAlign: 'center',
    padding: '2.5rem 1rem',
    color: fgMuted,
    fontSize: 16,
  },
  loader: {
    textAlign: 'center',
    padding: '2.5rem 1rem',
    color: premiumLight,
    fontSize: 15,
  },

  // Premium badge on cards
  premiumBadge: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    background: `linear-gradient(135deg, ${premium}, ${premiumLight})`,
    color: '#fff',
    fontSize: 9,
    fontWeight: 700,
    padding: '0.1rem 0.35rem',
    borderRadius: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
  },
}

export const colorVars = { bg, surface, surfaceHover, border, borderHover, fg, fgMuted, fgDim, accent, accentDim, premium, premiumLight, premiumGlow, danger, warning, success, gold }
export const focusRingStyle = focusRing

/* ── Responsive utilities ── */

export function useViewport() {
  const [width, setWidth] = useState(1024);

  useEffect(() => {
    setWidth(window.innerWidth);
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    width,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
  };
}

const responsiveStyles = {
  quizContainer: {
    mobile: { padding: '16px', width: '100%' },
    tablet: { padding: '24px', maxWidth: 550, margin: '0 auto' },
    desktop: { padding: '32px', maxWidth: 550, margin: '0 auto' },
  },
  twoColumn: {
    mobile: { display: 'block' },
    desktop: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' },
  },
  chatOverlay: {
    mobile: { position: 'fixed' as const, inset: 0, zIndex: 50, borderRadius: 0, maxHeight: '100vh' },
    desktop: { borderRadius: 14, maxHeight: 400 },
  },
} as const;

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function getResponsiveStyle(breakpoint: Breakpoint, key: keyof typeof responsiveStyles): CSSProperties {
  const styles = responsiveStyles[key] as Record<string, CSSProperties>;
  return styles[breakpoint] || {};
}
