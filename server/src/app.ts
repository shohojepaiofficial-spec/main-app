import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import orderRoutes from "./routes/orderRoutes";
import userRoutes from "./routes/userRoutes";
import bannerRoutes from "./routes/bannerRoutes";
import promoCodeRoutes from "./routes/promoCodeRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import contactRoutes from "./routes/contactRoutes";
import wishlistRoutes from "./routes/wishlistRoutes";
import sharedCartRoutes from "./routes/sharedCartRoutes";
import adRoutes from "./routes/adRoutes";
import campaignRoutes from "./routes/campaignRoutes";
import { notFound, errorHandler } from "./middleware/errorHandler";

const app = express();

// `contentSecurityPolicy: false` — this is a JSON API plus a static
// /uploads folder, not an HTML-serving app, so a CSP tuned for pages isn't
// meaningful here and risks blocking something unexpectedly. `crossOriginResourcePolicy`
// is relaxed to "cross-origin" because product/banner images under /uploads
// are loaded by the frontend from a different origin (its own domain, not
// this server's) — helmet's default "same-origin" would otherwise make the
// browser refuse to render them.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/promo-codes", promoCodeRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/shared-carts", sharedCartRoutes);
app.use("/api/ads", adRoutes);
app.use("/api/campaigns", campaignRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
