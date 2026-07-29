import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

const ALERTS_FROM = `Nartalis <${process.env.EMAIL_FROM_ALERTS || 'notificaciones@nartalis.com'}>`
const MARKETING_FROM = `Equipo Nartalis <${process.env.EMAIL_FROM || 'info@nartalis.com'}>`

export async function sendAlert(params: {
  to: string
  subject: string
  html: string
  from?: string
  replyTo?: string
}) {
  return resend.emails.send({
    from: params.from || ALERTS_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
    ...(params.replyTo ? { replyTo: params.replyTo } : {}),
  })
}

export { MARKETING_FROM }

export function buildAlertTemplate(params: {
  title: string
  tenant: string
  rent: number
  expirationDate: string
  daysLabel: string
  dashboardUrl: string
}): string {
  return `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif">
      <div style="background:#185FA5;padding:28px 24px;text-align:center;border-radius:8px 8px 0 0">
        <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:600">⚠️ Alerta de Vencimiento</h1>
        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:13px">Contrial</p>
      </div>
      <div style="padding:32px 24px;background:#ffffff;border:1px solid #e5e7eb;border-top:none">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#6B7280;width:120px">Inmueble</td>
            <td style="padding:8px 0;font-size:14px;color:#1E293B;font-weight:600">${params.title}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#6B7280">Inquilino</td>
            <td style="padding:8px 0;font-size:14px;color:#1E293B">${params.tenant}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#6B7280">Renta mensual</td>
            <td style="padding:8px 0;font-size:14px;color:#1E293B">${params.rent.toLocaleString('es-ES')} €</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#6B7280">Vencimiento</td>
            <td style="padding:8px 0;font-size:14px;color:#E24B4A;font-weight:600">${params.expirationDate}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#6B7280">Estado</td>
            <td style="padding:8px 0;font-size:14px;color:#E24B4A;font-weight:600">${params.daysLabel}</td>
          </tr>
        </table>
        <div style="margin-top:24px;text-align:center">
          <a href="${params.dashboardUrl}" style="display:inline-block;background:#185FA5;color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500">
            Ver en Contrial
          </a>
        </div>
      </div>
      <div style="text-align:center;padding:20px 24px;font-size:12px;color:#9CA3AF;background:#F9FAFB;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none">
        Contrial — Gestión Inteligente de Contratos
      </div>
    </div>
  `
}
