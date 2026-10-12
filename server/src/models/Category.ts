import { Schema, model, Document } from "mongoose";

export interface ICategory extends Document {
  name: string;
  // Lowercased name. The unique index on it is what makes "Shoes" and
  // "shoes" one category, same as how products group by category.
  key: string;
  nameBn: string;
  image?: string;
  // Lower sorts first on the storefront. Assigned on create and swapped
  // between two categories when staff move one up/down.
  order: number;
  createdAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    key: { type: String, required: true, unique: true },
    nameBn: { type: String, default: "", trim: true, maxlength: 60 },
    image: { type: String },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Category = model<ICategory>("Category", categorySchema);
