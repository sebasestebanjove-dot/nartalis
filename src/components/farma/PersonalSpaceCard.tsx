'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { HeartPulse } from 'lucide-react';
import { styles } from './screens/styles';
import { track } from '@/lib/analytics';
import type { PublicSessionUser } from '@/lib/auth';

interface PersonalSpaceCardProps {
  onCta?: () => void;
  sessionUser?: PublicSessionUser | null;
}

export default function PersonalSpaceCard({ onCta, sessionUser = null }: PersonalSpaceCardProps = {}) {
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
    <div ref={ref} style={styles.psCard}>
      <div style={styles.psCardHeader}>
        <div style={styles.psCardEmoji}>
          <HeartPulse size={26} strokeWidth={2} color="#FFFFFF" aria-hidden="true" />
        </div>
        <div style={styles.psCardText}>
          <strong style={styles.psCardTitle}>Tu espacio personal</strong>
          <span style={styles.psCardSub}>Guarda tus medicamentos y organiza tu botiquín.</span>
          <span style={styles.psCardExtra}>Favoritos, historial y alertas siempre contigo.</span>
        </div>
      </div>
      {sessionUser ? (
        <Link
          href="/espacio"
          className="ps-cta"
          onClick={() => track('account_space_click')}
          style={styles.psCardCta}
          aria-label="Entrar en mi espacio"
        >
          Entrar en mi espacio
        </Link>
      ) : (
        <a
          href="/registro"
          className="ps-cta"
          onClick={handleClick}
          style={styles.psCardCta}
          role="button"
          aria-label="Crear mi espacio gratis"
        >
          Crear mi espacio gratis
        </a>
      )}
      <style>{`
        .ps-cta:focus-visible {
          outline: 2px solid #FFFFFF;
          outline-offset: 2px;
        }
        .ps-cta:hover {
          background: linear-gradient(135deg, #7C5CFF, #A88FFF) !important;
        }
      `}</style>
    </div>
  );
}
