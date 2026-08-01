'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { HeartPulse } from 'lucide-react';
import { track } from '@/lib/analytics';
import type { PublicSessionUser } from '@/lib/auth';

interface PersonalSpaceCardProps {
  onCta?: () => void;
  onLoginCta?: () => void;
  sessionUser?: PublicSessionUser | null;
}

export default function PersonalSpaceCard({ onCta, onLoginCta, sessionUser = null }: PersonalSpaceCardProps = {}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const viewTracked = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      if (!viewTracked.current && entries.some(e => e.isIntersecting)) {
        viewTracked.current = true;
        track('personal_space_cta_view');
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    track('personal_space_cta_click');
    if (onCta) {
      e.preventDefault();
      onCta();
    }
  };

  return (
    <div ref={ref} style={S.card}>
      <div style={S.header}>
        <div style={S.iconWrap}>
          <HeartPulse size={24} strokeWidth={2} color="#FFFFFF" aria-hidden="true" />
        </div>
        <div style={S.textBlock}>
          <strong style={S.title}>Tu espacio personal</strong>
          <span style={S.sub}>Guarda tus medicamentos y organiza tu botiquín.</span>
          <span style={S.extra}>Favoritos, historial y alertas siempre contigo.</span>
        </div>
      </div>
      {sessionUser ? (
        <Link
          href="/espacio"
          className="ps-cta"
          onClick={() => track('account_space_click')}
          style={S.cta}
          aria-label="Ir a mi espacio personal"
        >
          Ir a mi espacio personal &rarr;
        </Link>
      ) : (
        <>
          <a
            href="/registro"
            className="ps-cta"
            onClick={handleClick}
            style={S.cta}
            role="button"
            aria-label="Crear mi espacio gratis"
          >
            Crear mi espacio gratis
          </a>
          <div style={S.loginRow}>
            ¿Ya tienes una cuenta?{' '}
            <a
              href={onLoginCta ? undefined : '/login'}
              onClick={(e) => {
                if (onLoginCta) {
                  e.preventDefault();
                  onLoginCta();
                }
              }}
              style={S.loginLink}
            >
              Accede a tu espacio &rarr;
            </a>
          </div>
        </>
      )}
      <style>{`
        .ps-cta:focus-visible {
          outline: 2px solid #A78BFA;
          outline-offset: 2px;
        }
        .ps-cta:hover {
          background: linear-gradient(135deg, #0B9BC7, #0AA8D4) !important;
          box-shadow: 0 4px 20px rgba(13,127,174,0.4);
        }
      `}</style>
    </div>
  );
}

const S = {
  card: {
    width: '100%',
    maxWidth: 560,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.9rem',
    padding: '1.25rem',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    backdropFilter: 'blur(8px)',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.9rem',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: 'linear-gradient(135deg, #0D7FAE, #0B9BC7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  title: {
    fontSize: 17,
    color: '#F1F5F9',
    fontWeight: 700,
    marginBottom: '0.2rem',
  },
  sub: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 1.5,
  },
  extra: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 1.5,
    marginTop: '0.15rem',
  },
  cta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    padding: '0.7rem 1.4rem',
    borderRadius: 14,
    background: 'linear-gradient(135deg, #0D7FAE, #0B9BC7)',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 700,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background 0.2s, box-shadow 0.2s',
    textAlign: 'center' as const,
  },
  loginRow: {
    marginTop: '0.5rem',
    textAlign: 'center' as const,
    fontSize: 14,
    color: '#64748B',
  },
  loginLink: {
    color: '#0DBB91',
    textDecoration: 'none',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
