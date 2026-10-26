import { Request, Response } from "express";
import mongoose from "mongoose";
import { validateControllerInput } from "../middleware/controllerInput";
import { AuthRequest } from "../middleware/auth";
import { SitePopup, ISitePopup, PopupButton } from "../models/SitePopup";
import { storeUploadedFile, deleteUploadedFile } from "../utils/upload";
import { recordAuditEvent } from "../utils/auditLog";
import { isSafeBannerHref } from "./bannerController";

const shapePopup = (popup: ISitePopup | null) => ({
  isActive: popup?.isActive ?? false,
  title: popup?.title ?? "",
  message: popup?.message ?? "",
  image: popup?.image,
  button: popup?.button?.label ? { label: popup.button.label, href: popup.button.href } : undefined,
  version: popup?.version ?? 0,
});

// Public — the popup visitors see, or null when it's switched off.
export const getSitePopup = async (_req: Request, res: Response) => {
  const popup = await SitePopup.findOne({ key: "site" });
  if (!popup?.isActive) return res.json(null);
  const { title, message, image, button, version } = shapePopup(popup);
  res.json({ title, message, image, button, version });
};

// Staff (banners:manage) — current settings, including when switched off.
export const getSitePopupSettings = async (_req: AuthRequest, res: Response) => {
  res.json(shapePopup(await SitePopup.findOne({ key: "site" })));
};

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const emptyError = "Add a title, message or image before turning the popup on.";

export const updateSitePopup = async (req: AuthRequest, res: Response) => {
  validateControllerInput("updateSitePopup", req);
  const file = req.file as Express.Multer.File | undefined;
  const isActive = req.body.isActive === true || req.body.isActive === "true";
  const title = text(req.body.title);
  const message = text(req.body.message);
  const buttonLabel = text(req.body.buttonLabel);
  const buttonHref = text(req.body.buttonHref);

  if (title.length > 120) return res.status(400).json({ message: "Title can be at most 120 characters." });
  if (message.length > 1000) return res.status(400).json({ message: "Message can be at most 1000 characters." });
  let button: PopupButton | undefined;
  if (buttonLabel || buttonHref) {
    if (!buttonLabel || !buttonHref) return res.status(400).json({ message: "A button needs both a label and a link." });
    if (buttonLabel.length > 80 || !isSafeBannerHref(buttonHref)) {
      return res.status(400).json({ message: "Button links must be a page on this site (starting with /) or an https:// address." });
    }
    button = { label: buttonLabel, href: buttonHref };
  }

  const current = await SitePopup.findOne({ key: "site" });
  const removeImage = req.body.removeImage === "true" && !file;
  const keptImage = removeImage ? undefined : current?.image;
  if (isActive && !title && !message && !file && !keptImage) return res.status(400).json({ message: emptyError });

  const uploadedImage = file ? await storeUploadedFile(file) : undefined;
  const image = uploadedImage ?? keptImage;

  const contentChanged =
    !current ||
    current.title !== title ||
    current.message !== message ||
    current.image !== image ||
    current.button?.label !== button?.label ||
    current.button?.href !== button?.href ||
    (!current.isActive && isActive);

  const unset: Record<string, 1> = {};
  if (!image) unset.image = 1;
  if (!button) unset.button = 1;

  const session = await mongoose.startSession();
  const result: { popup: ISitePopup | null } = { popup: null };
  try {
    await session.withTransaction(async () => {
      const updated = await SitePopup.findOneAndUpdate(
        { key: "site" },
        {
          $set: { isActive, title, message, ...(image ? { image } : {}), ...(button ? { button } : {}) },
          ...(Object.keys(unset).length ? { $unset: unset } : {}),
          ...(contentChanged ? { $inc: { version: 1 } } : {}),
        },
        { session, upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
      );
      if (!updated) throw new Error("Popup update did not complete");
      await recordAuditEvent({
        actorId: req.userId!, action: current ? "updated" : "created", entityType: "popup",
        entityId: updated.id, entityName: updated.title || "Site popup",
        before: current?.toObject(), after: updated.toObject(),
      }, session);
      result.popup = updated;
    });
  } catch (error) {
    if (uploadedImage) await deleteUploadedFile(uploadedImage);
    throw error;
  } finally {
    await session.endSession();
  }

  res.json(shapePopup(result.popup));

  // Only drop the old file once the new settings are saved.
  if (current?.image && current.image !== image) await deleteUploadedFile(current.image);
};
