import { Schema, model, Document } from "mongoose";

export interface PopupButton {
  label: string;
  href: string;
}

// The one storefront popup (an announcement shown to visitors). There is only
// ever one document, found by `key: "site"`.
export interface ISitePopup extends Document {
  key: "site";
  isActive: boolean;
  title: string;
  message: string;
  // A relative /uploads path, same convention as Banner images.
  image?: string;
  button?: PopupButton;
  // Goes up whenever what visitors see changes. A visitor's "closed" choice is
  // remembered against this number, so a new message shows to everyone again.
  version: number;
}

const buttonSchema = new Schema<PopupButton>(
  {
    label: { type: String, required: true, trim: true, maxlength: 80 },
    href: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const sitePopupSchema = new Schema<ISitePopup>(
  {
    key: { type: String, enum: ["site"], default: "site", unique: true },
    isActive: { type: Boolean, default: false },
    title: { type: String, default: "", trim: true, maxlength: 120 },
    message: { type: String, default: "", trim: true, maxlength: 1000 },
    image: { type: String },
    button: { type: buttonSchema },
    version: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const SitePopup = model<ISitePopup>("SitePopup", sitePopupSchema);
