"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Sun, Moon } from 'lucide-react';
import { chatDermo } from '../api';
import type { DermoUserRoutine, UserType } from '../types';
import { colorVars } from '../styles';

interface RoutineChatProps {
  routine: DermoUserRoutine;
  userType: UserType;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function RoutineChat({ routine, userType }: RoutineChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isPremium = userType === 'premium';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const context = `Tengo esta rutina de dermofarmacia:\nAM: ${routine.am_routine?.map(s => s.productName).join(', ') || 'ninguno'}\nPM: ${routine.pm_routine?.map(s => s.productName).join(', ') || 'ninguno'}`;
      const result = await chatDermo(`${context}\n\nPregunta: ${userMsg}`);
      setMessages(prev => [...prev, { role: 'assistant', content: result.content }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: err.message || 'Error al consultar' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '1.5rem', borderTop: `1px solid ${colorVars.border}`, paddingTop: '1.5rem' }}>
      {/* Collapsible routine summary */}
      <details style={{ marginBottom: '1rem' }}>
        <summary style={{
          fontSize: 15, fontWeight: 700, color: colorVars.premiumLight,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <Sparkles size={16} />
          Ver mi rutina personalizada
        </summary>
        <div style={{ marginTop: '0.75rem' }}>
          {routine.am_routine && routine.am_routine.length > 0 && (
            <div style={{ background: colorVars.surface, borderRadius: 12, padding: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: colorVars.premiumLight, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sun size={13} /> Rutina AM
              </div>
              {routine.am_routine.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', borderBottom: i < routine.am_routine!.length - 1 ? `1px solid ${colorVars.border}` : 'none' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(167,139,250,0.2)', color: colorVars.premiumLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{s.order}</div>
                  <div style={{ flex: 1, fontSize: 13, color: colorVars.fg }}>{s.productName}</div>
                  <div style={{ fontSize: 11, color: colorVars.fgMuted }}>{s.step}</div>
                </div>
              ))}
            </div>
          )}
          {routine.pm_routine && routine.pm_routine.length > 0 && (
            <div style={{ background: colorVars.surface, borderRadius: 12, padding: '1rem' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#60A5FA', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Moon size={13} /> Rutina PM
              </div>
              {routine.pm_routine.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', borderBottom: i < routine.pm_routine!.length - 1 ? `1px solid ${colorVars.border}` : 'none' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(96,165,250,0.2)', color: '#60A5FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{s.order}</div>
                  <div style={{ flex: 1, fontSize: 13, color: colorVars.fg }}>{s.productName}</div>
                  <div style={{ fontSize: 11, color: colorVars.fgMuted }}>{s.step}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>

      {/* Chat */}
      <div style={{
        maxHeight: 260, overflowY: 'auto', marginBottom: '0.75rem',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
      }}>
        {messages.length === 0 && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: 14, background: colorVars.surfaceHover, color: colorVars.fgMuted, fontSize: 14, alignSelf: 'flex-start', maxWidth: '85%' }}>
            Pregúntame sobre tu rutina: ingredientes, alternativas, cómo combinar productos...
          </div>
        )}
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

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Pregunta sobre tu rutina..."
          disabled={loading}
          aria-label="Preguntar sobre la rutina"
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
          aria-label="Enviar"
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
    </div>
  );
}
