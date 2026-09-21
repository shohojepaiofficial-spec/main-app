// Every email this app sends (verification, password reset, the welcome
// email, contact-form notifications, marketing campaigns) goes through this
// one function — see server/.env.example for the full explanation of why
// this uses Resend's HTTPS API instead of raw SMTP: SMTP from Railway to
// Namecheap Private Email turned out to be a hard, consistent connection
// timeout regardless of port (465 or 587), most likely one side blocking
// the other's outbound network path — nothing fixable in this codebase.
// HTTPS to a well-known API host doesn't have that problem.
interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  // A plain-text alternative, sent as the email's text/plain part alongside
  // `html`. An HTML-only email is one of the classic recipient-side spam
  // heuristics; every call site that sends to a real customer (rather than
  // just the store owner) should pass one rather than let this go without.
  text?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function postToResend({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY / EMAIL_FROM not configured");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, ...(text ? { text } : {}) }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend API error (${res.status}): ${body.slice(0, 300)}`);
  }
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  try {
    await postToResend(options);
  } catch (err) {
    // One retry before giving up — every caller already treats this as
    // fire-and-forget (see authController.ts), so the only cost of trying
    // again is a couple of extra seconds server-side, and it turns a real
    // fraction of transient API hiccups into a successful send instead of a
    // silently dropped email.
    console.error("First send attempt failed, retrying once:", (err as Error).message);
    await sleep(2_000);
    await postToResend(options);
  }
};
