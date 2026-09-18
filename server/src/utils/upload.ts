import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { isCloudinaryConfigured, uploadBufferToCloudinary, deleteFromCloudinary } from "./cloudinary";

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

// Memory, not disk — the file only ever needs to exist as a buffer long
// enough for storeUploadedFile() below to hand it off (to Cloudinary, or to
// a local write), never as a multer-managed file on disk. This is what lets
// storeUploadedFile branch between the two destinations without multer
// itself needing to know which one it'll be.
const storage = multer.memoryStorage();

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const isAllowed = allowed.test(path.extname(file.originalname).toLowerCase());
  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpeg, jpg, png, webp, gif) are allowed"));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// The one place every controller goes through to turn an uploaded file into
// a storable URL — never read `file.filename`/`file.path` directly. Once
// CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET are set (see .env.example), every
// new upload goes to Cloudinary and this returns its permanent https URL;
// until then (and for every image already saved before that happens) it
// falls back to exactly what this app did before Cloudinary existed — a
// local /uploads/<uuid>.<ext> file served by app.ts's express.static. Old
// and new images can coexist fine either way, since both the frontend's
// `toUploadUrl` and the ad integrations' `toPublicImageUrl` already pass an
// absolute URL through unchanged and only prefix a bare local path.
export async function storeUploadedFile(file: Express.Multer.File): Promise<string> {
  if (isCloudinaryConfigured()) {
    return uploadBufferToCloudinary(file.buffer);
  }

  const filename = `${uuidv4()}${path.extname(file.originalname)}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, filename), file.buffer);
  return `/uploads/${filename}`;
}

// Matches this app's own upload shape exactly — `{ folder: "new-ecommerce" }`,
// no eager transformations, no incoming transformation segments — so the
// public_id (folder + filename, no extension) can be recovered from the
// plain `secure_url` string every controller already stores, instead of
// adding a parallel `publicId` field to every image-bearing schema and
// migrating existing documents to backfill it. If the upload folder or
// options in cloudinary.ts ever change, this needs to change with them.
const CLOUDINARY_URL_PATTERN =
  /^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/;

// The one place every controller goes through to clean up an image that's
// no longer referenced (a product/banner deleted, or a replaced image) —
// mirrors storeUploadedFile below. Deliberately never throws: cleanup is
// best-effort maintenance, not something that should fail the delete/update
// request that triggered it. A URL that isn't ours (an OAuth avatar from
// Google/Facebook, or any other external image) is silently left alone —
// this only ever acts on the two shapes storeUploadedFile itself produces.
export async function deleteUploadedFile(url: string | undefined | null): Promise<void> {
  if (!url) return;
  try {
    const cloudinaryMatch = url.match(CLOUDINARY_URL_PATTERN);
    if (cloudinaryMatch) {
      await deleteFromCloudinary(cloudinaryMatch[1]);
      return;
    }
    if (url.startsWith("/uploads/")) {
      await fs.unlink(path.join(UPLOAD_DIR, path.basename(url)));
    }
  } catch (err) {
    console.error(`deleteUploadedFile failed for ${url}:`, err);
  }
}
