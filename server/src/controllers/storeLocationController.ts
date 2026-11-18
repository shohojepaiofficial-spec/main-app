import { Response, Request } from "express";
import mongoose from "mongoose";
import { validateControllerInput } from "../middleware/controllerInput";
import { AuthRequest } from "../middleware/auth";
import { StoreLocation } from "../models/StoreLocation";
import { storeUploadedFile, deleteUploadedFile, MAX_UPLOAD_FILES } from "../utils/upload";
import { recordAuditEvent } from "../utils/auditLog";

type StoreLocationDoc = InstanceType<typeof StoreLocation>;

const shapeLocation = (location: StoreLocationDoc) => ({
  id: location.id,
  name: location.name,
  address: location.address,
  phone: location.phone,
  mapUrl: location.mapUrl,
  images: location.images,
  order: location.order,
  isActive: location.isActive,
});

// Trimmed text fields from a multipart body, or an error message.
function parseFields(body: { name?: unknown; address?: unknown; phone?: unknown; mapUrl?: unknown }) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const mapUrl = typeof body.mapUrl === "string" ? body.mapUrl.trim() : "";
  if (name.length < 2 || name.length > 100) return { error: "Name must be 2 to 100 characters" };
  if (address.length < 5 || address.length > 300) return { error: "Address must be 5 to 300 characters" };
  if (phone.length > 20) return { error: "Phone number is too long" };
  if (mapUrl.length > 500) return { error: "Map link is too long" };
  if (mapUrl && !/^https:\/\//.test(mapUrl)) return { error: "Map link must start with https://" };
  return { name, address, phone, mapUrl };
}

// Public — the storefront's "Our Stores" page, active locations only.
export const getStoreLocations = async (_req: Request, res: Response) => {
  const locations = await StoreLocation.find({ isActive: true }).sort({ order: 1, _id: 1 });
  res.json(locations.map(shapeLocation));
};

// Staff (locations:manage) — every location, including inactive ones.
export const getAllStoreLocations = async (_req: AuthRequest, res: Response) => {
  const locations = await StoreLocation.find().sort({ order: 1, _id: 1 });
  res.json(locations.map(shapeLocation));
};

export const createStoreLocation = async (req: AuthRequest, res: Response) => {
  validateControllerInput("createStoreLocation", req);
  const fields = parseFields(req.body);
  if ("error" in fields) return res.status(400).json({ message: fields.error });

  const files = ((req.files as Express.Multer.File[] | undefined) ?? []).slice(0, MAX_UPLOAD_FILES);
  const images = await Promise.all(files.map((file) => storeUploadedFile(file)));
  const session = await mongoose.startSession();
  const result: { location?: StoreLocationDoc } = {};
  try {
    await session.withTransaction(async () => {
      const highest = await StoreLocation.findOne().sort({ order: -1 }).session(session);
      const [created] = await StoreLocation.create(
        [{ ...fields, images, order: (highest?.order ?? -1) + 1 }],
        { session }
      );
      await recordAuditEvent({
        actorId: req.userId!, action: "created", entityType: "storeLocation",
        entityId: created.id, entityName: created.name, after: created.toObject(),
      }, session);
      result.location = created;
    });
  } catch (error) {
    await Promise.all(images.map((image) => deleteUploadedFile(image)));
    throw error;
  } finally {
    await session.endSession();
  }
  if (!result.location) throw new Error("Store location creation did not complete");
  res.status(201).json(shapeLocation(result.location));
};

