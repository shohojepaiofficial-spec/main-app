import { Schema, model } from "mongoose";
import { createHash } from "node:crypto";
import type { Options, Store } from "express-rate-limit";

const schema = new Schema({ _id: String, hits: { type: Number, required: true }, expiresAt: { type: Date, required: true } });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Counter = model("RateLimitCounter", schema);

export class MongoRateStore implements Store {
  localKeys = false;
  private windowMs = 60_000;
  constructor(readonly prefix: string) {}
  init(options: Options) { this.windowMs = options.windowMs; }
  private key(key: string) { return `${this.prefix}:${Math.floor(Date.now() / this.windowMs)}:${createHash("sha256").update(key).digest("hex")}`; }
  async increment(key: string) {
    const id = this.key(key);
    const resetTime = new Date((Math.floor(Date.now() / this.windowMs) + 1) * this.windowMs);
    let result;
    try {
      result = await Counter.findOneAndUpdate({ _id: id }, { $inc: { hits: 1 }, $setOnInsert: { expiresAt: resetTime } }, { upsert: true, new: true });
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
      result = await Counter.findOneAndUpdate({ _id: id }, { $inc: { hits: 1 } }, { new: true });
    }
    if (!result) throw new Error("Rate limit store unavailable");
    return { totalHits: result.hits, resetTime };
  }
  async decrement(key: string) { await Counter.updateOne({ _id: this.key(key), hits: { $gt: 0 } }, { $inc: { hits: -1 } }); }
  async resetKey(key: string) { await Counter.deleteOne({ _id: this.key(key) }); }
}
