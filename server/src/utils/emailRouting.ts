import { SiteSettings } from "../models/SiteSettings";

export type EmailPurpose = "transactional" | "marketing";

// The admin-configured "from" address for a given purpose (Site Settings
// dashboard), or undefined when nothing's set there — sendEmail.ts falls
// back to EMAIL_FROM in that case. A single small document, so a plain
// lookup per send is fine (same cost as any other singleton-settings read
// in this app, e.g. SitePopup).
//
// The dashboard stores the display name (e.g. "Shohoje Pai") and the address
// as separate fields — combined here into Resend's `"Name <address>"`
// format — because <input type="email"> rejects that combined format if an
// admin tries to type it directly into one field.
export async function getEmailFrom(purpose: EmailPurpose): Promise<string | undefined> {
  const settings = await SiteSettings.findOne({ key: "site" }).select("emailRouting").lean();
  const address = settings?.emailRouting?.[purpose];
  if (!address) return undefined;
  const name = purpose === "transactional" ? settings?.emailRouting?.transactionalName : settings?.emailRouting?.marketingName;
  return name ? `${name} <${address}>` : address;
}

// Where a contact-form submission notification is sent — falls back to
// CONTACT_EMAIL env at the call site when this isn't set.
export async function getContactNotifyEmail(): Promise<string | undefined> {
  const settings = await SiteSettings.findOne({ key: "site" }).select("emailRouting").lean();
  return settings?.emailRouting?.contact || undefined;
}
