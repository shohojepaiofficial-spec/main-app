// Public UI metadata, never a credential accepted by the API. Deliberately
// omit the JWT signature; the browser uses expiry/id only for coordination.
export function browserSessionMarker(token: string) {
  return `ui.${token.split(".")[1] ?? ""}.not-a-credential`;
}
