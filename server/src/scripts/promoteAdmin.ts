// One-off bootstrap: promote an existing account to "admin" by email.
// Needed once, since there's no other way to create the first admin —
// every account starts as "role: user" and only an admin can change roles.
//
// Usage: npm run promote-admin -- someone@example.com
import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/User";

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

  // There is only ever one admin — this transfers the role rather than
  // adding a second one, so the invariant holds no matter how this script
  // gets run.
  const previousAdmins = await User.find({ role: "admin", _id: { $ne: target.id } });
  for (const previous of previousAdmins) {
    previous.role = "user";
    previous.permissions = [];
    await previous.save();
    console.log(`${previous.email} is no longer admin.`);
  }

  target.role = "admin";
  target.permissions = [];
  await target.save();
  console.log(`${target.email} is now the admin.`);

  await mongoose.disconnect();
};

run();
