import type { NextFunction, Request, Response } from 'express'

const WINDOW_MS = 10 * 60 * 1000
const MAX_HITS = 5

/** Per-process, in-memory limiter. Fine for a single PM2 instance; resets on restart. */
const hits = new Map<string, number[]>()

setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS
  for (const [ip, times] of hits) {
    const recent = times.filter((t) => t > cutoff)
    if (recent.length) hits.set(ip, recent)
    else hits.delete(ip)
  }
}, 60 * 1000).unref()

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip ?? 'unknown'
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => t > now - WINDOW_MS)
  if (recent.length >= MAX_HITS) {
    const retryAfter = Math.ceil((recent[0] + WINDOW_MS - now) / 1000)
    res.setHeader('Retry-After', String(retryAfter))
    res.status(429).json({
      ok: false,
      error: 'RATE_LIMITED',
      message: 'Too many requests. Please try again in a few minutes.',
    })
    return
  }
  recent.push(now)
  hits.set(ip, recent)
  next()
}
