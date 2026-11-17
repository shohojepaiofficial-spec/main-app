import { describe, expect, it } from "vitest";
import { validateMultipartSize } from "./imageUpload";
describe("proxy upload budget", () => {
  it("accepts a small image and normal fields", () => {
    const data = new FormData(); data.set("title", "Product"); data.append("images", new Blob([new Uint8Array(1024)]), "photo.png");
    expect(() => validateMultipartSize(data)).not.toThrow();
  });
  it("rejects an aggregate payload even when individual images fit", () => {
    const data = new FormData();
    for (let i = 0; i < 6; i++) data.append("images", new Blob([new Uint8Array(4 * 1024 * 1024)]), `photo-${i}.png`);
    expect(() => validateMultipartSize(data)).toThrow("total less than 22 MB");
  });
  it("accepts 5 full-size images in one request", () => {
    const data = new FormData();
    for (let i = 0; i < 5; i++) data.append("images", new Blob([new Uint8Array(4 * 1024 * 1024)]), `photo-${i}.png`);
    expect(() => validateMultipartSize(data)).not.toThrow();
  });
});
