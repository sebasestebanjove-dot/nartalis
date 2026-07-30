import { Info } from 'lucide-react';

const linkStyle: React.CSSProperties = {
  color: '#A1A1AA', textDecoration: 'none', fontSize: 13, fontWeight: 500,
  padding: '0.75rem 0', display: 'inline-block', minHeight: 44,
  lineHeight: '44px',
};

export default function FarmaFooter() {
  return (
    <footer style={{
      background: '#18181B', borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '1.5rem 1rem',
    }}>
      <div style={{
        maxWidth: 1024, margin: '0 auto', width: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center',
      }}>
        {/* Disclaimer integrado */}
        <div style={{
          width: '100%', display: 'flex', alignItems: 'flex-start',
          justifyContent: 'center', gap: '0.4rem',
          padding: '0.6rem 0.75rem', borderRadius: 10,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.05)',
          marginBottom: '1.25rem',
        }}>
          <Info size={14} style={{ flexShrink: 0, marginTop: 2, color: '#71717A' }} />
          <p style={{
            margin: 0, fontSize: 12, color: '#71717A', lineHeight: 1.5,
          }}>
            Esta plataforma es un buscador informativo basado en datos oficiales de la{' '}
            <strong style={{ color: '#A1A1AA', fontWeight: 600 }}>AEMPS</strong> (CIMA)
            y <strong style={{ color: '#A1A1AA', fontWeight: 600 }}>no sustituye</strong> el
            consejo, diagnóstico o tratamiento médico profesional.
          </p>
        </div>

        {/* Nav links */}
        <nav style={{
          display: 'flex', flexWrap: 'wrap', gap: '1.5rem',
          justifyContent: 'center', marginBottom: '1rem',
        }}>
          <a href="/politica-de-privacidad" style={linkStyle}>Política de Privacidad</a>
          <a href="/terminos-y-condiciones" style={linkStyle}>Términos y Condiciones</a>
          <a href="/aviso-legal" style={linkStyle}>Aviso Legal</a>
          <a href="/medicamentos" style={linkStyle}>Medicamentos</a>
          <a href="/preguntas-frecuentes" style={linkStyle}>Preguntas Frecuentes</a>
        </nav>

        {/* Copyright */}
        <p style={{
          margin: 0, textAlign: 'center', fontSize: 11, color: '#52525B',
        }}>
&copy; 2026 Nartalis. Datos procedentes de la{' '}
           <a href="https://cima.aemps.es" target="_blank" rel="noopener noreferrer"
              style={{ color: '#71717A', textDecoration: 'underline' }}>
             AEMPS
           </a>.
        </p>
      </div>
    </footer>
  );
}
