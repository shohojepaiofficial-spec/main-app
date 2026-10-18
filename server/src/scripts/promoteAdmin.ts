// One-off bootstrap: promote an existing account to "admin" by email.
// Needed once, since there's no other way to create the first admin —
// every account starts as "role: user" and only an admin can change roles.
//
// Usage: npm run promote-admin -- someone@example.com
import "dotenv/config";
import mongoose from "mongoose";
import { MAX_ADMINS, User } from "../models/User";

const run = async () => {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run promote-admin -- <email>");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);

  const target = await User.findOne({ email: email.toLowerCase() });
  if (!target) {
    console.error(`No user found with email ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // Never more than MAX_ADMINS admins — refuse rather than silently demote
  // someone. Demote an admin from /admin/users first if the limit is reached.
  if (target.role !== "admin") {
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount >= MAX_ADMINS) {
      console.error(`There are already ${adminCount} admins (max ${MAX_ADMINS}). Demote one first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
  }

  target.role = "admin";
  target.permissions = [];
  await target.save();
  console.log(`${target.email} is now an admin.`);

  await mongoose.disconnect();
};

run();
