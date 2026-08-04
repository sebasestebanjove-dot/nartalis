import type { Metadata } from 'next';
import { catalogMetadata } from '@/lib/medicamentos';

export const metadata: Metadata = catalogMetadata(
  'Metodología — Cómo obtenemos los datos de medicamentos | Nartalis',
  'Conoce cómo Nartalis obtiene, estructura y actualiza la información de medicamentos desde CIMA, la base de datos oficial de la AEMPS.',
  'https://nartalis.com/metodologia',
);

const S = {
  page: { maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem', width: '100%' as const },
  h1: { fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: '#EDEDED' },
  h2: { fontSize: '1.3rem', fontWeight: 600, marginTop: '2.5rem', marginBottom: '0.75rem', color: '#EDEDED' },
  p: { fontSize: '0.9rem', color: '#A0AEC0', lineHeight: 1.7, marginBottom: '1rem' },
};

export default function MetodologiaPage() {
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Metodología</h1>

      <h2 style={S.h2}>Fuente de los datos</h2>
      <p style={S.p}>
        Toda la información sobre medicamentos disponible en Nartalis procede de{' '}
        <strong style={{ color: '#D1D5DB' }}>CIMA</strong>, el Centro de Información de Medicamentos
        de la <strong style={{ color: '#D1D5DB' }}>Agencia Española de Medicamentos y Productos Sanitarios (AEMPS)</strong>.
        CIMA es la base de datos oficial de medicamentos autorizados en España, de acceso público a través de
        su API REST.
      </p>

      <h2 style={S.h2}>Cómo obtenemos los datos</h2>
      <p style={S.p}>
        Cuando un usuario visita la ficha de un medicamento en Nartalis, nuestro servidor consulta
        la API pública de CIMA en tiempo real para obtener los datos más recientes disponibles sobre
        ese medicamento. La consulta se realiza mediante el número de registro oficial (nregistro),
        que es el identificador único asignado por la AEMPS a cada medicamento.
      </p>
      <p style={S.p}>
        Los datos que mostramos incluyen: nombre del medicamento, principio activo, laboratorio,
        dosis, forma farmacéutica, vía de administración, clasificación ATC, condición de receta,
        presentaciones disponibles (con su código nacional CN), excipientes y fechas de autorización
        o revisión.
      </p>

      <h2 style={S.h2}>Actualización de la información</h2>
      <p style={S.p}>
        Para garantizar un rendimiento óptimo y evitar consultas repetitivas a la AEMPS, Nartalis
        conserva en caché los datos obtenidos de CIMA durante un máximo de 24 horas. Otras páginas
        de catálogo pueden regenerarse periódicamente.
      </p>
      <p style={S.p}>
        En concreto: los datos de cada medicamento se consultan a CIMA y se conservan en caché
        durante un máximo de 24 horas. Por tanto, si un medicamento es actualizado en CIMA, la
        nueva información podrá reflejarse en Nartalis cuando caduque ese período de caché.
      </p>

      <h2 style={S.h2}>Qué es el nregistro</h2>
      <p style={S.p}>
        El <strong style={{ color: '#D1D5DB' }}>nregistro</strong> es el número de registro oficial
        asignado por la AEMPS a cada presentación de medicamento autorizada en España. Es un
        identificador único que permite localizar de forma inequívoca la información oficial de
        cada medicamento en CIMA. Puedes encontrar el nregistro en la URL de cada ficha de Nartalis
        (tras los dos guiones).
      </p>

      <h2 style={S.h2}>Limitaciones</h2>
      <p style={S.p}>
        Nartalis muestra exclusivamente la información disponible en CIMA. Si CIMA no proporciona
        un determinado dato (por ejemplo, indicaciones terapéuticas o efectos secundarios), ese dato
        no aparecerá en Nartalis. No interpretamos ni complementamos la información oficial.
      </p>
      <p style={S.p}>
        La información mostrada en Nartalis tiene carácter informativo y en ningún caso sustituye
        al prospecto oficial del medicamento, a la consulta con un profesional sanitario o a la
        ficha técnica autorizada por la AEMPS.
      </p>
    </div>
  );
}
