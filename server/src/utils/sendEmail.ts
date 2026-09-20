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

export const sendEmail = async ({ to, subject, html, text }: SendEmailOptions): Promise<void> => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // nodemailer's own defaults (2 minutes to connect, 30s to see a
    // greeting) are far too patient for something every caller here treats
    // as fire-and-forget — a genuinely unreachable SMTP host should log and
    // give up in a few seconds, not hold a request/connection open for two
    // full minutes first (see resendVerificationEmail's real-world hang).
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    ...(text ? { text } : {}),
  });
};