export const updateStoreLocation = async (req: AuthRequest, res: Response) => {
  validateControllerInput("updateStoreLocation", req);
  const fields = parseFields(req.body);
  if ("error" in fields) return res.status(400).json({ message: fields.error });
  const current = await StoreLocation.findById(req.params.id);
  if (!current) return res.status(404).json({ message: "Store location not found" });

  const removeUrls: string[] = Array.isArray(req.body.removeImages)
    ? req.body.removeImages
    : typeof req.body.removeImages === "string" && req.body.removeImages
      ? [req.body.removeImages]
      : [];
  const kept = current.images.filter((url) => !removeUrls.includes(url));
  const files = ((req.files as Express.Multer.File[] | undefined) ?? []);
  const room = Math.max(0, MAX_UPLOAD_FILES - kept.length);
  const newFiles = files.slice(0, room);
  const uploadedImages = await Promise.all(newFiles.map((file) => storeUploadedFile(file)));
  const images = [...kept, ...uploadedImages];
  const isActive = req.body.isActive === "false" ? false : req.body.isActive === "true" ? true : current.isActive;

  const session = await mongoose.startSession();
  const result: { location: StoreLocationDoc | null } = { location: null };
  let concurrentEdit = false;
  try {
    await session.withTransaction(async () => {
      const updated = await StoreLocation.findOneAndUpdate(
        { _id: current._id, updatedAt: current.get("updatedAt") },
        { $set: { ...fields, images, isActive } },
        { session, returnDocument: "after", runValidators: true }
      );
      if (!updated) {
        concurrentEdit = true;
        return;
      }
      await recordAuditEvent({
        actorId: req.userId!, action: "updated", entityType: "storeLocation",
        entityId: updated.id, entityName: updated.name,
        before: current.toObject(), after: updated.toObject(),
      }, session);
      result.location = updated;
    });
  } catch (error) {
    await Promise.all(uploadedImages.map((image) => deleteUploadedFile(image)));
    throw error;
  } finally {
    await session.endSession();
  }
  if (concurrentEdit || !result.location) {
    await Promise.all(uploadedImages.map((image) => deleteUploadedFile(image)));
    return res.status(409).json({ message: "Store location changed; refresh and try again" });
  }
  res.json(shapeLocation(result.location));

  const removed = current.images.filter((url) => removeUrls.includes(url));
  await Promise.all(removed.map((url) => deleteUploadedFile(url)));
};

export const moveStoreLocation = async (req: AuthRequest, res: Response) => {
  validateControllerInput("moveStoreLocation", req);
  const { direction } = req.body as { direction?: "up" | "down" };
  if (direction !== "up" && direction !== "down") {
    return res.status(400).json({ message: "direction must be 'up' or 'down'" });
  }

  const session = await mongoose.startSession();
  const reordered: { locations: StoreLocationDoc[] | null } = { locations: null };
  let missing = false;
  let boundary = false;
  try {
    await session.withTransaction(async () => {
      const locations = await StoreLocation.find().sort({ order: 1, _id: 1 }).session(session);
      const index = locations.findIndex((location) => location.id === req.params.id);
      if (index === -1) {
        missing = true;
        return;
      }
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= locations.length) {
        boundary = true;
        return;
      }
      const before = locations.map((location) => location.toObject());
      [locations[index], locations[swapIndex]] = [locations[swapIndex], locations[index]];
      for (const [position, location] of locations.entries()) {
        if (location.order === position) continue;
        location.order = position;
        await location.save({ session });
        await recordAuditEvent({
          actorId: req.userId!, action: "reordered", entityType: "storeLocation",
          entityId: location.id, entityName: location.name,
          before: before.find((item) => String(item._id) === location.id), after: location.toObject(),
        }, session);
      }
      reordered.locations = locations;
    });
  } finally {
    await session.endSession();
  }
  if (missing) return res.status(404).json({ message: "Store location not found" });
  if (boundary) return res.status(400).json({ message: "Can't move further in that direction" });
  if (!reordered.locations) throw new Error("Store location reorder did not complete");
  res.json(reordered.locations.map(shapeLocation));
};

export const deleteStoreLocation = async (req: AuthRequest, res: Response) => {
  validateControllerInput("deleteStoreLocation", req);
  const session = await mongoose.startSession();
  const result: { location: StoreLocationDoc | null } = { location: null };
  let missing = false;
  try {
    await session.withTransaction(async () => {
      const current = await StoreLocation.findById(req.params.id).session(session);
      if (!current) {
        missing = true;
        return;
      }
      await recordAuditEvent({
        actorId: req.userId!, action: "deleted", entityType: "storeLocation",
        entityId: current.id, entityName: current.name, before: current.toObject(),
      }, session);
      result.location = await StoreLocation.findOneAndDelete({ _id: current._id }, { session });
    });
  } finally {
    await session.endSession();
  }
  if (missing) return res.status(404).json({ message: "Store location not found" });
  if (!result.location) throw new Error("Store location deletion did not complete");
  res.json({ message: "Store location deleted" });

  await Promise.all(result.location.images.map((url) => deleteUploadedFile(url)));
};
