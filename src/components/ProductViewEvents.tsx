'use client'

// Emite page_view (GA4 + Neon) en cada cambio de ruta y en el primer mount.
// Sin PII y fire-and-forget. El dedupe por pathname evita dobles eventos en
// navegaciones de Next.

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { emit } from '@/lib/product-events'

export default function ProductViewEvents() {
  const pathname = usePathname()
  const lastRef = useRef<string>('')

  useEffect(() => {
    if (!pathname) return
    if (lastRef.current === pathname) return
    lastRef.current = pathname
    emit('page_view', { page: pathname })
  }, [pathname])

  return null
}