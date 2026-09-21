import nodemailer from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  // A plain-text alternative — nodemailer sends it as the multipart/text
  // part alongside `html`. An HTML-only email (no text part at all) is one
  // of the classic recipient-side spam heuristics; every call site that
  // sends to a real customer (rather than just the store owner) should pass
  // one rather than let this fall back to HTML-only.
  text?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // nodemailer's own defaults (2 minutes to connect, 30s to see a
    // greeting) are far too patient to hold open — but every caller here is
    // fire-and-forget, so nothing user-facing is actually waiting on this;
    // 20s just keeps a genuinely dead host from lingering in the logs, while
    // still giving a real (if occasionally slow) handshake to a small mail
    // host room to finish rather than getting cut off prematurely.
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
  });
}

export const sendEmail = async ({ to, subject, html, text }: SendEmailOptions): Promise<void> => {
  const mail = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    ...(text ? { text } : {}),
  };

  try {
    await buildTransporter().sendMail(mail);
  } catch (err) {
    // One retry on a fresh connection/transporter before giving up — every
    // caller already treats this as fire-and-forget (see authController.ts),
    // so the only cost of trying again is a few extra seconds server-side,
    // and it turns a real fraction of transient connection hiccups into a
    // successful send instead of a silently dropped email.
    console.error("First send attempt failed, retrying once:", describeError(err));
    await sleep(2_000);
    try {
      await buildTransporter().sendMail(mail);
    } catch (retryErr) {
      // The call site's own .catch() only logs err.message ("Connection
      // timeout" tells you nothing) — log the actual host/port/error code
      // here first, since that's what actually distinguishes "blocked
      // network path" from "wrong credentials" from "DNS failure".
      console.error("Retry also failed:", describeError(retryErr));
      throw retryErr;
    }
  }
};

function describeError(err: unknown): string {
  const e = err as NodeJS.ErrnoException &
    Record<"command" | "responseCode" | "address" | "port", unknown>;
  return JSON.stringify({
    message: e.message,
    code: e.code,
    errno: e.errno,
    address: e.address,
    port: e.port,
    command: e.command,
    responseCode: e.responseCode,
  });
}
