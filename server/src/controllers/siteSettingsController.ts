import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { SiteSettings, ISiteSettings } from "../models/SiteSettings";
import { toBdMsisdn } from "../utils/phone";
import { recordAuditEvent } from "../utils/auditLog";
import { validateControllerInput } from "../middleware/controllerInput";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const shapeSocial = (settings: ISiteSettings | null) => ({
  facebookUrl: settings?.social?.facebookUrl ?? "",
  instagramUrl: settings?.social?.instagramUrl ?? "",
  whatsappNumber: settings?.social?.whatsappNumber ?? "",
});

const shapeFull = (settings: ISiteSettings | null) => ({
  social: shapeSocial(settings),
  emailRouting: {
    contact: settings?.emailRouting?.contact ?? "",
    transactional: settings?.emailRouting?.transactional ?? "",
    marketing: settings?.emailRouting?.marketing ?? "",
  },
});

// Public — only what the storefront needs (Footer/Navbar icons, the
// WhatsApp chat button, the homepage's Organization JSON-LD). Email routing
// is never exposed here.
export const getPublicSiteSettings = async (_req: Request, res: Response) => {
  const settings = await SiteSettings.findOne({ key: "site" }).lean();
  res.json({ social: shapeSocial(settings as ISiteSettings | null) });
};

// Full admin only — includes email routing.
export const getSiteSettings = async (_req: AuthRequest, res: Response) => {
  res.json(shapeFull(await SiteSettings.findOne({ key: "site" })));
};

export const updateSiteSettings = async (req: AuthRequest, res: Response) => {
  validateControllerInput("updateSiteSettings", req);
  const body = req.body as Record<string, unknown>;
  const socialIn = (body.social ?? {}) as Record<string, unknown>;
  const emailIn = (body.emailRouting ?? {}) as Record<string, unknown>;

  const facebookUrl = text(socialIn.facebookUrl);
  const instagramUrl = text(socialIn.instagramUrl);
  const whatsappRaw = text(socialIn.whatsappNumber);

  if (facebookUrl && !isHttpsUrl(facebookUrl)) {
    return res.status(400).json({ message: "Facebook link must be an https:// address." });
  }
  if (instagramUrl && !isHttpsUrl(instagramUrl)) {
    return res.status(400).json({ message: "Instagram link must be an https:// address." });
  }

  let whatsappNumber = "";
  if (whatsappRaw) {
    const msisdn = toBdMsisdn(whatsappRaw);
    if (!msisdn) return res.status(400).json({ message: "WhatsApp number must be a valid Bangladeshi mobile number." });
    whatsappNumber = msisdn;
  }

  const emails: Partial<Record<"contact" | "transactional" | "marketing", string>> = {};
  for (const key of ["contact", "transactional", "marketing"] as const) {
    const value = text(emailIn[key]);
    if (value && !EMAIL_RE.test(value)) {
      return res.status(400).json({ message: `The ${key} email address isn't valid.` });
    }
    if (value) emails[key] = value.toLowerCase();
  }

  const current = await SiteSettings.findOne({ key: "site" });

  const unset: Record<string, 1> = {};
  if (!facebookUrl) unset["social.facebookUrl"] = 1;
  if (!instagramUrl) unset["social.instagramUrl"] = 1;
  if (!whatsappNumber) unset["social.whatsappNumber"] = 1;
  if (!emails.contact) unset["emailRouting.contact"] = 1;
  if (!emails.transactional) unset["emailRouting.transactional"] = 1;
  if (!emails.marketing) unset["emailRouting.marketing"] = 1;

  const updated = await SiteSettings.findOneAndUpdate(
    { key: "site" },
    {
      $set: {
        ...(facebookUrl ? { "social.facebookUrl": facebookUrl } : {}),
        ...(instagramUrl ? { "social.instagramUrl": instagramUrl } : {}),
        ...(whatsappNumber ? { "social.whatsappNumber": whatsappNumber } : {}),
        ...(emails.contact ? { "emailRouting.contact": emails.contact } : {}),
        ...(emails.transactional ? { "emailRouting.transactional": emails.transactional } : {}),
        ...(emails.marketing ? { "emailRouting.marketing": emails.marketing } : {}),
      },
      ...(Object.keys(unset).length ? { $unset: unset } : {}),
    },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
  );
  if (!updated) throw new Error("Site settings update did not complete");

  await recordAuditEvent({
    actorId: req.userId!,
    action: current ? "updated" : "created",
    entityType: "settings",
    entityId: updated.id,
    entityName: "Site settings",
    before: current?.toObject(),
    after: updated.toObject(),
  });

  res.json(shapeFull(updated));
};
