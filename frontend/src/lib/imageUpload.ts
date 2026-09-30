// The upload rules every image picker checks *before* sending anything, so a
// too-big or wrong-type file is caught instantly instead of after a long
// upload. The server enforces the same rules (server/src/utils/upload.ts) —
// keep the two in sync.

export const MAX_IMAGE_MB = 5;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
// For <input accept>, so the file dialog only offers images the server takes
// (a plain "image/*" also offers HEIC, SVG, TIFF…, which it would reject).
export const IMAGE_ACCEPT = ALLOWED_IMAGE_TYPES.join(",");

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
