export type FormKind = 'contact' | 'booking'

interface FieldSpec {
  key: string
  label: string
  required: boolean
  max: number
}

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
const PHONE_RE = /^[0-9()#&+*,./:;<=\- ]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const FIELDS: Record<FormKind, FieldSpec[]> = {
  contact: [
    { key: 'name', label: 'Full name', required: true, max: 120 },
    { key: 'email', label: 'Email', required: true, max: 254 },
    { key: 'phone', label: 'Phone', required: false, max: 40 },
    { key: 'message', label: 'Message', required: true, max: 5000 },
  ],
  booking: [
    { key: 'name', label: 'Full name', required: true, max: 120 },
    { key: 'email', label: 'Email', required: true, max: 254 },
    { key: 'phone', label: 'Phone', required: true, max: 40 },
    { key: 'vehicle', label: 'Vehicle make, model and year', required: true, max: 200 },
    { key: 'service', label: 'Service', required: true, max: 100 },
    { key: 'preferred_date', label: 'Preferred date', required: false, max: 10 },
    { key: 'message', label: 'Your priorities', required: false, max: 5000 },
  ],
}

export type ValidationResult =
  | { ok: true; values: Record<string, string>; honeypot: boolean }
  | { ok: false; message: string }

/** Name of the hidden anti-bot field. Real users never fill it in. */
export const HONEYPOT_FIELD = 'company_website'

export function validate(kind: FormKind, input: unknown): ValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, message: 'Invalid request.' }
  }
  const body = input as Record<string, unknown>

  const trap = body[HONEYPOT_FIELD]
  if (typeof trap === 'string' && trap.trim() !== '') {
    return { ok: true, values: {}, honeypot: true }
  }

  const values: Record<string, string> = {}
  for (const f of FIELDS[kind]) {
    const raw = body[f.key]
    const v = typeof raw === 'string' ? raw.trim() : ''
    if (f.required && !v) return { ok: false, message: `${f.label} is required.` }
    if (v.length > f.max) return { ok: false, message: `${f.label} is too long.` }
    values[f.key] = v
  }
  if (!EMAIL_RE.test(values.email)) return { ok: false, message: 'Please enter a valid email address.' }
  if (values.phone && !PHONE_RE.test(values.phone)) return { ok: false, message: 'Please enter a valid phone number.' }
  if (values.preferred_date && !DATE_RE.test(values.preferred_date)) {
    return { ok: false, message: 'Please enter a valid preferred date.' }
  }
  return { ok: true, values, honeypot: false }
}
