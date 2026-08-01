'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Search, Mic, MicOff, Loader2, AlertTriangle, ShieldCheck, Volume2, ScanText, ArrowRight } from 'lucide-react';
import { styles } from './styles';
import PersonalSpaceCard from '../PersonalSpaceCard';
import { track } from '@/lib/analytics';
import type { PublicSessionUser } from '@/lib/auth';

interface Props {
  onSearch: (q: string, type?: 'text' | 'voice') => void;
  onPersonalSpaceCta?: () => void;
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

const VOICE_TIMEOUT_MS = 8000;

function getFirstName(name?: string | null): string | null {
  if (!name) return null;
  const first = name.trim().split(/\s+/)[0];
  if (!first) return null;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export default function SearchScreen({ onSearch, initialQuery = '', onPersonalSpaceCta, sessionUser = null }: Props) {
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
      // interimResults=true: acumulamos el habla en tránsito para no perder texto
      // si el navegador no entrega un onresult final tras stop().
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
        // Respaldo: si el navegador no entregó un onresult final tras stop(), usamos
        // el texto intermedio acumulado. Se captura ANTES de resetToIdle (que limpia
        // transcriptRef), para no perderlo y poder buscarlo.
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
    // Detenemos la captura activa. El transcript (onresult final o acumulado)
    // se dispara la búsqueda desde onend/onstop respectivamente.
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
    if (e.key === 'Enter') handleSearch();
  };

  /* ── UI helpers ── */

  const getMicStyle = () => {
    switch (micStatus) {
      case 'listening': return { borderColor: '#EF4444', background: 'rgba(239,68,68,0.1)' };
      case 'recording': return { borderColor: '#EF4444', background: 'rgba(239,68,68,0.1)' };
      case 'connecting': return { borderColor: '#3B82F6', background: 'rgba(59,130,246,0.1)' };
      case 'blocked': return { borderColor: '#F97316', background: 'rgba(249,115,22,0.1)' };
      case 'error': return { borderColor: '#A1A1AA', background: 'rgba(161,161,170,0.08)' };
      default: return {};
    }
  };

  const getMicIcon = () => {
    switch (micStatus) {
      case 'connecting': return <Loader2 size={28} className="farma-spin" color="#3B82F6" />;
      case 'listening': return <MicOff size={28} color="#EF4444" />;
      case 'recording': return <Loader2 size={28} className="farma-spin" color="#EF4444" />;
      case 'blocked': return <AlertTriangle size={28} color="#F97316" />;
      case 'error': return <MicOff size={28} color="#A1A1AA" />;
      default: return <Mic size={28} />;
    }
  };

  const getMicLabel = () => {
    switch (micStatus) {
      case 'connecting': return 'Conectando...';
      case 'listening': return 'Escuchando...';
      case 'recording': return 'Escuchando...';
      case 'blocked': return 'Micrófono bloqueado';
      case 'error': return 'Voz no disponible';
      default: return hasVoiceSupport ? 'Pulsa y mantén para hablar' : 'Voz no disponible';
    }
  };

  const getMicHint = () => {
    switch (micStatus) {
      case 'listening': return 'Di el nombre del medicamento en voz alta...';
      case 'recording': return 'Habla ahora...';
      case 'connecting': return 'Preparando micrófono...';
      case 'blocked': return 'Haz clic en el candado 🔒 de la URL, permite el micrófono y recarga la página.';
      case 'error': return voiceError ? `Error detectado: ${voiceError}` : 'Búsqueda por voz no disponible temporalmente.';
      default: return 'Mantén pulsado y di el nombre del medicamento. Suelta para buscar.';
    }
  };

  const accountGreeting = (() => {
    const displayName = getFirstName(sessionUser?.name);
    return displayName ? `Hola, ${displayName}` : 'Mi cuenta';
  })();

  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <h1 style={styles.title}>Nartalis</h1>
        <p style={styles.subtitle}>
          Te ayuda a cuidar tu salud y la de los tuyos.
        </p>
        <p style={styles.claimSecondary}>
          Información oficial de medicamentos. Descubre todo lo que Nartalis puede hacer por ti.
        </p>
        {sessionUser && (
          <div style={styles.accountBar}>
            <span style={styles.accountGreeting}>
              {accountGreeting}
            </span>
            <Link
              href="/espacio"
              className="farma-account-link"
              onClick={() => track('account_space_click')}
              style={styles.accountLink}
              aria-label="Mi espacio"
            >
              Mi espacio
              <ArrowRight size={15} strokeWidth={2.5} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>

      <div className="farma-search-box" style={styles.searchBox}>
        <div style={styles.inputRow}>
          <input
            style={styles.input}
            type="text"
            placeholder="Nombre del medicamento..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            aria-label="Nombre del medicamento"
          />
          <button
            style={styles.searchBtn}
            onClick={handleSearch}
            disabled={query.trim().length < 2}
            aria-label="Buscar"
          >
            <Search size={22} />
          </button>
        </div>

        <div style={styles.separator}>o</div>

        <button
          onPointerDown={startVoiceGrab}
          onPointerUp={stopVoiceGrab}
          onPointerLeave={stopVoiceGrab}
          onPointerCancel={stopVoiceGrab}
          disabled={micStatus === 'connecting'}
          aria-label={micStatus === 'listening' || micStatus === 'recording' ? 'Detener grabación' : 'Buscar por voz'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
            width: '100%', minHeight: 56,
            padding: '0.85rem', borderRadius: 14,
            background: micStatus === 'idle' ? 'linear-gradient(135deg, #059669, #10B981)' : (micStatus === 'listening' || micStatus === 'recording' ? 'rgba(239,68,68,0.15)' : '#1C1C1E'),
            border: micStatus === 'idle' ? 'none' : (micStatus === 'listening' || micStatus === 'recording' ? '2px solid #EF4444' : '2px solid #3A3A3C'),
            color: micStatus === 'idle' ? '#fff' : (micStatus === 'listening' || micStatus === 'recording' ? '#EF4444' : '#34D399'),
            fontSize: 20, fontWeight: 700, cursor: micStatus === 'connecting' ? 'default' : 'pointer',
            fontFamily: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s',
            boxShadow: micStatus === 'idle' ? '0 4px 16px rgba(16,185,129,0.3)' : 'none',
            animation: micStatus === 'idle' ? 'farmaMicPulse 2.5s ease-in-out infinite' : 'none',
          }}
        >
          {getMicIcon()}
          <span>{getMicLabel()}</span>
        </button>

        <p style={styles.hint}>{getMicHint()}</p>
      </div>

      <div style={styles.infoCards}>
        <PersonalSpaceCard onCta={onPersonalSpaceCta} sessionUser={sessionUser} />
        <div style={styles.infoCard}>
          <div style={styles.infoCardEmoji}>
            <ShieldCheck size={26} strokeWidth={2} color="#60A5FA" aria-hidden="true" />
          </div>
          <div style={styles.infoCardText}>
            <strong>Datos oficiales</strong>
            <span style={styles.infoCardSub}>Información directamente de la AEMPS</span>
          </div>
        </div>
        <div style={styles.infoCard}>
          <div style={styles.infoCardEmoji}>
            <Volume2 size={26} strokeWidth={2} color="#34D399" aria-hidden="true" />
          </div>
          <div style={styles.infoCardText}>
            <strong>Lectura por voz</strong>
            <span style={styles.infoCardSub}>Escucha la información del medicamento</span>
          </div>
        </div>
        <div style={styles.infoCard}>
          <div style={styles.infoCardEmoji}>
            <ScanText size={26} strokeWidth={2} color="#C084FC" aria-hidden="true" />
          </div>
          <div style={styles.infoCardText}>
            <strong>Alta legibilidad</strong>
            <span style={styles.infoCardSub}>Texto grande y de alto contraste</span>
          </div>
        </div>
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
          0%, 100% { box-shadow: 0 4px 16px rgba(16,185,129,0.3); }
          50% { box-shadow: 0 4px 28px rgba(16,185,129,0.55); }
        }
        @media (max-width: 480px) {
          .farma-search-box { padding: 1rem !important; }
        }
        .farma-account-link:hover {
          background: rgba(103,72,255,0.32);
          border-color: rgba(148,127,255,0.65);
        }
        .farma-account-link:focus-visible {
          outline: 2px solid #C4B5FD;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
