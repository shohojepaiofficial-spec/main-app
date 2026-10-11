"use client";

import { FaFacebookMessenger, FaWhatsapp } from "react-icons/fa6";
import { MESSENGER_INBOX_URL, WHATSAPP_NUMBER } from "@/lib/contact";
import { useTranslations } from "@/controllers/useTranslations";
import { useAuthController } from "@/controllers/useAuthController";

const DEFAULT_MESSAGE = "Hi! I have a question about your products.";

// Floating chat buttons, bottom-right. WhatsApp shows on every page for
// everyone; Messenger only for admin/coadmin.
export function ChatButtons() {
  const { t } = useTranslations();
  const { user } = useAuthController();
  const isStaff = user?.role === "admin" || user?.role === "coadmin";
  const message = t("whatsapp.defaultMessage", DEFAULT_MESSAGE);
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  const buttonClass =
    "flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105";

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-3 print:hidden">
      {isStaff && (
        <a
          href={MESSENGER_INBOX_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("messenger.openInbox", "Open Messenger inbox")}
          className={`${buttonClass} bg-[#0084FF]`}
        >
          <FaFacebookMessenger size={26} />
        </a>
      )}
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("whatsapp.chatWithUs", "Chat with us on WhatsApp")}
        className={`${buttonClass} bg-[#25D366]`}
      >
        <FaWhatsapp size={28} />
      </a>
    </div>
  );
}
