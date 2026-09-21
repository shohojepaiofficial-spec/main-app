"use client";

import { FaWhatsapp } from "react-icons/fa6";
import { WHATSAPP_NUMBER } from "@/lib/contact";
import { useTranslations } from "@/controllers/useTranslations";

const DEFAULT_MESSAGE = "Hi! I have a question about your products.";

export function WhatsAppButton() {
  const { t } = useTranslations();
  const message = t("whatsapp.defaultMessage", DEFAULT_MESSAGE);
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("whatsapp.chatWithUs", "Chat with us on WhatsApp")}
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
    >
      <FaWhatsapp size={28} />
    </a>
  );
}
