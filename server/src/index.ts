import path from 'node:path'
import dotenv from 'dotenv'
import express, { type NextFunction, type Request, type Response } from 'express'

// Resolve server/.env relative to this file so it loads from both src/ (dev) and dist/ (prod), whatever the cwd.
dotenv.config({ path: path.resolve(import.meta.dirname, '../.env'), quiet: true })

const { bookingRouter } = await import('./routes/booking.js')
const { contactRouter } = await import('./routes/contact.js')
const { rateLimit } = await import('./lib/rateLimit.js')

const app = express()
app.disable('x-powered-by')
// Behind Caddy on the same host: trust the loopback proxy so req.ip is the real client IP.
app.set('trust proxy', 'loopback')

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'signature-car-lounge-api' })
})

// Same-origin in dev (Vite proxy) and prod (Caddy), so no CORS is needed.
app.use('/api', express.json({ limit: '16kb' }))
app.use('/api/contact', rateLimit, contactRouter)
app.use('/api/booking', rateLimit, bookingRouter)

app.use('/api', (_req, res) => {
  res.status(404).json({ ok: false, error: 'NOT_FOUND' })
})

// Body-parser failures (bad JSON, payload too large) and anything unexpected: never leak internals.
app.use((err: { status?: number; type?: string }, _req: Request, res: Response, _next: NextFunction) => {
  const tooLarge = err.type === 'entity.too.large'
  const badRequest = tooLarge || err.type === 'entity.parse.failed'
  if (!badRequest) console.error('Unhandled error:', err instanceof Error ? err.message : err)
  res.status(badRequest ? (tooLarge ? 413 : 400) : 500).json({
    ok: false,
    error: tooLarge ? 'PAYLOAD_TOO_LARGE' : badRequest ? 'INVALID_REQUEST' : 'INTERNAL_ERROR',
  })
})

const port = Number(process.env.PORT) || 3001
const host = process.env.HOST || '127.0.0.1'
app.listen(port, host, () => {
  console.log(`signature-car-lounge-api listening on http://${host}:${port}`)
  if (!process.env.RESEND_API_KEY) console.warn('Warning: RESEND_API_KEY is not set; form submissions will fail.')
})
