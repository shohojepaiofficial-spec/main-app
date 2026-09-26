// Used wherever a public/unauthenticated submitter's text ends up inside an
// HTML email or page — the contact form is the clearest case: its
// name/subject/message are attacker-controlled and, before this, went
// straight into the notification email's `html` field as a raw template
// string. Anyone submitting the form could embed arbitrary markup (a fake
// "from" block, a tracking pixel, a phishing link styled to look legitimate)
// into the email the store owner actually opens. Plain-text email bodies and
// values already scoped to a trusted admin/coadmin don't need this.
const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}
