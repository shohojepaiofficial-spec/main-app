import { describe, it, expect } from "vitest";
import { classifyReferrer, DIRECT_LABEL, OTHER_SITES_LABEL } from "./referrer";

describe("classifyReferrer", () => {
  it("returns Direct/App for no referrer", () => {
    expect(classifyReferrer(undefined)).toBe(DIRECT_LABEL);
    expect(classifyReferrer(null)).toBe(DIRECT_LABEL);
    expect(classifyReferrer("")).toBe(DIRECT_LABEL);
  });

  it("classifies known social domains", () => {
    expect(classifyReferrer("https://www.facebook.com/somepage")).toBe("Facebook");
    expect(classifyReferrer("https://l.instagram.com/")).toBe("Instagram");
    expect(classifyReferrer("https://t.co/abc123")).toBe("X (Twitter)");
    expect(classifyReferrer("https://wa.me/123")).toBe("WhatsApp");
  });

  it("falls back to Other websites for an unrecognized referrer", () => {
    expect(classifyReferrer("https://some-random-blog.example.com")).toBe(OTHER_SITES_LABEL);
  });

  it("falls back to Other websites for a malformed URL rather than throwing", () => {
    expect(classifyReferrer("not a url")).toBe(OTHER_SITES_LABEL);
  });
});
