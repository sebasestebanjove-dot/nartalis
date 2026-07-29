"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Maximize2, Minimize2 } from 'lucide-react';
import { chatDermo } from '../api';
import { colorVars, useViewport } from '../styles';
import type { UserType } from '../types';
import PremiumPaywall from './PremiumPaywall';

interface ChatConversationProps {
  productName?: string;
  userType: UserType;
  onActivatePremium?: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatConversation({ productName, userType, onActivatePremium }: ChatConversationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useViewport();
  const isPremium = userType === 'premium';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    if (!isPremium) {
      setStarted(true);
      return;
    }

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const productContext = productName ? `Producto consultado: ${productName}` : undefined;
      const result = await chatDermo(userMsg, productContext);
      setMessages(prev => [...prev, { role: 'assistant', content: result.content }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: err.message || 'Error al consultar la IA' }]);
    } finally {
      setLoading(false);
    }
  };

  const productContext = productName ? ` sobre ${productName}` : '';

  const chatContent = (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: colorVars.fg, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageCircle size={18} color={colorVars.premiumLight} />
          Asistente IA{productContext}
        </div>
        {isPremium && isMobile && (
          <button onClick={() => setFullscreen(!fullscreen)} style={{
            background: 'none', border: 'none', color: colorVars.fgMuted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: 13, fontFamily: 'inherit',
          }}>
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {fullscreen ? 'Minimizar' : 'Expandir'}
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{
        maxHeight: fullscreen ? 'calc(100vh - 200px)' : 300,
        overflowY: 'auto', marginBottom: '0.75rem',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            padding: '0.75rem 1rem', borderRadius: 14, fontSize: 14, lineHeight: 1.5, maxWidth: '85%',
            ...(msg.role === 'user'
              ? { background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`, color: '#fff', alignSelf: 'flex-end', borderBottomRightRadius: 4 }
              : { background: colorVars.surfaceHover, color: colorVars.fg, alignSelf: 'flex-start', borderBottomLeftRadius: 4 }),
          }}>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: 14, fontSize: 14, background: colorVars.surfaceHover, color: colorVars.fgMuted, alignSelf: 'flex-start', borderBottomLeftRadius: 4, maxWidth: '85%' }}>
            Pensando...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Pregunta sobre este producto..."
          disabled={loading}
          aria-label="Preguntar a la IA"
          style={{
            flex: 1, fontSize: 14, padding: '0.6rem 1rem', borderRadius: 12,
            border: `2px solid ${colorVars.border}`, background: colorVars.bg,
            color: colorVars.fg, outline: 'none', fontFamily: 'inherit',
            transition: 'border-color 0.15s',
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          aria-label="Enviar mensaje"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 44, height: 44, borderRadius: 12, border: 'none',
            background: loading || !input.trim() ? colorVars.surfaceHover : `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
            color: '#fff', cursor: loading ? 'wait' : 'pointer', flexShrink: 0,
            opacity: loading || !input.trim() ? 0.5 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </>
  );

  return (
    <>
      {!fullscreen && isPremium && (
        <div style={{ marginTop: '1.5rem', borderTop: `1px solid ${colorVars.border}`, paddingTop: '1.5rem' }}>
          {chatContent}
        </div>
      )}

      {fullscreen && isPremium && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: colorVars.bg,
          display: 'flex', flexDirection: 'column',
          padding: '1.25rem', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
        }}>
          {chatContent}
        </div>
      )}

      {!isPremium && (
        <div style={{ marginTop: '1.5rem', borderTop: `1px solid ${colorVars.border}`, paddingTop: '1.5rem' }}>
          {!started ? (
            <button
              onClick={() => setStarted(true)}
              aria-label="Consultar a la IA experta"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                width: '100%', padding: '0.9rem', borderRadius: 14,
                border: `2px solid ${colorVars.border}`, background: colorVars.surface,
                color: colorVars.fgMuted, fontSize: 15, fontWeight: 600,
                cursor: 'pointer', minHeight: 52, fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
            >
              <MessageCircle size={18} />
              Consultar a la IA experta
            </button>
          ) : (
            <PremiumPaywall
              userType={userType}
              onActivate={onActivatePremium}
              message="La IA experta en dermofarmacia está disponible solo para usuarios premium. Resuelve tus dudas sobre ingredientes, compatibilidad y rutinas."
            />
          )}
        </div>
      )}
    </>
  );
}
