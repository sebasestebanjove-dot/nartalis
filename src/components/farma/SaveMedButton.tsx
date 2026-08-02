'use client'

import { useState, useCallback, useRef } from 'react'
import { Star, Bookmark, BookmarkCheck } from 'lucide-react'
import Link from 'next/link'
import { track } from '@/lib/analytics'
import AuthModal from '@/components/auth/AuthModal'
import { styles } from './screens/styles'

interface PublicSessionUser {
  id: string
  name: string
  email: string
  plan: string
  role: string
}

interface SaveMedButtonProps {
  nregistro: string
  nombre: string
  initialSessionUser?: PublicSessionUser | null
  initialIsSaved?: boolean
  initialIsFavorite?: boolean
}

const PENDING_SAVE_KEY = 'nartalis_pending_save'

export default function SaveMedButton({
  nregistro,
  nombre,
  initialSessionUser,
  initialIsSaved = false,
  initialIsFavorite = false,
}: SaveMedButtonProps) {
  const [sessionUser, setSessionUser] = useState<PublicSessionUser | null>(initialSessionUser ?? null)
  const [isSaved, setIsSaved] = useState(initialIsSaved)
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [saving, setSaving] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const pendingRef = useRef(false)

  const handleSaveClick = useCallback(async () => {
    if (saving || isSaved) return

    if (!sessionUser) {
      track('save_click_anon')
      track('save_auth_required')
      pendingRef.current = true
      try {
        sessionStorage.setItem(PENDING_SAVE_KEY, JSON.stringify({ nregistro, nombre }))
      } catch { /* sin almacenamiento */ }
      setShowAuth(true)
      return
    }

    setSaving(true)
    track('save_click_auth')
    try {
      const res = await fetch('/api/espacio/medicamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nregistro, nombre }),
      })
      if (res.ok) {
        track('save_success')
        setIsSaved(true)
        setIsFavorite(false)
      }
    } catch { /* silencioso */ }
    setSaving(false)
  }, [sessionUser, isSaved, saving, nregistro, nombre])

  const handleToggleFavorite = useCallback(async () => {
    if (!isSaved) return
    const next = !isFavorite
    setIsFavorite(next)
    track(next ? 'space_med_favorite' : 'space_med_unfavorite')
    try {
      await fetch(`/api/espacio/medicamentos/${encodeURIComponent(nregistro)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: next }),
      })
    } catch { /* silencioso */ }
  }, [isSaved, isFavorite, nregistro])

  const handleAuthSuccess = useCallback(async () => {
    pendingRef.current = false
    let pending: { nregistro?: string; nombre?: string } | null = null
    try {
      const raw = sessionStorage.getItem(PENDING_SAVE_KEY)
      if (raw) pending = JSON.parse(raw) as { nregistro?: string; nombre?: string }
    } catch { /* sin almacenamiento */ }

    if (pending && pending.nregistro) {
      try {
        const res = await fetch('/api/espacio/medicamentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nregistro: pending.nregistro, nombre: pending.nombre || '' }),
        })
        if (res.ok) {
          track('save_success')
          setIsSaved(true)
          setIsFavorite(false)
        }
      } catch { /* silencioso */ }
      try { sessionStorage.removeItem(PENDING_SAVE_KEY) } catch { /* sin almacenamiento */ }
    }

    try {
      const res = await fetch('/api/auth/session')
      if (res.ok) {
        const data = await res.json()
        if (data.authenticated && data.user) setSessionUser(data.user as PublicSessionUser)
      }
    } catch { /* silencioso */ }
    setShowAuth(false)
  }, [])

  const handleAuthClose = useCallback(() => {
    pendingRef.current = false
    setShowAuth(false)
  }, [])

  return (
    <>
      <div style={styles.saveBar}>
        <button
          onClick={() => {
            if (isSaved) {
              handleToggleFavorite()
            } else {
              handleSaveClick()
            }
          }}
          aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          aria-pressed={isFavorite}
          disabled={!isSaved && saving}
          style={{
            ...styles.saveStar,
            ...(isFavorite ? styles.saveStarActive : {}),
            ...(!isSaved && saving ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
          }}
        >
          <Star size={20} fill={isFavorite ? '#FBBF24' : 'none'} />
        </button>

        {isSaved ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, flexWrap: 'wrap' }}>
            <span style={styles.saveSaved}>
              <BookmarkCheck size={17} /> Guardado ✓
            </span>
            <Link href="/espacio" style={styles.saveLink}>
              Ver en mi espacio
            </Link>
          </div>
        ) : (
          <button
            onClick={handleSaveClick}
            disabled={saving}
            style={{
              ...styles.saveBtn,
              flex: 1,
              ...(saving ? { opacity: 0.7, cursor: 'default' } : {}),
            }}
          >
            <Bookmark size={17} /> {sessionUser ? 'Guardar en mi espacio' : 'Guardar y crear mi espacio gratis'}
          </button>
        )}
      </div>

      <AuthModal
        open={showAuth}
        onClose={handleAuthClose}
        onSuccess={handleAuthSuccess}
        initialMode="register"
      />
    </>
  )
}
