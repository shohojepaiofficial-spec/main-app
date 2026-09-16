// PM2 process supervisor config — for a self-managed host (a raw VPS) where
// nothing else restarts a crashed Node process automatically. Run with
// `npm run start:pm2` (after `npm run build`). If deploying to a PaaS that
// already restarts crashed processes for you (Render, Railway, Fly.io,
// etc.), this is redundant but harmless — plain `npm start` still works.
module.exports = {
  apps: [
    {
      name: "ecommerce-server",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      // Backs off instead of hot-looping if the process keeps crashing
      // immediately (e.g. a bad deploy) — caps restart frequency rather
      // than restarting as fast as possible forever.
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 2000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
