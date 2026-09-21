import { Schema, model, Document } from "mongoose";

// One row per translatable string on the storefront (not the admin panel —
// that stays English-only). `key` is a stable dotted identifier
// (`nav.home`, `checkout.placeOrder`) that frontend code references via
// `<T k="...">English fallback</T>` or `t("...", "English fallback")` — see
// docs/ARCHITECTURE.md's "Translations (i18n)" section. `en` is seeded from
// that same fallback text (kept here mainly so the admin dashboard has
// something to translate against, not read at render time — the component
// tree's own hardcoded fallback is what actually renders for English, so a
// stale `en` here is a cosmetic mismatch, never a functional bug). `bn` is
// what the admin dashboard (translations:manage) actually edits; blank
// means "not translated yet" — the public API falls back to `en` for it.
export interface ITranslation extends Document {
  key: string;
  en: string;
  bn: string;
  createdAt: Date;
  updatedAt: Date;
}

const translationSchema = new Schema<ITranslation>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    en: { type: String, required: true },
    bn: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Translation = model<ITranslation>("Translation", translationSchema);
