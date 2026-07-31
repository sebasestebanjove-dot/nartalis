'use client'

import { useEffect, useRef } from 'react';
import AuthFlow, { type AuthMode } from './AuthFlow';

const TITLE_ID = 'auth-modal-title';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

interface AuthModalProps {
  initialMode?: AuthMode;
  open: boolean;
  onClose: () => void;
  onSuccess?: (mode: AuthMode) => void;
}

export default function AuthModal({ initialMode = 'register', open, onClose, onSuccess }: AuthModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    // Recordar el elemento que abrió el modal para devolverle el foco al cerrar.
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialog = dialogRef.current;
    if (dialog) {
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const first = focusables.find((el) => el.offsetParent !== null) ?? focusables[0];
      if (first) {
        first.focus();
      } else {
        dialog.setAttribute('tabindex', '-1');
        dialog.focus();
      }
    }

    // Bloquear scroll del body mientras el modal está abierto.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;

      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        // SHIFT+TAB: si estamos en el primero o fuera del modal, volver al último.
        if (active === first || (active && !dialog.contains(active))) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // TAB: si estamos en el último o fuera del modal, volver al primero.
        if (active === last || (active && !dialog.contains(active))) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Restaurar scroll del body.
      document.body.style.overflow = prevOverflow;
      // Devolver el foco al elemento que abrió el modal.
      if (triggerRef.current) triggerRef.current.focus();
      triggerRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      aria-label="Registro o inicio de sesión en Nartalis"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overscrollBehavior: 'contain',
      }}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: 20,
          background: 'transparent',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <AuthFlow
          initialMode={initialMode}
          onSuccess={onSuccess}
          onBack={onClose}
          titleId={TITLE_ID}
        />
      </div>
    </div>
  );
}
