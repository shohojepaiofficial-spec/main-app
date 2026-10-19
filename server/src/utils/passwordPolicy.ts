// 72 bytes is bcrypt's limit (it silently ignores anything past it). Bytes,
// not characters, so a Bangla password hits it sooner — customers only ever
// see "too long", never the word "bytes".
export const PASSWORD_TOO_SHORT_MESSAGE = "Password must be at least 12 characters";
export const PASSWORD_TOO_LONG_MESSAGE = "Password is too long — please use a shorter one";

export function passwordPolicyError(value: string): string | null {
  if ([...value].length < 12) return PASSWORD_TOO_SHORT_MESSAGE;
  if (Buffer.byteLength(value, "utf8") > 72) return PASSWORD_TOO_LONG_MESSAGE;
  return null;
}

export function validNewPassword(value: string) {
  return passwordPolicyError(value) === null;
}
