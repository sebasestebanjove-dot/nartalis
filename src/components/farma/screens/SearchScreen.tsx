'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Mic, MicOff, Loader2, AlertTriangle, ShieldCheck, Volume2, ScanText } from 'lucide-react';
import { styles } from './styles';
import PersonalSpaceCard from '../PersonalSpaceCard';
import { track } from '@/lib/analytics';

interface Props {
  onSearch: (q: string, type?: 'text' | 'voice') => void;
  initialQuery?: string;
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

export default function SearchScreen({ onSearch, initialQuery = '' }: Props) {
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
  onSearchRef.current = onSearch;

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
          if (text) { setQuery(text); if (text.length >= 2) onSearchRef.current(text, 'voice'); }
        } catch (err) { console.error('Transcripción falló:', err); }
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

  /* ── handleVoiceClick (SÍNCRONO — user activation preserved) ──

       Lazy init: la instancia SpeechRecognition se crea UNA SOLA VEZ.
       Handler refresh: los eventos se re‑bindan cada vez antes de start()
       para evitar stale closures y pérdida de contexto del evento.
  */

  const handleVoiceClick = () => {
    /* Guard: sin soporte → blocked silencioso */
    if (!hasVoiceSupport) {
      setMicStatus('blocked');
      return;
    }

    /* Toggle-off si está escuchando */
    if (micStatus === 'listening' && recognitionRef.current) {
      recognitionRef.current.stop();
      resetToIdle();
      return;
    }

    /* Toggle-off si está grabando con fallback */
    if (micStatus === 'recording' && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      resetToIdle();
      return;
    }

    /* Ignorar si está en transición */
    if (micStatus === 'connecting') return;

    /* ── Phase 1: SpeechRecognition (lazy init + handler refresh) ── */
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      /* Lazy init: instancia UNA SOLA VEZ (persistente entre clicks) */
      if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognitionAPI();
      }

      const recognition = recognitionRef.current;

      /* Propiedades estáticas (idempotente) */
      const stringsIdioma = [navigator.language, 'es-ES', 'es'];
      recognition.lang = stringsIdioma.find(lang => lang && lang.startsWith('es')) || 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = false;
      if ('processLocally' in recognition) {
        (recognition as any).processLocally = true;
      }

      /* Re‑bindear handlers CADA VEZ antes de start() — evita stale closures */
      recognition.onstart = () => {
        startedRef.current = true;
        clearSafetyTimeout();
        setMicStatus('listening');
      };

      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setQuery(transcript);
        if (transcript.trim().length >= 2) {
          onSearchRef.current(transcript.trim(), 'voice');
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
      };

      recognition.onend = () => {
        clearSafetyTimeout();
        if (didErrorRef.current) {
          resetRefs();
          return;
        }
        resetToIdle();
      };

      /* Timeout de seguridad: 4s — aborta si onstart no dispara */
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

      /* START síncrono — dentro del user gesture */
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

    /* ── Phase 2 (fallback): no hay SR o start() lanzó excepción ── */
    setMicStatus('connecting');
    startRecordingFallback();
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
      case 'recording': return { borderColor: '#F59E0B', background: 'rgba(245,158,11,0.1)' };
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
      case 'recording': return <Loader2 size={28} className="farma-spin" color="#F59E0B" />;
      case 'blocked': return <AlertTriangle size={28} color="#F97316" />;
      case 'error': return <MicOff size={28} color="#A1A1AA" />;
      default: return <Mic size={28} />;
    }
  };

  const getMicLabel = () => {
    switch (micStatus) {
      case 'connecting': return 'Conectando...';
      case 'listening': return 'Escuchando...';
      case 'recording': return 'Grabando...';
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
      case 'blocked': return 'Haz clic en el candado 🔒 de la URL, permite el micrófono y recarga la página.';
      case 'error': return voiceError ? `Error detectado: ${voiceError}` : 'Búsqueda por voz no disponible temporalmente.';
      default: return 'Prospectos oficiales de la AEMPS. Consulta la información de tus medicamentos de forma sencilla.';
    }
  };

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
          onClick={handleVoiceClick}
          disabled={micStatus === 'connecting'}
          aria-label={micStatus === 'listening' ? 'Detener grabación' : 'Buscar por voz'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
            width: '100%', minHeight: 56,
            padding: '0.85rem', borderRadius: 14,
            background: micStatus === 'idle' ? 'linear-gradient(135deg, #059669, #10B981)' : '#1C1C1E',
            border: micStatus === 'idle' ? 'none' : '2px solid #3A3A3C',
            color: micStatus === 'idle' ? '#fff' : '#34D399',
            fontSize: 20, fontWeight: 700, cursor: micStatus === 'connecting' ? 'default' : 'pointer',
            fontFamily: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s',
            boxShadow: micStatus === 'idle' ? '0 4px 16px rgba(16,185,129,0.3)' : 'none',
            animation: micStatus === 'idle' ? 'farmaMicPulse 2.5s ease-in-out infinite' : 'none',
          }}
          onMouseEnter={e => { if (micStatus === 'idle') { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(16,185,129,0.45)'; } }}
          onMouseLeave={e => { if (micStatus === 'idle') { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(16,185,129,0.3)'; } }}
        >
          {getMicIcon()}
          <span>{getMicLabel()}</span>
        </button>

        <p style={styles.hint}>{getMicHint()}</p>
      </div>

      <div style={styles.infoCards}>
        <PersonalSpaceCard />
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
      `}</style>
    </div>
  );
}
