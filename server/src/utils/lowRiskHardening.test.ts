import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";

// SEC-24: the low-risk hardening list from the 10-19 audit.
vi.mock("../models/User", () => ({ User: { findById: vi.fn(), updateOne: vi.fn() } }));
vi.mock("../models/Product", () => ({ Product: { exists: vi.fn() } }));
vi.mock("../models/Review", () => ({ Review: { findOneAndUpdate: vi.fn() } }));
vi.mock("../models/Order", () => ({ Order: { exists: vi.fn() } }));
import { User } from "../models/User";
import { Product } from "../models/Product";
import { Review } from "../models/Review";
import { isSafeBannerHref, isHexColor } from "../controllers/bannerController";
import { requireInternalSecret } from "../middleware/internalAuth";
import { submitReview } from "../controllers/reviewController";
import { addToWishlist, MAX_WISHLIST_ITEMS } from "../controllers/wishlistController";

const productId = "507f1f77bcf86cd799439011";
const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() });
beforeEach(() => vi.clearAllMocks());

describe("banner button links and colour", () => {
  it("allows pages on this site and https addresses only", () => {
    for (const ok of ["/shop", "/shop/abc?promo=X", "https://shohojepai.com/shop"]) expect(isSafeBannerHref(ok)).toBe(true);
    for (const bad of ["javascript:alert(1)", "JAVASCRIPT:alert(1)", "data:text/html,x", "//evil.example", "/\\evil.example", "http://shohojepai.com", "shop", ""]) {
      expect(isSafeBannerHref(bad)).toBe(false);
    }
  });
  it("allows hex colours only", () => {
    expect(isHexColor("#ddc56e")).toBe(true);
    expect(isHexColor("#FFF")).toBe(true);
    expect(isHexColor("red; background: url(https://x)")).toBe(false);
    expect(isHexColor("#12345")).toBe(false);
  });
});

describe("internal secret check", () => {
  beforeEach(() => vi.stubEnv("INTERNAL_API_SECRET", "right-secret"));
  afterEach(() => vi.unstubAllEnvs());
  const run = (sent: unknown) => {
    const res = response(); const next = vi.fn();
    requireInternalSecret({ headers: { "x-internal-secret": sent } } as unknown as Request, res as unknown as Response, next);
    return { res, next };
  };
  it("lets the right secret through and refuses anything else", () => {
    expect(run("right-secret").next).toHaveBeenCalledOnce();
    for (const wrong of ["wrong", "right-secre", undefined, ["right-secret"]]) {
      const { res, next } = run(wrong);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    }
  });
});

describe("reviews", () => {
  const req = { userId: "u1", params: { id: productId }, body: { rating: 5, comment: "Great" } } as unknown as Request;
  it("needs a verified email", async () => {
    vi.mocked(User.findById).mockResolvedValue({ name: "A", isEmailVerified: false } as never);
    const res = response();
    await submitReview(req as never, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(Review.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it("refuses a product that doesn't exist", async () => {
    vi.mocked(User.findById).mockResolvedValue({ name: "A", isEmailVerified: true } as never);
    vi.mocked(Product.exists).mockResolvedValue(null as never);
    const res = response();
    await submitReview(req as never, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(Review.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe("wishlist cap", () => {
  const req = { userId: "u1", params: { productId } } as unknown as Request;
  beforeEach(() => vi.mocked(Product.exists).mockResolvedValue({ _id: productId } as never));
  it("adds atomically only while under the cap", async () => {
    vi.mocked(User.updateOne).mockResolvedValue({ matchedCount: 1 } as never);
    const res = response();
    await addToWishlist(req as never, res as unknown as Response);
    const [filter, update] = vi.mocked(User.updateOne).mock.calls[0] as unknown as [Record<string, unknown>, Record<string, unknown>];
    expect(filter[`wishlist.${MAX_WISHLIST_ITEMS - 1}`]).toEqual({ $exists: false });
    expect(update).toHaveProperty("$addToSet");
    expect(res.status).toHaveBeenCalledWith(201);
  });
  it("says the list is full instead of adding", async () => {
    vi.mocked(User.updateOne).mockResolvedValue({ matchedCount: 0 } as never);
    vi.mocked(User.findById).mockReturnValue({ select: () => Promise.resolve({ wishlist: [] }) } as never);
    const res = response();
    await addToWishlist(req as never, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(409);
  });
  it("treats an item that's already saved as success", async () => {
    vi.mocked(User.updateOne).mockResolvedValue({ matchedCount: 0 } as never);
    const { Types } = await import("mongoose");
    vi.mocked(User.findById).mockReturnValue({ select: () => Promise.resolve({ wishlist: [new Types.ObjectId(productId)] }) } as never);
    const res = response();
    await addToWishlist(req as never, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
