'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, Mic, MicOff, Loader2, AlertTriangle, ShieldCheck, HeartPulse, Users, Pill } from 'lucide-react';
import PersonalSpaceCard from '../PersonalSpaceCard';
import { track } from '@/lib/analytics';
import { makeSlug } from '@/lib/slug';
import type { PublicSessionUser } from '@/lib/auth';

interface Props {
  onSearch: (q: string, type?: 'text' | 'voice') => void;
  onPersonalSpaceCta?: () => void;
  onLoginCta?: () => void;
  initialQuery?: string;
  sessionUser?: PublicSessionUser | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  processLocally?: boolean;
  onstart: (() => void) | null;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

type MicStatus = 'idle' | 'connecting' | 'listening' | 'recording' | 'blocked' | 'error';

interface Suggestion {
  nombre: string;
  registro: string;
}

const VOICE_TIMEOUT_MS = 8000;
const SUGGEST_MIN_CHARS = 2;
const SUGGEST_MAX_RESULTS = 8;
const SUGGEST_DEBOUNCE_MS = 300;

export default function SearchScreen({ onSearch, initialQuery = '', onPersonalSpaceCta, onLoginCta, sessionUser = null }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [micStatus, setMicStatus] = useState<MicStatus>('idle');
  const [hasVoiceSupport, setHasVoiceSupport] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);
  const didErrorRef = useRef(false);
  const langRetriedRef = useRef(false);
  const onSearchRef = useRef(onSearch);
  const stopRequestedRef = useRef(false);
  const searchedThisCycleRef = useRef(false);
  const transcriptRef = useRef('');
  const voiceActiveRef = useRef(false);
  onSearchRef.current = onSearch;

  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestAbortRef = useRef<AbortController | null>(null);
  const suggestSeqRef = useRef(0);
  const suggestWrapRef = useRef<HTMLDivElement>(null);

  const closeSuggest = () => {
    suggestSeqRef.current += 1;
    if (suggestAbortRef.current) { try { suggestAbortRef.current.abort(); } catch {} suggestAbortRef.current = null; }
    setSuggestions([]);
    setSuggestOpen(false);
    setActiveIndex(-1);
  };

  const fetchSuggestions = async (q: string) => {
    const seq = suggestSeqRef.current + 1;
    suggestSeqRef.current = seq;
    if (suggestAbortRef.current) { try { suggestAbortRef.current.abort(); } catch {} }
    const controller = new AbortController();
    suggestAbortRef.current = controller;
    setSuggestLoading(true);
    try {
      const r = await fetch(`/api/farma/suggest?q=${encodeURIComponent(q)}`, { signal: controller.signal });
      if (seq !== suggestSeqRef.current) return;
      const data = await r.json();
      if (seq !== suggestSeqRef.current) return;
      const list: Suggestion[] = ((data.resultados || []) as Suggestion[]).slice(0, SUGGEST_MAX_RESULTS);
      setSuggestions(list);
      setSuggestOpen(true);
      setActiveIndex(-1);
    } catch {
      if (seq === suggestSeqRef.current) { setSuggestions([]); setSuggestOpen(false); setActiveIndex(-1); }
    } finally {
      if (seq === suggestSeqRef.current) setSuggestLoading(false);
    }
  };

  const handleInputChange = (v: string) => {
    setQuery(v);
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    const trimmed = v.trim();
    if (trimmed.length < SUGGEST_MIN_CHARS) {
      suggestSeqRef.current += 1;
      setSuggestions([]);
      setSuggestOpen(false);
      setActiveIndex(-1);
      return;
    }
    suggestTimerRef.current = setTimeout(() => { fetchSuggestions(trimmed); }, SUGGEST_DEBOUNCE_MS);
  };

  const selectSuggestion = (item: Suggestion) => {
    closeSuggest();
    setQuery('');
    router.push(`/prospectos/${makeSlug(item.nombre, item.registro)}`);
  };

