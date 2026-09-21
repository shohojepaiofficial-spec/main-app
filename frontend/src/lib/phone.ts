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
