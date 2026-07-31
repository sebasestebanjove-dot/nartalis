'use client'

import { useEffect } from 'react';

// Elimina el parámetro temporal ?welcome=1 de la URL tras el primer render,
// para que el copy de "Hemos creado tu cuenta" no se muestre en visitas posteriores.
export default function EspacioCleanUrl() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('welcome')) {
        url.searchParams.delete('welcome');
        window.history.replaceState(null, '', url.toString());
      }
    } catch {
      // sin cambios: el parámetro se ignora igualmente
    }
  }, []);

  return null;
}
