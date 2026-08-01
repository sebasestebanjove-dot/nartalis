import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Preguntas Frecuentes — Nartalis',
  description: 'Respuestas a las preguntas más frecuentes sobre Nartalis: cómo funciona el buscador, qué datos mostramos, cómo se actualiza la información y más.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://nartalis.com/preguntas-frecuentes' },
  openGraph: {
    title: 'Preguntas Frecuentes — Nartalis',
    description: 'Respuestas a las preguntas más frecuentes sobre Nartalis: cómo funciona el buscador, qué datos mostramos, cómo se actualiza la información y más.',
    url: 'https://nartalis.com/preguntas-frecuentes',
    siteName: 'Nartalis',
    locale: 'es_ES',
  },
  twitter: { card: 'summary_large_image' },
};

const S = {
  page: { maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem', width: '100%' as const },
  h1: { fontSize: '1.8rem', fontWeight: 700, marginBottom: '1.5rem', color: '#EDEDED' },
  p: { fontSize: '0.9rem', lineHeight: 1.7, color: '#A0AEC0', marginBottom: '2rem' },
  faqItem: { borderBottom: '1px solid #1e293b', padding: '0' as const },
  question: {
    width: '100%' as const, background: 'none', border: 'none', padding: '1rem 0',
    fontSize: '0.95rem', fontWeight: 600, color: '#EDEDED', cursor: 'pointer',
    fontFamily: 'inherit', textAlign: 'left' as const, display: 'flex',
    justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
  },
  answer: {
    padding: '0 0 1.25rem 0', fontSize: '0.88rem', lineHeight: 1.7, color: '#A0AEC0',
  },
  strong: { color: '#EDEDED', fontWeight: 600 },
  link: { color: '#6748FD', textDecoration: 'underline', cursor: 'pointer' },
};

const faqs = [
  {
    q: '¿Qué es Nartalis?',
    a: 'Nartalis es un buscador informativo de medicamentos que te permite consultar prospectos, fichas técnicas y datos actualizados de miles de medicamentos autorizados en España. Toda la información procede de la Agencia Española de Medicamentos y Productos Sanitarios (AEMPS) a través de su portal CIMA.',
  },
  {
    q: '¿Los datos que mostráis son oficiales?',
    a: 'Sí. Todos los datos que mostramos provienen directamente de la AEMPS (CIMA), que es la fuente oficial de información sobre medicamentos en España. No modificamos ni alteramos la información. No obstante, te recomendamos consultar siempre el prospecto oficial en la web de la AEMPS para obtener la información más actualizada.',
  },
  {
    q: '¿Sustituye Nartalis a un médico o farmacéutico?',
    a: 'No. Nartalis es una herramienta informativa y divulgativa. En ningún caso sustituye el consejo, diagnóstico o tratamiento de un profesional sanitario. Si tienes dudas sobre tu medicación, consulta siempre con tu médico o farmacéutico.',
  },
  {
    q: '¿Guardáis mis búsquedas?',
    a: 'Las búsquedas que realizas no se asocian a tu identidad. Podemos almacenar datos anonimizados con fines estadísticos (términos de búsqueda agregados, frecuencia de consultas) para mejorar el servicio. Consulta nuestra Política de Privacidad para más detalle.',
  },
  {
    q: '¿Se actualiza la información automáticamente?',
    a: 'Sí. Cada vez que consultas un medicamento, Nartalis obtiene los datos más recientes desde la AEMPS en tiempo real. Además, mantenemos una caché para acelerar las búsquedas, que se actualiza periódicamente.',
  },
  {
    q: '¿Qué medicamentos puedo buscar?',
    a: 'Puedes buscar cualquier medicamento autorizado en España que esté registrado en la base de datos de la AEMPS. Esto incluye medicamentos con receta, sin receta, genéricos y de diagnóstico hospitalario. La búsqueda funciona tanto por nombre comercial como por principio activo.',
  },
  {
    q: '¿Nartalis tiene aplicación móvil?',
    a: 'Actualmente Nartalis es una aplicación web responsive que funciona en cualquier navegador moderno, tanto en ordenador como en móvil y tablet. No disponemos de aplicación nativa, pero la versión web está optimizada para todo tipo de dispositivos.',
  },
  {
    q: '¿Es necesario registrarse para usar Nartalis?',
    a: 'No. El buscador es completamente gratuito y no requiere registro ni inicio de sesión. Puedes consultar cualquier medicamento de forma anónima.',
  },
  {
    q: '¿Qué navegadores y dispositivos son compatibles?',
    a: 'Nartalis funciona en las versiones actuales de Chrome, Firefox, Safari y Edge, tanto en ordenadores como en dispositivos móviles y tablets. Es necesario tener JavaScript activado.',
  },
  {
    q: '¿Cómo puedo contactar con vosotros?',
    a: 'Puedes escribirnos a <strong style={S.strong}>info@contrial.app</strong>. Estaremos encantados de resolver cualquier duda, sugerencia o incidencia que tengas.',
  },
];

function FaqItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const id = `faq-${index}`;
  return (
    <div style={S.faqItem}>
      <details id={id}>
        <summary style={S.question}>
          <span>{question}</span>
          <span style={{ fontSize: '0.8rem', color: '#66748A', flexShrink: 0 }}>▼</span>
        </summary>
        <div style={S.answer} dangerouslySetInnerHTML={{ __html: answer }} />
      </details>
    </div>
  );
}

export default function FAQPage() {
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Preguntas Frecuentes</h1>
      <p style={S.p}>
        Respuestas a las dudas más comunes sobre Nartalis. Si no encuentras lo que buscas,
        escríbenos a <strong style={S.strong}>info@contrial.app</strong>.
      </p>

      <div>
        {faqs.map((faq, i) => (
          <FaqItem key={i} question={faq.q} answer={faq.a} index={i} />
        ))}
      </div>
    </div>
  );
}
