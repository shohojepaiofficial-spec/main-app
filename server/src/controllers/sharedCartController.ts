import { Response, Request } from "express";
import { SharedCart } from "../models/SharedCart";
import { Product } from "../models/Product";
import { AuthRequest } from "../middleware/auth";

interface CartItemInput {
  productId: string;
  quantity: number;
}

// Protected — only a signed-in customer can start an "ask someone else to
// pay" link (matches everywhere else in the app that requires login before
// touching money/orders).
export const createSharedCart = async (req: AuthRequest, res: Response) => {
  const { items } = req.body as { items?: CartItemInput[] };
  if (!items || items.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  const sharedCart = await SharedCart.create({
    items: items.map((i) => ({ product: i.productId, quantity: i.quantity })),
    createdBy: req.userId,
  });

  res.status(201).json({ id: sharedCart.id });
};

// Public — whoever receives the link needs to see what's being asked of
// them before deciding to log in and pay for it.
export const getSharedCart = async (req: Request, res: Response) => {
  const sharedCart = await SharedCart.findById(req.params.id).populate("createdBy", "name");
  if (!sharedCart) return res.status(404).json({ message: "This link is no longer valid" });

  const productIds = sharedCart.items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productById = new Map(products.map((p) => [p.id as string, p]));

  const items = sharedCart.items
    .map((item) => {
      const product = productById.get(item.product.toString());
      if (!product) return null;
      return {
        productId: product.id as string,
        name: product.name,
        image: product.images[0],
        price: product.price,
        quantity: item.quantity,
        deliveryFeeInsideCity: product.deliveryFeeInsideCity,
        deliveryFeeOutsideCity: product.deliveryFeeOutsideCity,
      };
    })
    .filter((i): i is NonNullable<typeof i> => i !== null);

  const createdBy = sharedCart.createdBy as unknown as { name: string } | null;

  res.json({
    id: sharedCart.id,
    items,
    createdByName: createdBy?.name ?? "Someone",
    isFulfilled: !!sharedCart.fulfilledOrder,
  });
};
