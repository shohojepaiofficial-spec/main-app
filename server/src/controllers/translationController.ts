import { Request, Response } from "express";
import { Translation } from "../models/Translation";
import { AuthRequest } from "../middleware/auth";

// Public — the storefront's client-side translation dictionary. Only ever
// fetched when the visitor has switched to Bangla (see frontend's
// useTranslations hook); English never hits this endpoint at all, since the
// hardcoded fallback text already sitting in each <T>/t() call site *is*
// the English copy. Falls back to `en` per-key so a not-yet-translated
// string still shows something instead of going blank.
export const getPublicTranslations = async (_req: Request, res: Response) => {
  const rows = await Translation.find().select("key en bn");
  const dictionary: Record<string, string> = {};
  for (const row of rows) {
    dictionary[row.key] = row.bn?.trim() ? row.bn : row.en;
  }
  res.json(dictionary);
};

// Admin (translations:manage) — the full list, both languages, for
// /admin/translations. `en` is shown for reference only (it's what's
// actually hardcoded in the component as the fallback); only `bn` is
// editable here.
export const getAllTranslations = async (_req: AuthRequest, res: Response) => {
  const rows = await Translation.find().sort({ key: 1 });
  res.json(rows);
};

// Admin (translations:manage) — only ever updates `bn` on a key that
// already exists (keys themselves come from code via the sync script, not
// from this UI — creating a key here with nothing in code referencing it
// wouldn't do anything). 404s on an unknown key rather than silently
// creating one, so a typo'd key doesn't quietly vanish into an unused row.
export const updateTranslation = async (req: AuthRequest, res: Response) => {
  const { bn } = req.body as { bn?: string };
  if (typeof bn !== "string") {
    return res.status(400).json({ message: "bn is required" });
  }

  const updated = await Translation.findOneAndUpdate(
    { key: req.params.key },
    { bn },
    { new: true }
  );
  if (!updated) return res.status(404).json({ message: "Unknown translation key" });

  res.json(updated);
};
