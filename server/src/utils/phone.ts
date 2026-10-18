// Bangladeshi mobile numbers in whatever form a customer typed them
// ("01712-345678", "+8801712345678", "1712345678") → "8801712345678".
// Returns null for anything that isn't a valid BD mobile number.
export function toBdMsisdn(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("880") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  return /^1[3-9]\d{8}$/.test(local) ? `880${local}` : null;
}

export const isBdMobile = (phone: string) => toBdMsisdn(phone) !== null;

// One stored spelling per number ("01712345678"), so the same phone typed
// three different ways still counts as one number (see orderStatusSms's
// per-phone cap). Anything that isn't a BD mobile is returned trimmed.
export function normalizeBdPhone(phone: string): string {
  const msisdn = toBdMsisdn(phone);
  return msisdn ? `0${msisdn.slice(3)}` : phone.trim();
}
