import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";

vi.mock("../models/Review", () => ({ Review: { findByIdAndUpdate: vi.fn(), findById: vi.fn() } }));
vi.mock("../models/User", () => ({ User: { findById: vi.fn() } }));
vi.mock("../models/Order", () => ({ Order: {} }));
vi.mock("../utils/sendEmail", () => ({ sendEmail: vi.fn() }));
import { Review } from "../models/Review";
import { User } from "../models/User";
import { sendEmail } from "../utils/sendEmail";
import { replyToReview } from "./reviewController";
import type { AuthRequest } from "../middleware/auth";

const reviewId = "507f1f77bcf86cd799439012";
const customerId = "507f1f77bcf86cd799439013";
const productId = "507f1f77bcf86cd799439014";
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
function response() { return { status: vi.fn().mockReturnThis(), json: vi.fn() }; }
const request = (text: string) => ({ userId: "507f1f77bcf86cd799439011", params: { reviewId }, body: { text }, method: "PUT" }) as unknown as AuthRequest;

function setup(previousReply?: string) {
  vi.mocked(User.findById).mockImplementation(((id: string) => ({
    select: () => Promise.resolve(id === customerId ? { name: "Karim", email: "karim@example.com" } : { _id: id, name: "Store" }),
  })) as never);
  vi.mocked(Review.findByIdAndUpdate).mockResolvedValue({ _id: reviewId, reply: previousReply ? { text: previousReply } : undefined } as never);
  vi.mocked(Review.findById).mockReturnValue({
    populate: () => Promise.resolve({ _id: reviewId, user: customerId, product: { _id: productId, name: "Mango <Box>" }, reply: { text: "Thank you!\nSee you again" } }),
  } as never);
}

beforeEach(() => vi.resetAllMocks());

describe("replyToReview email", () => {
  it("emails the reviewer on the first reply", async () => {
    setup();
    const res = response();
    await replyToReview(request("Thank you!\nSee you again"), res as unknown as Response);
    await flush();
    expect(res.json).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const mail = vi.mocked(sendEmail).mock.calls[0][0];
    expect(mail.to).toBe("karim@example.com");
    expect(mail.html).toContain("Mango &lt;Box&gt;");
    expect(mail.html).toContain("Thank you!<br>See you again");
    expect(mail.text).toContain(`/shop/${productId}`);
  });

  it("doesn't re-email when an existing reply is edited", async () => {
    setup("Old reply");
    await replyToReview(request("Edited"), response() as unknown as Response);
    await flush();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("still answers 404 for a missing review", async () => {
    setup();
    vi.mocked(Review.findByIdAndUpdate).mockResolvedValue(null as never);
    const res = response();
    await replyToReview(request("Hi"), res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
