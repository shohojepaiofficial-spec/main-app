import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";
import { PERMISSIONS, Permission } from "../utils/permissions";

export type AuthProvider = "local" | "google";
export type UserRole = "user" | "coadmin" | "admin";

export interface DeliveryLocation {
  // Zila (district) and Upazila (sub-district) are chosen from a fixed list
  // (frontend's lib/bangladeshGeo.ts) rather than typed — only the final
  // destination detail (house/road/area) is free text. Whether this counts
  // as "inside" the store's city for delivery-fee purposes is derived by
  // comparing `zila` to STORE_CITY, not stored — see frontend's lib/delivery.ts.
  zila: string;
  upazila: string;
  addressLine: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  provider: AuthProvider;
  providerId?: string;
  image?: string;
  // Not required at signup — collected/edited in Settings, prefills the
  // checkout form's contact field once set.
  phone?: string;
  role: UserRole;
  // Only meaningful when role === "coadmin" — admins implicitly have every
  // permission (see middleware/auth.ts#authorize), plain users have none.
  permissions: Permission[];
  // A saved default — not tied to any specific order (Order.shippingAddress
  // is its own snapshot per order once checkout is real).
  deliveryLocation?: DeliveryLocation;
  // Saved-for-later products — see controllers/wishlistController.ts.
  wishlist: Types.ObjectId[];
  // Opt-in (never on by default) — who a promotional campaign is allowed to
  // reach. `sms` is only actually usable once `phone` is set; the UI hides/
  // disables it otherwise. See controllers/campaignController.ts.
  marketingOptIn: { email: boolean; sms: boolean };
  // OAuth accounts start verified (Google already proved the address); a
  // local email/password signup starts false and gets emailed a
  // verification link — see controllers/authController.ts.
  isEmailVerified: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationExpires?: Date;
  resetPasswordTokenHash?: string;
  resetPasswordExpires?: Date;
  // TOTP-based two-step verification — see controllers/twoFactorController.ts.
  // `secret`/`pendingSecret`/`backupCodeHashes` are all `select: false`
  // (same convention as the password-reset/email-verification token hashes
  // above): a plain `User.findById`/`findOne` never pulls them back, only
  // the explicit `.select("+twoFactor.secret")` calls that need them do.
  twoFactor: {
    enabled: boolean;
    // Set once setup starts, cleared once confirmed into `secret` below —
    // this two-step dance (generate, then only commit once the admin proves
    // they actually scanned it and can produce a valid code) is what stops
    // enabling 2FA with a secret that was never actually saved to an app,
    // which would otherwise lock the account out immediately.
    pendingSecret?: string;
    secret?: string;
    // bcrypt-hashed, single-use — see utils/twoFactor.ts#generateBackupCodes.
    backupCodeHashes?: string[];
  };
  createdAt: Date;
  comparePassword: (candidate: string) => Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: {
      type: String,
      minlength: 6,
      select: false,
      required: function (this: IUser) {
        return this.provider === "local";
      },
    },
    provider: { type: String, enum: ["local", "google"], default: "local" },
    providerId: { type: String },
    image: { type: String },
    phone: { type: String, trim: true },
    role: { type: String, enum: ["user", "coadmin", "admin"], default: "user" },
    permissions: { type: [String], enum: PERMISSIONS, default: [] },
    deliveryLocation: {
      zila: { type: String, trim: true },
      upazila: { type: String, trim: true },
      addressLine: { type: String, trim: true },
      _id: false,
    },
    wishlist: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    marketingOptIn: {
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      _id: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: function (this: IUser) {
        return this.provider !== "local";
      },
    },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    twoFactor: {
      enabled: { type: Boolean, default: false },
      pendingSecret: { type: String, select: false },
      secret: { type: String, select: false },
      backupCodeHashes: { type: [String], select: false },
      _id: false,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (candidate: string) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

export const User = model<IUser>("User", userSchema);
