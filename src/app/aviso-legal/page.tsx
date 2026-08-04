import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aviso Legal — Nartalis',
  description: 'Aviso legal de Nartalis. Información sobre el titular del sitio web, propiedad intelectual y condiciones de uso.',
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

export default function AvisoLegalPage() {
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Aviso Legal</h1>
      <p style={S.lastUpdate}>Última actualización: 30 de julio de 2026</p>

      <h2 style={S.h2}>1. Identificación del titular</h2>
      <p style={S.p}>
        En cumplimiento de lo dispuesto en el artículo 10 de la Ley 34/2002, de 11 de
        julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico
        (LSSI-CE), se informa de que el sitio web{' '}
        <strong style={S.strong}>nartalis.com</strong> (en adelante, &laquo;el sitio
        web&raquo;) es titularidad de:
      </p>
      <ul style={S.ul}>
        <li style={S.li}><strong style={S.strong}>Denominación comercial:</strong> Nartalis</li>
        <li style={S.li}><strong style={S.strong}>Correo electrónico de contacto:</strong> info@nartalis.com</li>
      </ul>
      <p style={S.p}>
        El presente Aviso Legal regula el acceso y uso del sitio web que Nartalis pone
        a disposición de los usuarios.
      </p>

      <h2 style={S.h2}>2. Objeto</h2>
      <p style={S.p}>
        El sitio web <strong style={S.strong}>nartalis.com</strong> tiene como objeto
        principal ofrecer un servicio de búsqueda y consulta de información sobre
        medicamentos, basado en datos oficiales proporcionados por la Agencia Española
        de Medicamentos y Productos Sanitarios (AEMPS) a través de su portal CIMA.
      </p>

      <h2 style={S.h2}>3. Condiciones de acceso y uso</h2>
      <p style={S.p}>
        El acceso al sitio web es gratuito y no requiere registro previo. El usuario
        se compromete a hacer un uso adecuado y lícito del sitio web, de acuerdo con
        la legislación aplicable y el presente Aviso Legal.
      </p>
      <p style={S.p}>
        Queda prohibido:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>Realizar actividades que puedan dañar, inutilizar o sobrecargar el sitio web.</li>
        <li style={S.li}>Introducir o difundir virus informáticos o cualquier otro sistema que pueda causar daños.</li>
        <li style={S.li}>Intentar acceder a áreas restringidas del sitio web sin autorización.</li>
        <li style={S.li}>Utilizar el contenido del sitio web para fines comerciales no autorizados.</li>
      </ul>

      <h2 style={S.h2}>4. Propiedad intelectual e industrial</h2>
      <p style={S.p}>
        Todos los contenidos del sitio web, incluyendo textos, imágenes, logotipos,
        iconos, diseño gráfico, código fuente y cualquier otro elemento, son propiedad
        de Nartalis o de sus legítimos titulares, y están protegidos por las leyes de
        propiedad intelectual e industrial.
      </p>
      <p style={S.p}>
        Queda expresamente prohibida la reproducción, distribución, comunicación
        pública, transformación o cualquier otra forma de explotación de los contenidos
        sin la autorización previa y por escrito del titular.
      </p>
      <p style={S.p}>
        Los datos sobre medicamentos procedentes de la AEMPS se utilizan de acuerdo con
        la normativa de reutilización de la información del sector público.
      </p>

      <h2 style={S.h2}>5. Exclusión de responsabilidad</h2>
      <p style={S.p}>
        Nartalis no se hace responsable de:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>La exactitud, integridad o actualidad de la información mostrada, la cual tiene carácter informativo.</li>
        <li style={S.li}>Los daños o perjuicios derivados del acceso o uso del sitio web.</li>
        <li style={S.li}>El contenido de los sitios web de terceros a los que se pueda acceder a través de enlaces.</li>
        <li style={S.li}>La disponibilidad técnica del sitio web o la interrupción del servicio por causas ajenas.</li>
      </ul>

      <h2 style={S.h2}>6. Enlaces (links)</h2>
      <p style={S.p}>
        El sitio web puede contener enlaces a otros sitios web de terceros, como el
        portal CIMA de la AEMPS. Nartalis no tiene control sobre el contenido de dichos
        sitios y no asume responsabilidad alguna por su contenido o funcionamiento.
      </p>
      <p style={S.p}>
        Cualquier persona que desee establecer un enlace desde su sitio web a
        nartalis.com deberá solicitar autorización previa. El establecimiento del
        enlace no implica la existencia de relación alguna entre Nartalis y el titular
        del sitio enlazante.
      </p>

      <h2 style={S.h2}>7. Legislación aplicable y jurisdicción</h2>
      <p style={S.p}>
        El presente Aviso Legal se rige por la legislación española. Para cualquier
        controversia que pudiera derivarse del acceso o uso del sitio web, las partes
        se someten a los juzgados y tribunales de Madrid (España), renunciando
        expresamente a cualquier otro fuero que pudiera corresponderles.
      </p>

      <hr style={S.hr} />

      <p style={S.p}>
        Si tienes cualquier duda sobre este Aviso Legal, puedes contactarnos en{' '}
        <strong style={S.strong}>info@nartalis.com</strong>.
      </p>
    </div>
  );
}
