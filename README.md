# Signature Car Lounge

React + TypeScript + Vite frontend (repo root) with a small Express + TypeScript API (`server/`) that sends the Contact and Booking emails through Resend. Images and fonts are local (`public/assets`).

```
.
├── src/, public/, index.html, vite.config.ts   React frontend (builds to dist/)
├── server/                                     Express API (builds to server/dist/)
│   ├── src/index.ts                            app, /api/health, rate limit, body limit
│   ├── src/routes/{contact,booking,forms}.ts
│   ├── src/services/email.ts                   Resend + HTML/text templates
│   ├── src/lib/{validate,rateLimit}.ts
│   └── .env.example
├── deploy/Caddyfile.example
├── ecosystem.config.cjs                        PM2 config for the API
└── package.json                                npm workspace root
```

The browser only ever calls relative URLs (`/api/contact`, `/api/booking`). In dev Vite proxies `/api` to the API; in production Caddy does. The Resend key lives only in `server/.env`.

API endpoints: `GET /api/health`, `POST /api/contact` (name, email, phone?, message), `POST /api/booking` (name, email, phone, vehicle, service, preferred_date?, message?). Both POST routes accept a hidden honeypot field `company_website`, are limited to 5 submissions per IP per 10 minutes (in memory, single process) and 16 kB bodies. Responses are `{ "ok": true }` or `{ "ok": false, "error": "CODE", "message": "..." }`; Resend errors are logged server-side only. If `RESEND_API_KEY` is missing the API returns `EMAIL_NOT_CONFIGURED` rather than pretending to succeed.

## Local development

```bash
npm install
cp server/.env.example server/.env     # then put your Resend key in RESEND_API_KEY=
npm run dev
```

- Site: http://localhost:5173
- API: http://localhost:3001 (health check: http://localhost:3001/api/health, or http://localhost:5173/api/health through the proxy)

Test the forms at http://localhost:5173/signature-booking/ (preselect a service with `?service=ppf`). There is currently no Contact form on the site; test `/api/contact` with:

```bash
curl -X POST http://localhost:5173/api/contact -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"you@example.com","message":"Hello"}'
```

Other scripts: `npm run typecheck`, `npm run lint`, `npm run build` (frontend → `dist/`, API → `server/dist/`), `npm start` (run built API).

## Future VPS deployment (not done yet)

Target: domain `signaturecarslounge.com`, VPS `186.240.150.156`, checkout at `/var/www/signaturecarslounge`.

```
Internet → Caddy (HTTPS)
             ├─ /api/* → Node API on 127.0.0.1:3001 (PM2)
             └─ /*     → /var/www/signaturecarslounge/dist (SPA fallback to index.html)
```

1. **DNS** (at the domain's DNS provider): `A @ 186.240.150.156` and `A www 186.240.150.156`. Add only; do not remove or change the existing Resend records (SPF/DKIM/MX).
2. **Server prerequisites:** Node 20+, PM2 (`npm i -g pm2`), Caddy.
3. **Get the code:** `git clone <repo> /var/www/signaturecarslounge && cd /var/www/signaturecarslounge`
4. **Install and build:** `npm ci && npm run build`
5. **Production env:** `cp server/.env.example server/.env`, set `NODE_ENV=production` and the real `RESEND_API_KEY`; `chmod 600 server/.env`.
6. **Start the API:** `pm2 start ecosystem.config.cjs && pm2 save && pm2 startup`
7. **Caddy:** copy `deploy/Caddyfile.example` to `/etc/caddy/Caddyfile` (check the `root` path), then `sudo systemctl reload caddy`. Caddy obtains and renews HTTPS certificates automatically once DNS points at the VPS and ports 80/443 are open.
8. **Verify:** `curl https://signaturecarslounge.com/api/health`, open `https://signaturecarslounge.com/signature-about/` directly (must not 404), and submit a booking.

To update later: `git pull && npm ci && npm run build && pm2 restart signature-car-lounge-api`.
