import { Response } from "express";
import { Types } from "mongoose";
import { User } from "../models/User";
import { AuthRequest } from "../middleware/auth";

export const getWishlist = async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId).populate("wishlist");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user.wishlist);
};

export const addToWishlist = async (req: AuthRequest, res: Response) => {
  const productId = req.params.productId as string;
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  const alreadySaved = user.wishlist.some((id) => id.toString() === productId);
  if (!alreadySaved) {
    user.wishlist.push(new Types.ObjectId(productId));
    await user.save();
  }

  res.status(201).json({ ok: true });
};

export const removeFromWishlist = async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.wishlist = user.wishlist.filter((id) => id.toString() !== req.params.productId);
  await user.save();

  res.json({ ok: true });
};
