'use client';

import { V } from './V2Styles';

interface Props {
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCta?: () => void;
}

export default function V2Empty({ icon, title, description, ctaLabel, ctaHref, onCta }: Props) {
  const ctaStyle: React.CSSProperties = V.emptyCta;
  return (
    <div style={V.empty}>
      <div style={V.emptyIconWrap}>{icon}</div>
      <div style={V.emptyTitle}>{title}</div>
      <p style={V.emptyDesc}>{description}</p>
      {onCta && ctaLabel && (
        <button
          type="button"
          onClick={onCta}
          style={ctaStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = V.c.primaryMuted; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = V.c.primaryLight; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {ctaLabel}
        </button>
      )}
      {!onCta && ctaLabel && ctaHref && (
        <a
          href={ctaHref}
          style={ctaStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = V.c.primaryMuted; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = V.c.primaryLight; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {ctaLabel}
        </a>
      )}
    </div>
  );
}
