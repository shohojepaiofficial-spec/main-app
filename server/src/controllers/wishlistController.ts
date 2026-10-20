import { validateControllerInput } from "../middleware/controllerInput";
import { Response } from "express";
import { Types } from "mongoose";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { AuthRequest } from "../middleware/auth";

export const getWishlist = async (req: AuthRequest, res: Response) => {
  validateControllerInput("getWishlist", req);
  const user = await User.findById(req.userId).populate("wishlist");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user.wishlist);
};

// Far more than anyone saves by hand; stops a script growing one account's
// document without limit (SEC-24).
export const MAX_WISHLIST_ITEMS = 200;

export const addToWishlist = async (req: AuthRequest, res: Response) => {
  validateControllerInput("addToWishlist", req);
  const productId = new Types.ObjectId(req.params.productId as string);
  if (!(await Product.exists({ _id: productId }))) return res.status(404).json({ message: "Product not found" });

  // One atomic update: add only if missing and the list isn't full.
  const added = await User.updateOne(
    { _id: req.userId, wishlist: { $ne: productId }, [`wishlist.${MAX_WISHLIST_ITEMS - 1}`]: { $exists: false } },
    { $addToSet: { wishlist: productId } },
  );
  if (!added.matchedCount) {
    const user = await User.findById(req.userId).select("wishlist");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.wishlist.some((id) => id.equals(productId))) {
      return res.status(409).json({ message: `Your wishlist is full (${MAX_WISHLIST_ITEMS} items). Remove something to add this.` });
    }
  }

  res.status(201).json({ ok: true });
};

export const removeFromWishlist = async (req: AuthRequest, res: Response) => {
  validateControllerInput("removeFromWishlist", req);
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.wishlist = user.wishlist.filter((id) => id.toString() !== req.params.productId);
  await user.save();

  res.json({ ok: true });
};
