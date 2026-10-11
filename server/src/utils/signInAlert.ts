import { AuthSession } from "../models/AuthSession";
import type { User } from "../models/User";
import { sendEmail } from "./sendEmail";
import { escapeHtml } from "./escapeHtml";
import { deviceText } from "./deviceLabel";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// Emails the account owner when a sign-in comes from a browser/device this
// account hasn't used in any session still on record. The very first
// session (registration, or nothing left on record) is not "new", so it
// sends nothing. Fire-and-forget like every other email here: a mail or
// database hiccup must never fail the sign-in itself.
export function alertIfNewDevice(user: InstanceType<typeof User>, sid: string, device: { userAgent?: string; ip?: string }) {
  if (!device.userAgent || !user.email) return;
  notify(user, sid, device.userAgent, device.ip).catch((err) => console.error("Sign-in alert failed:", (err as Error).message));
}

async function notify(user: InstanceType<typeof User>, sid: string, userAgent: string, ip?: string) {
  const others = { user: user.id, _id: { $ne: sid } };
  const [hasHistory, knownDevice] = await Promise.all([
    AuthSession.exists(others),
    AuthSession.exists({ ...others, userAgent }),
  ]);
  if (!hasHistory || knownDevice) return;

  const device = deviceText(userAgent);
  const when = new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" });
  const link = `${CLIENT_URL}/settings`;
  const where = ip ? ` (IP address ${ip})` : "";
  await sendEmail({
    to: user.email,
    subject: "New sign-in to your Shohoje Pai account",
    html: `<p>Hi ${escapeHtml(user.name)},</p><p>Your Shohoje Pai account was just signed in to from <strong>${escapeHtml(device)}</strong>${escapeHtml(where)} on ${escapeHtml(when)} (Bangladesh time).</p><p>If this was you, there's nothing to do.</p><p>If it wasn't, open <a href="${link}">your account settings</a>, sign that device out under "Active sessions", and change your password.</p>`,
    text: `Hi ${user.name},\n\nYour Shohoje Pai account was just signed in to from ${device}${where} on ${when} (Bangladesh time).\n\nIf this was you, there's nothing to do.\n\nIf it wasn't, open your account settings, sign that device out under "Active sessions", and change your password:\n${link}`,
  });
}
