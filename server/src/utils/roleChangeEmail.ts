import { User, UserRole } from "../models/User";
import { sendEmail } from "./sendEmail";
import { escapeHtml } from "./escapeHtml";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

const ROLE_NAMES: Record<UserRole, string> = { user: "Customer", coadmin: "Co-admin", admin: "Admin" };

interface Person {
  name: string;
  email: string;
}

interface RoleChange {
  changer: Person;
  holder: Person;
  from: UserRole;
  to: UserRole;
  at: Date;
}

// Builds the two emails for one role change: one to the person whose role
// changed and one to the admin who changed it. Kept pure so it can be tested.
export function buildRoleChangeEmails({ changer, holder, from, to, at }: RoleChange) {
  const fromName = ROLE_NAMES[from];
  const toName = ROLE_NAMES[to];
  const when = at.toUTCString();
  const notYou = "If you don't recognise this change, reply to this email or contact the store owner right away.";

  const holderLines = [
    `Hi ${holder.name},`,
    `Your role at Shohoje Pai was changed from ${fromName} to ${toName} by ${changer.name} (${changer.email}) on ${when}.`,
    to === "user" ? "You no longer have access to the staff dashboard." : `Sign in to the dashboard: ${CLIENT_URL}/dashboard`,
    notYou,
  ];
  const changerLines = [
    `Hi ${changer.name},`,
    `You changed the role of ${holder.name} (${holder.email}) from ${fromName} to ${toName} on ${when}.`,
    notYou,
  ];

  const toHtml = (lines: string[]) => lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("");
  const toText = (lines: string[]) => lines.join("\n\n");

  return [
    { to: holder.email, subject: `Your Shohoje Pai role is now ${toName}`, html: toHtml(holderLines), text: toText(holderLines) },
    { to: changer.email, subject: `You changed ${holder.name}'s role to ${toName}`, html: toHtml(changerLines), text: toText(changerLines) },
  ];
}

// Always sent on a role change — there is no opt-out. Fire-and-forget like
// every other email here: a mail failure is logged but never undoes the change.
export function notifyRoleChange(changerId: string | undefined, holder: Person, from: UserRole, to: UserRole) {
  sendRoleChangeEmails(changerId, holder, from, to).catch((err) =>
    console.error("Role change email failed:", (err as Error).message)
  );
}

async function sendRoleChangeEmails(changerId: string | undefined, holder: Person, from: UserRole, to: UserRole) {
  const changer = await User.findById(changerId).select("name email");
  if (!changer?.email) throw new Error("changer has no email");
  const emails = buildRoleChangeEmails({ changer, holder, from, to, at: new Date() });
  await Promise.all(emails.map((e) => sendEmail(e)));
}
