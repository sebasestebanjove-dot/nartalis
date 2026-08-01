import type { Metadata } from 'next';
import { catalogMetadata } from '@/lib/medicamentos';

export const metadata: Metadata = catalogMetadata(
  'Sobre Nartalis — Fuentes, metodología y transparencia | Nartalis',
  'Nartalis es un portal de consulta de medicamentos basado en datos oficiales de la AEMPS (CIMA). Conoce nuestras fuentes, metodología y compromiso con la transparencia.',
  'https://nartalis.com/acerca-de',
);

const S = {
  page: { maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem', width: '100%' as const },
  h1: { fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: '#EDEDED' },
  h2: { fontSize: '1.3rem', fontWeight: 600, marginTop: '2.5rem', marginBottom: '0.75rem', color: '#EDEDED' },
  p: { fontSize: '0.9rem', color: '#A0AEC0', lineHeight: 1.7, marginBottom: '1rem' },
  strong: { color: '#D1D5DB', fontWeight: 600 },
};

export default function AcercaDePage() {
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Sobre Nartalis</h1>

      <h2 style={S.h2}>Qué es Nartalis</h2>
      <p style={S.p}>
        Nartalis es un portal de consulta de información sobre medicamentos disponible
        en España. Nuestro objetivo es facilitar el acceso a datos oficiales sobre
        medicamentos: prospectos, principios activos, dosis, forma farmacéutica,
        clasificación ATC, laboratorios y más.
      </p>
      <p style={S.p}>
        Organizamos y estructuramos esta información para que cualquier persona pueda
        consultar de forma rápida y clara los datos oficiales de cada medicamento
        autorizado en España.
      </p>

      <h2 style={S.h2}>Fuentes de información</h2>
      <p style={S.p}>
        Toda la información sobre medicamentos que aparece en Nartalis procede de{' '}
        <strong style={S.strong}>CIMA</strong>, el Centro de Información de Medicamentos
        de la{' '}
        <strong style={S.strong}>Agencia Española de Medicamentos y Productos Sanitarios (AEMPS)</strong>.
      </p>
      <p style={S.p}>
        La AEMPS es el organismo público responsable de garantizar la calidad, seguridad,
        eficacia y correcta información de los medicamentos en España. CIMA es su base
        de datos oficial de acceso público.
      </p>

      <h2 style={S.h2}>Cómo obtenemos y estructuramos los datos</h2>
      <p style={S.p}>
        Nartalis consulta la API pública de CIMA en tiempo real cuando un usuario visita
        la ficha de un medicamento. Los datos se obtienen directamente de la fuente oficial
        y se presentan de forma estructurada para facilitar su consulta.
      </p>
      <p style={S.p}>
        No alteramos, interpretamos ni añadimos información que no esté presente en los
        datos oficiales. Cada ficha muestra exclusivamente los datos disponibles en CIMA
        para ese medicamento en el momento de la consulta.
      </p>

      <h2 style={S.h2}>Actualización de la información</h2>
      <p style={S.p}>
        Los datos de cada medicamento se obtienen de CIMA en el momento en que se consulta
        la ficha. Para optimizar el rendimiento, las respuestas se almacenan en caché
        durante un máximo de 24 horas. Si un medicamento ha sido actualizado recientemente
        en CIMA, la información se reflejará en Nartalis en la siguiente consulta.
      </p>

      <h2 style={S.h2}>Transparencia y limitaciones</h2>
      <p style={S.p}>
        Nartalis es un <strong style={S.strong}>portal informativo</strong>. No es un
        servicio médico ni farmacéutico. La información mostrada no sustituye:
      </p>
      <ul style={{ color: '#A0AEC0', fontSize: '0.9rem', lineHeight: 1.7 }}>
        <li>el prospecto oficial del medicamento;</li>
        <li>la consulta con un médico o profesional sanitario;</li>
        <li>el consejo de un farmacéutico;</li>
        <li>la ficha técnica autorizada por la AEMPS.</li>
      </ul>
      <p style={S.p}>
        Si necesitas información médica, consulta siempre con un profesional sanitario.
        Ante cualquier duda sobre un medicamento, consulta el prospecto oficial o la
        ficha técnica disponible en la web de la AEMPS.
      </p>

      <h2 style={S.h2}>Para profesionales sanitarios</h2>
      <p style={S.p}>
        Nartalis puede ser utilizado como herramienta de consulta rápida, pero no
        sustituye las fuentes oficiales. Los profesionales sanitarios deben verificar
        siempre la información en los documentos oficiales de la AEMPS.
      </p>
    </div>
  );
}
