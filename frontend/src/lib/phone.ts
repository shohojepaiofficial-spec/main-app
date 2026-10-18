// Bangladeshi mobile numbers are stored as entered at checkout (usually
// "01xxxxxxxxx") — wa.me links need the digits-only, country-code form
// instead ("8801xxxxxxxxx"), same convention as WHATSAPP_NUMBER in
// lib/contact.ts.
export function toWhatsAppLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.startsWith("880") ? digits : `880${digits.replace(/^0/, "")}`;
  return `https://wa.me/${withCountryCode}`;
}

export function toTelLink(phone: string): string {
  return `tel:${phone.replace(/\s/g, "")}`;
}

// Mirrors the server's checkout rule (server/src/utils/phone.ts): any
// spelling of a Bangladeshi mobile number — "01712-345678", "+8801712345678".
export function isBdMobile(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("880") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  return /^1[3-9]\d{8}$/.test(local);
}
export const BD_MOBILE_MESSAGE = "Enter a valid Bangladeshi mobile number, like 01712345678";
