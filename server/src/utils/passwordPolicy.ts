export function validNewPassword(value: string) {
  return [...value].length >= 12 && Buffer.byteLength(value, "utf8") <= 72;
}
export const PASSWORD_POLICY_MESSAGE = "Use at least 12 characters and at most 72 UTF-8 bytes";
