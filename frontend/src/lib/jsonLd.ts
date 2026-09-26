// Every `<script type="application/ld+json" dangerouslySetInnerHTML>` block
// in this app goes through this instead of a bare `JSON.stringify(data)`.
// `JSON.stringify` doesn't escape `<`, so a value containing a literal
// `</script>` (a product name/description, currently only ever admin-
// authored, but this shouldn't rely on that staying true forever) would
// prematurely close the script tag and let whatever follows it be parsed as
// real HTML/JS — a classic script-tag-breakout XSS. `<` is valid inside
// a JSON string and is still parsed as `<` by any JSON-LD consumer, so this
// changes nothing about what search engines/crawlers actually read.
export function toJsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
