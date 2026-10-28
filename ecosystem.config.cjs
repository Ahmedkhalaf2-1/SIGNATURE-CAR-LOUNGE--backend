// PM2 process file for the API only (the frontend is static files served by Caddy).
// No secrets here: the app reads server/.env itself (dotenv), or real environment variables if set.
module.exports = {
  apps: [
    {
      name: 'signature-car-lounge-api',
      cwd: 'server',
      script: 'dist/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '127.0.0.1',
      },
      max_memory_restart: '300M',
    },
  ],
}
