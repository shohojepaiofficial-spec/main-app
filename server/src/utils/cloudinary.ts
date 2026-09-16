import { v2 as cloudinary } from "cloudinary";

// Same "zero-config-required, falls back until keys are added" pattern as
// sms.ts/meta.ts/x.ts/errorMonitoring.ts — local dev and a fresh checkout
// must keep working with zero setup, only switching over to real cloud
// storage once these three are actually set. See utils/upload.ts for the
// fallback (local disk, same as before this existed).
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Uploads a buffer (multer's `memoryStorage` output — see upload.ts) and
// resolves to Cloudinary's own permanent, public `secure_url`. Folder keeps
// this app's assets grouped separately from anything else that might share
// the same Cloudinary account.
export function uploadBufferToCloudinary(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "new-ecommerce" },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}
