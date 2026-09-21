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
import translationRoutes from "./routes/translationRoutes";
import { notFound, errorHandler } from "./middleware/errorHandler";
import { STORE_CITY } from "./utils/store";

const app = express();

// Railway (and effectively every PaaS host) sits the app behind exactly one
// reverse proxy, which adds an `X-Forwarded-For` header for the real client
// IP. Express doesn't trust that header at all by default, and without this,
// express-rate-limit's own safety check (added to stop a real spoofing risk:
// blindly trusting X-Forwarded-For with no trust-proxy setting lets a client
// fake its rate-limit key) throws `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` on
// every request through a rate-limited route (confirmed live in Railway's
// logs — every contact-form/auth-endpoint hit was logging this). Worth
// fixing regardless of what else turns out to be wrong, since it also means
// rate limiting itself wasn't working correctly (every request was likely
// being keyed on the same fallback value instead of the real per-client IP).
// `1` (not `true`) trusts exactly one hop, matching Railway's actual
// topology, rather than trusting an arbitrarily long chain a client could
// forge additional entries onto.
app.set("trust proxy", 1);

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

// The one place STORE_CITY is defined (see ./utils/store) — the frontend
// fetches it from here instead of hardcoding its own copy, so the two never
// drift out of sync. Public: it's not sensitive, and pages that need it
// (checkout, dashboard, shipping/terms copy) aren't all behind login.
app.get("/api/config", (_req, res) => {
  res.json({ storeCity: STORE_CITY });
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
app.use("/api/translations", translationRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
