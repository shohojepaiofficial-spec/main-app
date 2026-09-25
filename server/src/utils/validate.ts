// Guards against the classic NoSQL/MongoDB operator-injection class of bug:
// Express parses JSON bodies, so a field like `req.body.email` can arrive as
// an object (e.g. `{ "$gt": "" }`) instead of a string if a client sends
// one. An object is truthy, so a bare `if (!value)` check doesn't catch it —
// and passing it straight into a Mongoose filter (`User.findOne({ email })`)
// turns "look up this email" into a real query operator that can match an
// arbitrary document instead of matching nothing. Every field that ends up
// in a Mongo filter, a hash/compare call, or a JWT verify needs this, not
// just a truthiness check. See docs/PROGRESS.md's "NoSQL injection hardening"
// entry for how this was found.
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
