import dotenv from "dotenv";
dotenv.config({ quiet: true });

import app from "./app";
import { connectDB } from "./config/db";
import { initErrorMonitoring, reportError } from "./utils/errorMonitoring";

initErrorMonitoring();

// Express 5 already forwards a rejected promise/thrown error from any route
// handler to errorHandler.ts instead of crashing the process (see that
// file) — these two are the safety net for the remaining case: something
// throwing completely outside the request/response cycle (a stray
// non-awaited promise, a bug in a timer callback, etc.). Node's own
// guidance is that after an uncaught exception the process is in an
// undefined state and should not keep serving requests — so this reports
// the error and exits, deliberately, rather than trying to soldier on. A
// process supervisor (see ecosystem.config.js / "npm run start:pm2") is
// what's actually responsible for bringing it back up afterward; without
// one, exiting here just means downtime until someone restarts it by hand.
process.on("uncaughtException", (err) => {
  reportError(err, { source: "uncaughtException" });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  reportError(reason, { source: "unhandledRejection" });
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

start();
