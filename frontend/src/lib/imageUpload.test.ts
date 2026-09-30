import { describe, it, expect } from "vitest";
import { imageUploadError, splitValidImages, MAX_IMAGE_BYTES } from "./imageUpload";

function file(name: string, type: string, size: number): File {
  const f = new File([""], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

describe("imageUploadError", () => {
  it("accepts a normal photo right at the limit", () => {
    expect(imageUploadError(file("shoe.jpg", "image/jpeg", MAX_IMAGE_BYTES))).toBeNull();
  });

  it("rejects an image over the limit, saying how big it is", () => {
    expect(imageUploadError(file("raw.jpg", "image/jpeg", 12 * 1024 * 1024))).toMatch(/12\.0MB/);
  });

  it("rejects types the server won't take", () => {
    expect(imageUploadError(file("iphone.heic", "image/heic", 1000))).toMatch(/isn't a JPG/);
    expect(imageUploadError(file("notes.pdf", "application/pdf", 1000))).toMatch(/isn't a JPG/);
  });
});

describe("splitValidImages", () => {
  it("keeps the good files and explains the bad ones", () => {
    const { valid, errors } = splitValidImages([
      file("a.png", "image/png", 1000),
      file("b.jpg", "image/jpeg", MAX_IMAGE_BYTES + 1),
      file("c.webp", "image/webp", 1000),
    ]);
    expect(valid.map((f) => f.name)).toEqual(["a.png", "c.webp"]);
    expect(errors).toHaveLength(1);
  });
});
