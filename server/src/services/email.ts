import { Resend } from 'resend'
import { FIELDS, type FormKind } from '../lib/validate.js'

export class EmailNotConfiguredError extends Error {}

const SITE_TITLE = 'Signature Car Lounge'

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** Strips line breaks so user input can never inject extra header lines into the subject. */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim()

const SECTIONS: Record<FormKind, { title: string; heading: string; keys: string[] }[]> = {
  contact: [
    { title: 'Website contact', heading: 'Customer details', keys: ['name', 'email', 'phone'] },
    { title: '', heading: 'Message', keys: ['message'] },
  ],
  booking: [
    { title: 'Consultation booking', heading: 'Customer details', keys: ['name', 'email', 'phone'] },
    { title: '', heading: 'Vehicle', keys: ['vehicle'] },
    { title: '', heading: 'Service', keys: ['service', 'preferred_date'] },
    { title: '', heading: 'Priorities', keys: ['message'] },
  ],
}

export function buildEmail(kind: FormKind, values: Record<string, string>, submittedAt: Date) {
  const labels = Object.fromEntries(FIELDS[kind].map((f) => [f.key, f.label]))
  const type = SECTIONS[kind][0].title
  const subject =
    kind === 'contact'
      ? 'New Website Contact — Signature Car Lounge'
      : `New Consultation Booking — ${oneLine(values.service)}`
  const timestamp = `${submittedAt.toUTCString()} (${submittedAt.toISOString()})`

  const htmlSections = SECTIONS[kind]
    .map((s) => {
      const rows = s.keys
        .map(
          (k) =>
            `<tr><td style="padding:4px 16px 4px 0;vertical-align:top;color:#555"><strong>${escapeHtml(labels[k])}</strong></td>` +
            `<td style="padding:4px 0;white-space:pre-wrap">${escapeHtml(values[k]) || '—'}</td></tr>`,
        )
        .join('')
      return `<h3 style="margin:20px 0 6px;font-size:14px;text-transform:uppercase;letter-spacing:.06em">${escapeHtml(s.heading)}</h3><table cellpadding="0" cellspacing="0">${rows}</table>`
    })
    .join('')

  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111;max-width:640px">` +
    `<h2 style="margin:0">${SITE_TITLE}</h2>` +
    `<p style="margin:4px 0 0;color:#555">${escapeHtml(type)}</p>` +
    htmlSections +
    `<p style="margin-top:24px;color:#777;font-size:13px">Submitted: ${escapeHtml(timestamp)}</p></div>`

  const text =
    [
      SITE_TITLE,
      type,
      ...SECTIONS[kind].flatMap((s) => ['', s.heading.toUpperCase(), ...s.keys.map((k) => `${labels[k]}: ${values[k] || '—'}`)]),
    ].join('\n') + `\n\nSubmitted: ${timestamp}`

  return { subject, html, text }
}

export async function sendFormEmail(kind: FormKind, values: Record<string, string>): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new EmailNotConfiguredError('RESEND_API_KEY is not set')

  const { subject, html, text } = buildEmail(kind, values, new Date())
  const { error } = await new Resend(apiKey).emails.send({
    from: process.env.EMAIL_FROM || 'Signature Car Lounge Website <website@signaturecarslounge.com>',
    to: process.env.CONTACT_RECIPIENT || 'info@signaturecarslounge.com',
    replyTo: values.email,
    subject,
    html,
    text,
  })
  if (error) throw new Error(`Resend rejected email: ${error.name}: ${error.message}`)
}
