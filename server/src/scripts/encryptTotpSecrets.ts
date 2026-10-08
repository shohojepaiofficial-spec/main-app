import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { User } from "../models/User";
import { decryptSecret, encryptSecret } from "../utils/secretEncryption";

async function main() {
  // Validate key configuration before connecting or modifying any record.
  encryptSecret("configuration-check");
  await connectDB();
  let updated = 0;
  try {
    const users = User.find({ $or: [{ "twoFactor.secret": { $exists: true } }, { "twoFactor.pendingSecret": { $exists: true } }] }).select("+twoFactor.secret +twoFactor.pendingSecret").cursor();
    for await (const user of users) {
      for (const field of ["secret", "pendingSecret"] as const) {
        const value = user.twoFactor[field];
        if (!value) continue;
        // New ciphertext changes pending factor hashes: invalidate pending setups
        // during migration/rotation instead of allowing stale confirmations.
        const filter = { _id: user._id, [`twoFactor.${field}`]: value };
        const change = field === "secret" ? { $set: { "twoFactor.secret": encryptSecret(decryptSecret(value)) }, $unset: { "twoFactor.pendingSecret": 1, "twoFactor.pendingExpires": 1, "twoFactor.pendingSessionHash": 1, "twoFactor.pendingFactorHash": 1 } }
          : { $unset: { "twoFactor.pendingSecret": 1, "twoFactor.pendingExpires": 1, "twoFactor.pendingSessionHash": 1, "twoFactor.pendingFactorHash": 1 } };
        const result = await User.updateOne(filter, change);
        updated += result.modifiedCount;
      }
    }
    console.log(`Updated ${updated} factor records; no secrets logged.`);
  } finally { await mongoose.disconnect(); }
}
main().catch(() => { console.error("TOTP migration failed; check configuration and database access"); process.exitCode = 1; });
