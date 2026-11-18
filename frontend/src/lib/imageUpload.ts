// The upload rules every image picker checks *before* sending anything, so a
// too-big or wrong-type file is caught instantly instead of after a long
// upload. The server enforces the same rules (server/src/utils/upload.ts) —
// keep the two in sync.

export const MAX_IMAGE_MB = 4;
export const MAX_IMAGE_FILES = 5;
// 5 images at MAX_IMAGE_MB each, plus headroom for multipart boundaries and
// other form fields. Used to be capped at 4 MB total to fit under Vercel's
// serverless function payload limit; the frontend now runs as a normal
// long-running server (Railway), so this only needs to match what the
// backend itself accepts (server/src/utils/upload.ts) — keep the two in sync.
export const MAX_MULTIPART_BYTES = (MAX_IMAGE_FILES * MAX_IMAGE_MB + 2) * 1024 * 1024;
// The product gallery (WORK-23) allows a bigger batch per upload than the
// 5-image product form — keep in sync with MAX_GALLERY_UPLOAD_FILES in
// server/src/utils/upload.ts and the proxy's per-route bound in
// frontend/src/app/api/backend/[...path]/route.ts.
export const MAX_GALLERY_IMAGE_FILES = 30;
export const MAX_GALLERY_MULTIPART_BYTES = (MAX_GALLERY_IMAGE_FILES * MAX_IMAGE_MB + 2) * 1024 * 1024;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
// For <input accept>, so the file dialog only offers images the server takes
// (a plain "image/*" also offers HEIC, SVG, TIFF…, which it would reject).
export const IMAGE_ACCEPT = ALLOWED_IMAGE_TYPES.join(",");

export function validateMultipartSize(data: FormData, maxBytes: number = MAX_MULTIPART_BYTES) {
  let bytes = 0;
  for (const [name, value] of data.entries()) bytes += new TextEncoder().encode(name).length + (typeof value === "string" ? new TextEncoder().encode(value).length : value.size) + 512;
  const maxMb = maxBytes / 1024 / 1024;
  if (bytes > maxBytes) throw new Error(`Images and form fields must total less than ${maxMb} MB. Use smaller images or fewer files.`);
}

// A reason the file can't be uploaded, or null when it's fine.
export function imageUploadError(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `"${file.name}" isn't a JPG, PNG, WebP or GIF image.`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `"${file.name}" is ${mb}MB — images must be ${MAX_IMAGE_MB}MB or smaller.`;
  }
  return null;
}

// Splits a selection into the files that can go up and the reasons the rest can't.
export function splitValidImages(files: File[]): { valid: File[]; errors: string[] } {
  const valid: File[] = [];
  const errors: string[] = [];
  for (const file of files) {
    const error = imageUploadError(file);
    if (error) errors.push(error);
    else valid.push(file);
  }
  return { valid, errors };
}
