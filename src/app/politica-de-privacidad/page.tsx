import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad — Nartalis',
  description: 'Política de privacidad de Nartalis. Conoce cómo tratamos tus datos personales, qué información recopilamos y cuáles son tus derechos conforme al RGPD.',
  robots: { index: true, follow: true },
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

export default function PoliticaDePrivacidadPage() {
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Política de Privacidad</h1>
      <p style={S.lastUpdate}>Última actualización: 30 de julio de 2026</p>

      <h2 style={S.h2}>1. Responsable del tratamiento</h2>
      <p style={S.p}>
        El responsable del tratamiento de los datos personales recogidos a través de{' '}
        <strong style={S.strong}>Nartalis</strong> (en adelante, &laquo;la plataforma&raquo;)
        es el titular del sitio web <strong style={S.strong}>nartalis.com</strong>.
        Puedes contactarnos en:{' '}
        <strong style={S.strong}>info@contrial.app</strong>.
      </p>
      <p style={S.p}>
        Nartalis es un proyecto independiente que ofrece un buscador informativo de
        medicamentos basado en datos oficiales de la Agencia Española de Medicamentos y
        Productos Sanitarios (AEMPS) a través de su portal CIMA.
      </p>

      <h2 style={S.h2}>2. Datos que recopilamos</h2>
      <p style={S.p}>
        En Nartalis nos tomamos tu privacidad en serio. Recopilamos exclusivamente los
        datos necesarios para ofrecer y mejorar nuestro servicio:
      </p>
      <h3 style={S.h3}>2.1. Datos de navegación anónimos</h3>
      <ul style={S.ul}>
        <li style={S.li}>Dirección IP (almacenada de forma anonimizada y truncada).</li>
        <li style={S.li}>Tipo de navegador, sistema operativo y dispositivo.</li>
        <li style={S.li}>Páginas visitadas dentro de la plataforma y tiempo de navegación.</li>
        <li style={S.li}>Términos de búsqueda introducidos (sin asociación a un usuario concreto).</li>
      </ul>
      <h3 style={S.h3}>2.2. Cookies y tecnologías similares</h3>
      <p style={S.p}>
        Utilizamos cookies analíticas de terceros para entender cómo se utiliza la
        plataforma y mejorar su funcionamiento. Puedes consultar la tabla de cookies
        en el apartado 7 de esta política.
      </p>
      <h3 style={S.h3}>2.3. Datos de contacto</h3>
      <p style={S.p}>
        Si decides contactarnos a través de{' '}
        <strong style={S.strong}>info@contrial.app</strong>, recopilaremos tu
        dirección de correo electrónico y cualquier información adicional que nos
        proporciones voluntariamente. Estos datos se conservarán únicamente para
        atender tu consulta y no se utilizarán para ningún otro fin.
      </p>

      <h2 style={S.h2}>3. Finalidad del tratamiento y base legal</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '0.85rem', color: '#A0AEC0' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1e293b' }}>
            <th style={{ textAlign: 'left', padding: '0.5rem', color: '#EDEDED', fontWeight: 600 }}>Finalidad</th>
            <th style={{ textAlign: 'left', padding: '0.5rem', color: '#EDEDED', fontWeight: 600 }}>Base legal</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #1e293b' }}>
            <td style={{ padding: '0.5rem' }}>Prestación del servicio de búsqueda de medicamentos</td>
            <td style={{ padding: '0.5rem' }}>Interés legítimo (art. 6.1.f RGPD)</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #1e293b' }}>
            <td style={{ padding: '0.5rem' }}>Análisis estadístico y mejora de la plataforma</td>
            <td style={{ padding: '0.5rem' }}>Consentimiento (art. 6.1.a RGPD) vía cookies</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #1e293b' }}>
            <td style={{ padding: '0.5rem' }}>Atención de consultas y comunicación con el usuario</td>
            <td style={{ padding: '0.5rem' }}>Interés legítimo (art. 6.1.f RGPD)</td>
          </tr>
        </tbody>
      </table>

      <h2 style={S.h2}>4. Destinatarios de los datos</h2>
      <p style={S.p}>
        No cedemos datos personales a terceros, salvo a los siguientes proveedores
        de servicios necesarios para el funcionamiento de la plataforma:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong style={S.strong}>Google LLC</strong> (GA4) &mdash; análisis de
          audiencia y comportamiento. Datos transferidos a Estados Unidos bajo el
          Marco de Privacidad de Datos UE-EE.UU.
        </li>
        <li style={S.li}>
          <strong style={S.strong}>Microsoft Corporation</strong> (Clarity) &mdash;
          mapas de calor y grabaciones de sesiones anonimizadas. Datos transferidos a
          Estados Unidos.
        </li>
        <li style={S.li}>
          <strong style={S.strong}>Vercel Inc.</strong> &mdash; alojamiento y
          distribución de la plataforma. Datos transferidos a Estados Unidos.
        </li>
      </ul>

      <h2 style={S.h2}>5. Plazo de conservación</h2>
      <p style={S.p}>
        Los datos analíticos se conservan durante un período máximo de 12 meses. Los
        datos de contacto asociados a consultas se conservan durante el tiempo necesario
        para atender la solicitud y, en todo caso, no más de 6 meses tras la finalización
        de la comunicación.
      </p>

      <h2 style={S.h2}>6. Derechos del usuario (ARSOLIP)</h2>
      <p style={S.p}>
        Puedes ejercer en cualquier momento tus derechos de:
      </p>
      <ul style={S.ul}>
        <li style={S.li}><strong style={S.strong}>Acceso</strong>: saber qué datos tuyos tratamos.</li>
        <li style={S.li}><strong style={S.strong}>Rectificación</strong>: corregir datos inexactos.</li>
        <li style={S.li}><strong style={S.strong}>Supresión</strong>: solicitar que eliminemos tus datos.</li>
        <li style={S.li}><strong style={S.strong}>Oposición</strong>: oponerte al tratamiento para fines de marketing o interés legítimo.</li>
        <li style={S.li}><strong style={S.strong}>Limitación</strong>: restringir el tratamiento en determinados supuestos.</li>
        <li style={S.li}><strong style={S.strong}>Portabilidad</strong>: recibir tus datos en un formato estructurado.</li>
      </ul>
      <p style={S.p}>
        Para ejercer cualquiera de estos derechos, escríbenos a{' '}
        <strong style={S.strong}>info@contrial.app</strong> indicando el derecho que
        deseas ejercer y tu nombre. Te responderemos en un plazo máximo de 30 días.
      </p>
      <p style={S.p}>
        Si no estás satisfecho con nuestra respuesta, tienes derecho a presentar una
        reclamación ante la{' '}
        <strong style={S.strong}>Agencia Española de Protección de Datos (AEPD)</strong>.
      </p>

      <h2 style={S.h2}>7. Cookies</h2>
      <p style={S.p}>
        Utilizamos las siguientes cookies en la plataforma:
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '0.85rem', color: '#A0AEC0' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1e293b' }}>
            <th style={{ textAlign: 'left', padding: '0.5rem', color: '#EDEDED', fontWeight: 600 }}>Cookie</th>
            <th style={{ textAlign: 'left', padding: '0.5rem', color: '#EDEDED', fontWeight: 600 }}>Proveedor</th>
            <th style={{ textAlign: 'left', padding: '0.5rem', color: '#EDEDED', fontWeight: 600 }}>Finalidad</th>
            <th style={{ textAlign: 'left', padding: '0.5rem', color: '#EDEDED', fontWeight: 600 }}>Duración</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #1e293b' }}>
            <td style={{ padding: '0.5rem' }}>_ga / _ga_&lt;ID&gt;</td>
            <td style={{ padding: '0.5rem' }}>Google Analytics</td>
            <td style={{ padding: '0.5rem' }}>Distinguir usuarios y sesiones</td>
            <td style={{ padding: '0.5rem' }}>2 años</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #1e293b' }}>
            <td style={{ padding: '0.5rem' }}>_gid</td>
            <td style={{ padding: '0.5rem' }}>Google Analytics</td>
            <td style={{ padding: '0.5rem' }}>Identificar sesiones</td>
            <td style={{ padding: '0.5rem' }}>24 horas</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #1e293b' }}>
            <td style={{ padding: '0.5rem' }}>_clck / _clsk</td>
            <td style={{ padding: '0.5rem' }}>Microsoft Clarity</td>
            <td style={{ padding: '0.5rem' }}>Grabación de sesiones y mapas de calor</td>
            <td style={{ padding: '0.5rem' }}>13 meses</td>
          </tr>
        </tbody>
      </table>
      <p style={S.p}>
        Puedes gestionar tus preferencias de cookies desde la configuración de tu
        navegador o mediante las herramientas de inhabilitación de Google Analytics
        y Microsoft Clarity.
      </p>

      <h2 style={S.h2}>8. Transferencias internacionales</h2>
      <p style={S.p}>
        Los datos personales pueden ser transferidos a Estados Unidos, país donde se
        encuentran los servidores de nuestros proveedores (Google, Microsoft, Vercel).
        Estas transferencias se realizan al amparo del{' '}
        <strong style={S.strong}>Marco de Privacidad de Datos UE-EE.UU.</strong>
        (Data Privacy Framework), que garantiza un nivel de protección adecuado
        conforme a la decisión de adecuación de la Comisión Europea.
      </p>

      <h2 style={S.h2}>9. Medidas de seguridad</h2>
      <p style={S.p}>
        Aplicamos medidas técnicas y organizativas apropiadas para proteger tus datos
        personales contra el acceso no autorizado, la alteración, la divulgación o la
        destrucción, incluyendo el cifrado TLS en todas las comunicaciones y el acceso
        restringido a los datos.
      </p>

      <h2 style={S.h2}>10. Modificaciones de esta política</h2>
      <p style={S.p}>
        Podemos actualizar esta Política de Privacidad periódicamente. Las modificaciones
        serán publicadas en esta página con la fecha de actualización correspondiente.
        Te recomendamos revisar esta página de forma ocasional para estar informado
        de cómo protegemos tu privacidad.
      </p>

      <hr style={S.hr} />

      <p style={S.p}>
        Si tienes cualquier duda sobre esta Política de Privacidad, puedes contactarnos
        en <strong style={S.strong}>info@contrial.app</strong>.
      </p>
    </div>
  );
}
