import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";
import { galleryShareLink, shareIdFromGalleryShareLink } from "./galleryShareLinks";

beforeEach(() => { vi.stubEnv("JWT_SECRET", "gallery-share-test-secret"); });

describe("gallery share links (WORK-23)", () => {
  const id = new Types.ObjectId().toString();

  it("reads back the share id from a link it made", () => {
    const link = galleryShareLink(id);
    expect(link.startsWith(`${id}-`)).toBe(true);
    expect(shareIdFromGalleryShareLink(link)).toBe(id);
  });

  it("refuses a bare share id, a forged signature and another share's signature", () => {
    const link = galleryShareLink(id);
    const other = new Types.ObjectId().toString();
    expect(shareIdFromGalleryShareLink(id)).toBeNull();
    expect(shareIdFromGalleryShareLink(`${id}-${"A".repeat(32)}`)).toBeNull();
    expect(shareIdFromGalleryShareLink(`${other}${link.slice(24)}`)).toBeNull();
    expect(shareIdFromGalleryShareLink(link.slice(0, -1))).toBeNull();
    expect(shareIdFromGalleryShareLink(undefined)).toBeNull();
  });

  it("stops working when the server secret changes", () => {
    const link = galleryShareLink(id);
    vi.stubEnv("JWT_SECRET", "a-different-secret");
    expect(shareIdFromGalleryShareLink(link)).toBeNull();
  });
});