  const handleSuggestionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) { setActiveIndex((i) => (i + 1) % suggestions.length); setSuggestOpen(true); }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) { setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1)); setSuggestOpen(true); }
      return;
    }
    if (e.key === 'Escape') {
      if (suggestOpen) { closeSuggest(); return; }
    }
    if (e.key === 'Enter') {
      if (suggestOpen && activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
      }
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (suggestWrapRef.current && !suggestWrapRef.current.contains(e.target as Node)) { closeSuggest(); } };
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
      if (suggestAbortRef.current) { try { suggestAbortRef.current.abort(); } catch {} }
    };
  }, []);

  const doVoiceSearch = (transcript: string) => {
    const text = transcript.trim();
    if (text.length >= 2) {
      setQuery(text);
      if (!searchedThisCycleRef.current) {
        searchedThisCycleRef.current = true;
        onSearchRef.current(text, 'voice');
      }
    }
  };

  /* ── helpers (solo dependen de refs — sin stale closure) ── */

  const clearSafetyTimeout = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const abortRecognition = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
  };

  const cleanupMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  };

  const resetRefs = () => {
    startedRef.current = false;
    didErrorRef.current = false;
  };

  const resetToIdle = () => {
    clearSafetyTimeout();
    resetRefs();
    transcriptRef.current = '';
    voiceActiveRef.current = false;
    setVoiceError('');
    setMicStatus('idle');
  };

  /* ── Detección de soporte + cleanup en unmount ── */

  useEffect(() => {
    const hasSR = typeof window !== 'undefined' && (
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    );
    const hasMR = typeof window !== 'undefined' && 'MediaRecorder' in window;
    setHasVoiceSupport(!!hasSR || !!hasMR);

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
        recognitionRef.current = null;
      }
      cleanupMedia();
      clearSafetyTimeout();
    };
  }, []);

  /* ── Analítica FASE 1: la Home (vista de búsqueda) se ha mostrado ── */
  useEffect(() => {
    track('home_view');
  }, []);

  /* ── fallback: MediaRecorder + Whisper ── */

  const transcribeAudio = async (blob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    const res = await fetch('/api/farma/transcribe', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al transcribir' }));
      throw new Error(err.error || 'Error de transcripción');
    }
    const data = await res.json();
    return (data.text || '').trim().toLowerCase();
  };

  const startRecordingFallback = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        cleanupMedia();
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size < 100) { resetToIdle(); return; }
        setMicStatus('connecting');
        try {
          const text = await transcribeAudio(blob);
          if (text) { doVoiceSearch(text); }
        } catch (err) {
          console.error('Transcripción falló:', err);
          setVoiceError('Error al transcribir el audio');
          setMicStatus('error');
        }
        resetToIdle();
      };
      recorder.start();
      setMicStatus('recording');
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 4000);
    } catch {
      resetToIdle();
    }
  };

  /* ── Pulsar / Mantener / Soltar ──

     startVoiceGrab (pointerdown): inicia captura → estado ROJO.
     stopVoiceGrab (pointerup / pointercancel): detiene captura →
     la transcripción (fallback) o el onresult (SR) dispara la búsqueda
     automáticamente. Nunca 2 búsquedas: searchedThisCycleRef evita dup.
  */

  const startVoiceGrab = () => {
    if (!hasVoiceSupport) {
      setMicStatus('blocked');
      return;
    }
    if (micStatus !== 'idle') return;

    searchedThisCycleRef.current = false;
    stopRequestedRef.current = false;
    clearSafetyTimeout();

    const SpeechRecognitionAPI = (typeof window !== 'undefined') && (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (SpeechRecognitionAPI) {
      if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognitionAPI();
      }
      const recognition = recognitionRef.current;

      const stringsIdioma = [navigator.language, 'es-ES', 'es'];
      recognition.lang = stringsIdioma.find(lang => lang && lang.startsWith('es')) || 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = true;
      if ('processLocally' in recognition) {
        (recognition as any).processLocally = true;
      }

      recognition.onstart = () => {
        startedRef.current = true;
        voiceActiveRef.current = true;
        transcriptRef.current = '';
        searchedThisCycleRef.current = false;
        clearSafetyTimeout();
        setMicStatus('listening');
      };

      recognition.onresult = (e: any) => {
        let finalTr = '';
        for (let i = 0; i < e.results.length; i++) {
          const res = e.results[i];
          const alt = res[0];
          const piece = alt ? alt.transcript : '';
          if (res.isFinal) {
            finalTr = piece;
          } else {
            transcriptRef.current = piece;
          }
        }
        const usable = finalTr || transcriptRef.current;
        setQuery(usable);
        if (finalTr && finalTr.trim().length >= 2) {
          doVoiceSearch(finalTr);
        }
      };

      recognition.onerror = (e: any) => {
        console.error('Speech error:', e.error);
        clearSafetyTimeout();
        if (e.error === 'language-not-supported' && !langRetriedRef.current) {
          langRetriedRef.current = true;
          recognition.lang = '';
          clearSafetyTimeout();
          try { recognition.start(); return; } catch {}
        }
        didErrorRef.current = true;
        if (e.error !== 'language-not-supported') {
          setVoiceError(String(e.error));
        }
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          setMicStatus('blocked');
        } else {
          setMicStatus('error');
        }
        try { recognition.abort(); } catch {}
        startedRef.current = false;
        voiceActiveRef.current = false;
      };

      recognition.onend = () => {
        clearSafetyTimeout();
        startedRef.current = false;
        voiceActiveRef.current = false;
        if (didErrorRef.current) {
          transcriptRef.current = '';
          resetRefs();
          setMicStatus('idle');
          return;
        }
        const pendingText = (transcriptRef.current || '').trim();
        const shouldSearch = pendingText.length >= 2 && !searchedThisCycleRef.current;
        resetToIdle();
        if (shouldSearch) {
          doVoiceSearch(pendingText);
        }
      };

      clearSafetyTimeout();
      timeoutRef.current = setTimeout(() => {
        if (!startedRef.current && recognitionRef.current) {
          console.error('Voice timeout: onstart never fired after 4s');
          didErrorRef.current = true;
          setVoiceError('timeout');
          try { recognitionRef.current.abort(); } catch {}
          startedRef.current = false;
          setMicStatus('error');
        }
      }, VOICE_TIMEOUT_MS);

      try {
        setMicStatus('connecting');
        recognition.start();
        return;
      } catch (ex) {
        console.error('recognition.start() threw:', ex);
        clearSafetyTimeout();
        resetRefs();
      }
    }

    setMicStatus('connecting');
    startRecordingFallback();
  };

  const stopVoiceGrab = () => {
    stopRequestedRef.current = true;
    if (recognitionRef.current && micStatus === 'listening') {
      try { recognitionRef.current.stop(); } catch {}
    } else if (mediaRecorderRef.current && micStatus === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
  };

  const handleSearch = () => {
    const q = query.trim();
    if (q.length >= 2) onSearch(q, 'text');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Escape') {
      handleSuggestionKeyDown(e);
      return;
    }
    if (e.key === 'Enter') {
      if (suggestOpen && activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
        return;
      }
      closeSuggest();
      handleSearch();
    }
  };

  const getMicIcon = () => {
    switch (micStatus) {
      case 'connecting': return <Loader2 size={20} className="farma-spin" color="#3B82F6" />;
      case 'listening': return <MicOff size={20} color="#EF4444" />;
      case 'recording': return <Loader2 size={20} className="farma-spin" color="#EF4444" />;
      case 'blocked': return <AlertTriangle size={20} color="#F97316" />;
      case 'error': return <MicOff size={20} color="#A1A1AA" />;
      default: return <Mic size={20} />;
    }
  };

  const getMicLabel = () => {
    switch (micStatus) {
      case 'connecting': return 'Conectando...';
      case 'listening': return 'Escuchando...';
      case 'recording': return 'Escuchando...';
      case 'blocked': return 'Micrófono bloqueado';
      case 'error': return 'Voz no disponible';
      default: return hasVoiceSupport ? 'Buscar por voz' : 'Voz no disponible';
    }
  };

  const getMicHint = () => {
    switch (micStatus) {
      case 'listening': return 'Di el nombre del medicamento en voz alta...';
      case 'recording': return 'Habla ahora...';
      case 'connecting': return 'Preparando micrófono...';
      case 'blocked': return 'Permite el micrófono para buscar por voz.';
      case 'error': return voiceError ? `Error detectado: ${voiceError}` : 'Búsqueda por voz no disponible temporalmente.';
      default: return 'Mantén pulsado y di el nombre del medicamento. Suelta para buscar.';
    }
  };

  return (
    <div style={S.container}>
      {/* ── Hero ── */}
      <div style={S.hero}>
        <div style={S.branding}>
          <Image
            src="/logos/logo_ok_2026.png"
            alt="Logo Nartalis"
            width={1254}
            height={1254}
            sizes="(max-width: 480px) 40px, (max-width: 768px) 44px, 50px"
            style={{ width: 'auto', height: 'auto', flexShrink: 0 }}
            priority
          />
          <span className="farma-hero-brand" style={S.brand}>Nartalis</span>
        </div>
        <h1 className="farma-hero-h1" style={S.h1}>Información oficial de medicamentos y prospectos</h1>
        <p className="farma-hero-sub" style={S.subtitle}>
          Busca cualquier medicamento y consulta su prospecto y ficha técnica con información oficial de la AEMPS (CIMA), siempre actualizada.
        </p>
      </div>

      {/* ── Search Box ── */}
      <div ref={suggestWrapRef} style={S.searchWrap}>
        <h2 style={S.h2}>Encuentra información sobre tus medicamentos</h2>
        <div style={S.searchBox}>
          <svg style={S.searchIcon} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            style={S.input}
            type="text"
            placeholder="Busca tu prospecto oficial..."
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            autoComplete="off"
            aria-label="Buscar medicamento"
            role="combobox"
            aria-expanded={suggestOpen}
            aria-controls="farma-suggest-dropdown"
            aria-autocomplete="list"
          />
          {suggestLoading && (
            <div style={S.searchLoader} aria-hidden="true">
              <Loader2 size={18} className="farma-spin" color="#3B82F6" />
            </div>
          )}
          <button
            style={S.searchBtn}
            onClick={handleSearch}
            disabled={query.trim().length < 2}
            aria-label="Buscar"
          >
            <Search size={22} />
          </button>
          {suggestOpen && suggestions.length > 0 && (
            <div id="farma-suggest-dropdown" style={S.dropdown} role="listbox" aria-label="Sugerencias de medicamentos">
              {suggestions.map((item, i) => (
                <div
                  key={item.registro}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); selectSuggestion(item); }}
                  style={{ ...S.dropItem, background: i === activeIndex ? '#EFF6FF' : 'transparent' }}
                >
                  <div style={S.dropItemIcon}>
                    <Pill size={16} color="#3B82F6" />
                  </div>
                  <div style={S.dropItemName}>{item.nombre}</div>
                </div>
              ))}
            </div>
          )}
          {suggestOpen && suggestions.length === 0 && !suggestLoading && query.trim().length >= SUGGEST_MIN_CHARS && (
            <div id="farma-suggest-dropdown" style={S.dropdownEmpty}>
              No se encontraron medicamentos con ese nombre.
            </div>
          )}
        </div>
      </div>

      {/* ── Voice CTA ── */}
      <button
        onPointerDown={startVoiceGrab}
        onPointerUp={stopVoiceGrab}
        onPointerLeave={stopVoiceGrab}
        onPointerCancel={stopVoiceGrab}
        disabled={micStatus === 'connecting'}
        aria-label={micStatus === 'listening' || micStatus === 'recording' ? 'Detener grabación' : 'Buscar por voz'}
        style={{
          ...S.voiceBtn,
          borderColor: micStatus === 'listening' || micStatus === 'recording' ? '#EF4444' : 'transparent',
          background: micStatus === 'idle' ? 'linear-gradient(135deg, #08A878, #0DBB91)' : (micStatus === 'listening' || micStatus === 'recording' ? 'rgba(239,68,68,0.15)' : '#0A2847'),
          color: micStatus === 'idle' ? '#FFFFFF' : (micStatus === 'listening' || micStatus === 'recording' ? '#EF4444' : '#A78BFA'),
          opacity: micStatus === 'connecting' ? 0.6 : 1,
        }}
      >
        {getMicIcon()}
        <span>{getMicLabel()}</span>
      </button>

      <p style={S.hint}>{getMicHint()}</p>

      {/* ── Personal Space ── */}
      <PersonalSpaceCard onCta={onPersonalSpaceCta} onLoginCta={onLoginCta} sessionUser={sessionUser} />

      {/* ── Three Value Props ── */}
      <div style={S.cardsRow}>
        <div style={S.card}>
          <div style={{ ...S.cardIcon, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <ShieldCheck size={22} strokeWidth={2} color="#60A5FA" />
          </div>
          <strong style={S.cardTitle}>Información oficial</strong>
          <span style={S.cardDesc}>Fuentes oficiales para consultar tus medicamentos.</span>
        </div>

        <div style={S.card}>
          <div style={{ ...S.cardIcon, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <HeartPulse size={22} strokeWidth={2} color="#34D399" />
          </div>
          <strong style={S.cardTitle}>Cuidado personalizado</strong>
          <span style={S.cardDesc}>Herramientas para cuidar mejor de ti.</span>
        </div>

        <div style={S.card}>
          <div style={{ ...S.cardIcon, background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)' }}>
            <Users size={22} strokeWidth={2} color="#C084FC" />
          </div>
          <strong style={S.cardTitle}>Para toda la familia</strong>
          <span style={S.cardDesc}>Cuida y organiza la información de toda tu familia.</span>
        </div>
      </div>

      {/* ── Internal linking SEO (hub) ── */}
          <div style={S.hubSection}>
            <h2 style={S.h2}>Explora medicamentos y principios activos</h2>
            <nav aria-label="Explorar medicamentos, principios activos y clasificación ATC" style={S.hubNav}>
              <div style={S.hubCol}>
                <Link href="/medicamentos" style={S.hubLink}>Todos los medicamentos</Link>
                <Link href="/principios-activos" style={S.hubLink}>Principios activos</Link>
                <div style={S.hubSubgroup}>
                  <Link href="/principios-activos/paracetamol" style={S.hubSubLink}>Paracetamol</Link>
                  <Link href="/principios-activos/ibuprofeno" style={S.hubSubLink}>Ibuprofeno</Link>
                </div>
              </div>
              <div style={S.hubCol}>
                <Link href="/atc" style={S.hubLink}>Clasificación ATC</Link>
                <div style={S.hubSubgroup}>
                  <Link href="/atc/A02BC" style={S.hubSubLink}>
                    <div style={{ lineHeight: 1.3 }}>
                      <div>Grupo de medicamentos</div>
                      <div style={{ fontSize: '0.85rem', color: '#A78BFA', marginTop: '0.25rem' }}>Código ATC: A02BC</div>
                      Inhibidores de la bomba de protones
                    </div>
                  </Link>
                </div>
              </div>
            </nav>
          </div>

      <style>{`
        .farma-spin {
          animation: farmaSpin 1s linear infinite;
        }
        @keyframes farmaSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes farmaMicPulse {
          0%, 100% { box-shadow: 0 0 16px rgba(16,185,129,0.15); }
          50% { box-shadow: 0 0 32px rgba(16,185,129,0.3); }
        }
        @media (max-width: 480px) {
          .farma-search-box { padding: 1rem !important; }
          .farma-hero-brand { font-size: 28px !important; }
          .farma-hero-h1 { font-size: 30px !important; }
          .farma-hero-sub { font-size: 16px !important; }
        }
      `}</style>
    </div>
  );
}

const S = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #051230 0%, #092048 30%, #0C2C5E 55%, #0D3669 100%)',
    color: '#FFFFFF',
    padding: '3rem 1.25rem 4rem',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  hero: {
    textAlign: 'center' as const,
    maxWidth: 620,
    marginBottom: '2.5rem',
  },
  branding: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    marginBottom: '0.6rem',
  },
  brand: {
    display: 'inline',
    fontSize: 34,
    fontWeight: 800,
    color: '#60A5FA',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  },
  h1: {
    fontSize: 36,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: '0 0 1rem',
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: 18,
    color: '#93B4D0',
    margin: 0,
    lineHeight: 1.55,
    maxWidth: 480,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  h2: {
    fontSize: 20,
    fontWeight: 700,
    color: '#E2E8F0',
    margin: '0 0 0.9rem',
    textAlign: 'center' as const,
    lineHeight: 1.3,
  },
  searchWrap: {
    width: '100%',
    maxWidth: 560,
    marginBottom: '1rem',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.45rem',
    borderRadius: 18,
    background: '#FFFFFF',
    border: '1px solid rgba(0,0,0,0.06)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    position: 'relative' as const,
  },
  searchLoader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 8,
    borderRadius: 14,
    background: '#FFFFFF',
    border: '1px solid rgba(0,0,0,0.08)',
    boxShadow: '0 16px 36px rgba(0,0,0,0.4)',
    overflow: 'hidden',
    zIndex: 30,
    maxHeight: 320,
    overflowY: 'auto' as const,
  },
  dropdownEmpty: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 8,
    borderRadius: 14,
    background: '#FFFFFF',
    border: '1px solid rgba(0,0,0,0.08)',
    boxShadow: '0 16px 36px rgba(0,0,0,0.4)',
    zIndex: 30,
    padding: '1rem 1.1rem',
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center' as const,
  },
  dropItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0.7rem 0.9rem',
    cursor: 'pointer',
    borderBottom: '1px solid #F1F5F9',
  },
  dropItemIcon: {
    width: 34,
    height: 34,
    minWidth: 34,
    borderRadius: 10,
    background: 'rgba(59,130,246,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dropItemName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1E293B',
    lineHeight: 1.35,
    overflowWrap: 'break-word' as const,
  },
  searchIcon: {
    width: 22,
    height: 22,
    minWidth: 22,
    marginLeft: '0.7rem',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 18,
    padding: '0.8rem 0.3rem',
    border: 'none',
    background: 'transparent',
    color: '#1E293B',
    outline: 'none',
    fontFamily: 'inherit',
  },
  searchBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    minWidth: 50,
    height: 50,
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(135deg, #0D7FAE, #0B9BC7)',
    color: '#fff',
    cursor: 'pointer',
    flexShrink: 0,
    marginRight: '0.3rem',
  },
  voiceBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.6rem',
    width: '100%',
    maxWidth: 560,
    minHeight: 52,
    padding: '0.75rem',
    borderRadius: 16,
    border: 'none',
    fontSize: 17,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s, background 0.15s, color 0.15s',
    marginBottom: '0.3rem',
  },
  hint: {
    fontSize: 14,
    color: '#7895B5',
    textAlign: 'center' as const,
    margin: '0.3rem 0 1.8rem',
    maxWidth: 480,
    lineHeight: 1.5,
  },
  cardsRow: {
    width: '100%',
    maxWidth: 560,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '0.8rem',
    marginTop: '1.5rem',
    marginBottom: '1.2rem',
  },
  card: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: '0.6rem',
    padding: '1.25rem',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(8px)',
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: 16,
    color: '#F1F5F9',
    fontWeight: 700,
  },
  cardDesc: {
    fontSize: 13,
    color: '#93B4D0',
    lineHeight: 1.5,
  },
  hubSection: {
    width: '100%',
    maxWidth: 560,
    marginTop: '1.6rem',
    padding: '1.4rem 1.5rem',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(8px)',
  },
  hubNav: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1.1rem',
  },
  hubCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: '0.35rem',
  },
  hubLink: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    padding: '0.25rem 0',
    lineHeight: 1.4,
  },
  hubSubgroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: '0.2rem',
    paddingLeft: '0.7rem',
    borderLeft: '1px solid rgba(255,255,255,0.12)',
  },
  hubSubLink: {
    color: '#93B4D0',
    fontSize: 13,
    textDecoration: 'none',
    padding: '0.2rem 0',
    lineHeight: 1.4,
  },
};
