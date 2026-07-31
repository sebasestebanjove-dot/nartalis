'use client';

import { useEffect, useRef } from 'react';
import { HeartPulse } from 'lucide-react';
import { styles } from './screens/styles';
import { track } from '@/lib/analytics';

export default function PersonalSpaceCard() {
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
    // FASE 1: la ruta de registro no existe aún.
    // El CTA queda preparado arquitectónicamente para FASE 2:
    // eliminar el preventDefault cuando la ruta /registro esté disponible.
    e.preventDefault();
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
