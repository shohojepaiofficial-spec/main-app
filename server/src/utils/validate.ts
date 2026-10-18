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

// A person's display name. It is greeted by name in every account email, so
// it must not be able to carry a link or markup into an email the store
// sends to someone else's address (sign up with a stranger's email, put a
// phishing link in the name). Emails escape it too; this keeps links out of
// the plain-text part, where mail apps turn them into clickable links.
export const NAME_MAX_LENGTH = 80;
export const NAME_RULE_MESSAGE = `Use your real name, up to ${NAME_MAX_LENGTH} characters, without links.`;
export function isValidPersonName(value: string): boolean {
  const name = value.trim();
  return name.length > 0 && name.length <= NAME_MAX_LENGTH && !/[<>]|:\/\/|www\.|\.(com|net|org|xyz|info|top|bd|io|me|link|site|online|shop)\b/i.test(name);
}

// For names that come from Google, which can't be refused: keep the safe part.
export function safePersonName(value: string, fallback: string): string {
  const name = value.replace(/[<>]/g, "").trim().slice(0, NAME_MAX_LENGTH);
  return isValidPersonName(name) ? name : fallback;
}
