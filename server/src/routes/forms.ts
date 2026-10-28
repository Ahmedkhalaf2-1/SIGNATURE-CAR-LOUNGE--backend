import type { Request, Response } from 'express'
import { validate, type FormKind } from '../lib/validate.js'
import { EmailNotConfiguredError, sendFormEmail } from '../services/email.js'

/** Shared request handler for the contact and booking routes. */
export function formHandler(kind: FormKind) {
  return async (req: Request, res: Response) => {
    const result = validate(kind, req.body)
    if (!result.ok) {
      res.status(400).json({ ok: false, error: 'VALIDATION_ERROR', message: result.message })
      return
    }
    // Honeypot tripped: pretend success to the bot, send nothing.
    if (result.honeypot) {
      res.json({ ok: true })
      return
    }
    try {
      await sendFormEmail(kind, result.values)
      res.json({ ok: true })
    } catch (err) {
      if (err instanceof EmailNotConfiguredError) {
        console.error(`[${kind}] email service not configured: RESEND_API_KEY is missing`)
        res.status(500).json({ ok: false, error: 'EMAIL_NOT_CONFIGURED', message: 'Email service is not configured.' })
        return
      }
      console.error(`[${kind}] email send failed:`, err instanceof Error ? err.message : 'unknown error')
      res.status(502).json({
        ok: false,
        error: 'EMAIL_SEND_FAILED',
        message: 'We could not send your message. Please try again or contact us directly.',
      })
    }
  }
}
