// Upserts every entry in data/translationSeed.ts into the Translation
// collection — run after adding new <T k="..."> / t("...") call sites in
// the frontend. Safe to re-run any time: only ever creates a missing key or
// refreshes an existing key's `en` reference text; never touches `bn` on a
// key that already exists, so an admin's edit from /admin/translations is
// never clobbered by a re-sync.
//
// Usage: npm run sync-translations
//        npm run sync-translations -- --force   (also overwrites bn with
//          the seed's value — only for fixing up the initial seed text
//          itself before real admin edits exist; never use this once the
//          dashboard has actually been used to customize anything)
import "dotenv/config";
import mongoose from "mongoose";
import { Translation } from "../models/Translation";
import { translationSeed } from "../data/translationSeed";

const run = async () => {
  const force = process.argv.includes("--force");

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);

  let created = 0;
  let refreshed = 0;
  for (const { key, en, bn } of translationSeed) {
    const result = await Translation.updateOne(
      { key },
      force ? { $set: { en, bn } } : { $set: { en }, $setOnInsert: { key, bn } },
      { upsert: true }
    );
    if (result.upsertedCount > 0) created++;
    else refreshed++;
  }

  console.log(
    `Translations synced${force ? " (--force: bn overwritten too)" : ""}: ${created} created, ${refreshed} already existed.`
  );
  await mongoose.disconnect();
};

run();
