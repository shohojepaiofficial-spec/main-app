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
import reviewRoutes from "./routes/reviewRoutes";
import statsRoutes from "./routes/statsRoutes";
import { notFound, errorHandler, twoFactorUnavailableResponse } from "./middleware/errorHandler";
import { STORE_CITY } from "./utils/store";
import { liveOnlinePaymentMethods } from "./utils/paymentMethods";
import { apiLimiter } from "./middleware/rateLimit";
import { requestValidation, boundMultipart } from "./middleware/requestValidation";

const app = express();

// Trust only explicitly configured ingress addresses. The frontend proxy
// signs Vercel-verified client IPs separately for application rate limits.
const trustedProxies = process.env.TRUSTED_PROXIES?.split(",").map(value => value.trim()).filter(Boolean);
app.set("trust proxy", trustedProxies?.length ? trustedProxies : false);

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
app.use("/api", apiLimiter);
app.use(express.json({ limit: "128kb" }));
app.use(requestValidation);
app.use(boundMultipart);
app.use(cookieParser());
app.use(morgan((tokens, req, res) => `${tokens.method(req, res)} ${(req as express.Request).path} ${tokens.status(req, res)} ${tokens["response-time"](req, res)} ms`));
app.use((_req, res, next) => {
  const json = res.json.bind(res);
  res.json = body => {
    if (res.statusCode < 500) return json(body);
    // Reconstruct this one known public error instead of passing arbitrary
    // 5xx bodies through. Other controller/provider errors stay redacted.
    return json(res.statusCode === 503 && body?.code === twoFactorUnavailableResponse.code
      ? twoFactorUnavailableResponse
      : { message: "Service unavailable. Please try again." });
  };
  next();
});
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// The one place STORE_CITY is defined (see ./utils/store) — the frontend
// fetches it from here instead of hardcoding its own copy, so the two never
// drift out of sync. Public: it's not sensitive, and pages that need it
// (checkout, dashboard, shipping/terms copy) aren't all behind login.
// `paymentMethods` is what checkout may offer — see utils/paymentMethods.
app.get("/api/config", (_req, res) => {
  res.json({ storeCity: STORE_CITY, paymentMethods: liveOnlinePaymentMethods() });
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
app.use("/api/reviews", reviewRoutes);
app.use("/api/stats", statsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
