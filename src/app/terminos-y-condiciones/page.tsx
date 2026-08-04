import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Nartalis',
  description: 'Términos y condiciones de uso de Nartalis. Información sobre el servicio, limitaciones de responsabilidad y condiciones generales.',
  robots: { index: false, follow: true },
};

const S = {
  page: { maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem', width: '100%' as const },
  h1: { fontSize: '1.8rem', fontWeight: 700, marginBottom: '1.5rem', color: '#EDEDED' },
  h2: { fontSize: '1.3rem', fontWeight: 600, marginTop: '2.5rem', marginBottom: '0.75rem', color: '#EDEDED' },
  h3: { fontSize: '1.05rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.5rem', color: '#EDEDED' },
  p: { fontSize: '0.9rem', lineHeight: 1.7, color: '#A0AEC0', marginBottom: '1rem' },
  ul: { paddingLeft: '1.5rem', marginBottom: '1rem', color: '#A0AEC0', fontSize: '0.9rem', lineHeight: 1.7 },
  li: { marginBottom: '0.4rem' },
  strong: { color: '#EDEDED', fontWeight: 600 },
  hr: { border: 'none', borderTop: '1px solid #1e293b', margin: '2rem 0' },
  lastUpdate: { fontSize: '0.8rem', color: '#66748A', marginBottom: '2rem' },
};

export default function TerminosPage() {
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Términos y Condiciones</h1>
      <p style={S.lastUpdate}>Última actualización: 30 de julio de 2026</p>

      <h2 style={S.h2}>1. Aceptación de los términos</h2>
      <p style={S.p}>
        Al acceder y utilizar la plataforma <strong style={S.strong}>Nartalis</strong>{' '}
        (en adelante, &laquo;la plataforma&raquo;), aceptas los presentes Términos y
        Condiciones en su totalidad. Si no estás de acuerdo con alguno de estos términos,
        debes abstenerte de utilizar la plataforma.
      </p>

      <h2 style={S.h2}>2. Descripción del servicio</h2>
      <p style={S.p}>
        Nartalis es un buscador informativo que permite a los usuarios consultar
        información sobre medicamentos basada en los datos oficiales proporcionados por
        la Agencia Española de Medicamentos y Productos Sanitarios (AEMPS) a través de
        su portal CIMA (Centro de Información online de Medicamentos de la AEMPS).
      </p>
      <p style={S.p}>
        La plataforma ofrece:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>Búsqueda de medicamentos por nombre comercial o principio activo.</li>
        <li style={S.li}>Visualización de prospectos, fichas técnicas y datos asociados.</li>
        <li style={S.li}>Enlaces a las fuentes oficiales de la AEMPS para información detallada.</li>
      </ul>

      <h2 style={S.h2}>3. Naturaleza informativa del servicio</h2>
      <p style={S.p}>
        <strong style={S.strong}>Importante:</strong> La información proporcionada por
        Nartalis tiene carácter meramente informativo y divulgativo. En ningún caso
        sustituye el consejo, diagnóstico o tratamiento de un profesional sanitario
        cualificado.
      </p>
      <p style={S.p}>
        Los datos mostrados provienen de fuentes oficiales (AEMPS/CIMA), pero pueden
        contener errores, omisiones o no estar actualizados en tiempo real. Te
        recomendamos siempre consultar el prospecto oficial y, ante cualquier duda,
        acudir a tu médico o farmacéutico.
      </p>

      <h2 style={S.h2}>4. Uso permitido</h2>
      <p style={S.p}>
        Como usuario de Nartalis, te comprometes a:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>Utilizar la plataforma exclusivamente para fines informativos y personales.</li>
        <li style={S.li}>No realizar scraping, extracción masiva de datos o cualquier otra actividad automatizada sin autorización expresa.</li>
        <li style={S.li}>No utilizar la plataforma para fines ilegales o no autorizados.</li>
        <li style={S.li}>No interferir con el funcionamiento técnico de la plataforma.</li>
      </ul>

      <h2 style={S.h2}>5. Propiedad intelectual</h2>
      <p style={S.p}>
        Todos los derechos de propiedad intelectual sobre la plataforma Nartalis,
        incluyendo su diseño, código, logotipos y marca, pertenecen al titular del
        proyecto. Queda prohibida la reproducción, distribución o modificación no
        autorizada de cualquier elemento de la plataforma.
      </p>
      <p style={S.p}>
        Los datos de medicamentos mostrados son propiedad de la AEMPS y se utilizan
        bajo los términos de reutilización de datos del sector público.
      </p>

      <h2 style={S.h2}>6. Limitación de responsabilidad</h2>
      <p style={S.p}>
        Nartalis no será responsable por:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>Daños o perjuicios derivados del uso o la imposibilidad de uso de la plataforma.</li>
        <li style={S.li}>Decisiones tomadas basándose en la información proporcionada por la plataforma.</li>
        <li style={S.li}>Errores, omisiones o falta de actualización en los datos mostrados.</li>
        <li style={S.li}>Interrupciones del servicio por mantenimiento, problemas técnicos o causas ajenas a nuestro control.</li>
        <li style={S.li}>Contenido de sitios web externos enlazados desde la plataforma, incluido el portal CIMA de la AEMPS.</li>
      </ul>

      <h2 style={S.h2}>7. Enlaces a terceros</h2>
      <p style={S.p}>
        La plataforma contiene enlaces a sitios web de terceros, principalmente al
        portal CIMA de la AEMPS. No tenemos control sobre el contenido, políticas de
        privacidad o prácticas de estos sitios y no asumimos responsabilidad alguna
        por ellos.
      </p>

      <h2 style={S.h2}>8. Disponibilidad del servicio</h2>
      <p style={S.p}>
        Nos esforzamos por mantener la plataforma operativa 24/7, pero no garantizamos
        la disponibilidad ininterrumpida del servicio. Podemos suspender el acceso de
        forma temporal para realizar tareas de mantenimiento, actualizaciones o por
        causas técnicas.
      </p>

      <h2 style={S.h2}>9. Modificaciones de los términos</h2>
      <p style={S.p}>
        Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier
        momento. Las modificaciones entrarán en vigor desde su publicación en esta página.
        El uso continuado de la plataforma tras la publicación de cambios constituye la
        aceptación de los nuevos términos.
      </p>

      <h2 style={S.h2}>10. Legislación aplicable y jurisdicción</h2>
      <p style={S.p}>
        Estos Términos y Condiciones se rigen por la legislación española. Cualquier
        controversia que pudiera derivarse del uso de la plataforma será sometida a los
        juzgados y tribunales de la ciudad de Madrid (España).
      </p>

      <hr style={S.hr} />

      <p style={S.p}>
        Si tienes preguntas sobre estos Términos y Condiciones, puedes contactarnos en{' '}
        <strong style={S.strong}>info@nartalis.com</strong>.
      </p>
    </div>
  );
}
