"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { FaFacebookMessenger, FaWhatsapp } from "react-icons/fa6";
import { MESSENGER_CHAT_URL, MESSENGER_INBOX_URL, WHATSAPP_NUMBER } from "@/lib/contact";
import { useTranslations } from "@/controllers/useTranslations";
import { useAuthController } from "@/controllers/useAuthController";

const DEFAULT_MESSAGE = "Hi! I have a question about your products.";
const MENU_ID = "chat-options";

// One floating chat button, bottom-right, on every page for everyone. It
// opens a small menu with WhatsApp and Messenger. Messenger starts a chat
// with the Page, except for admin/coadmin, who get the Page's inbox instead
// so they can reply.
export function ChatButtons() {
  const { t } = useTranslations();
  const { user } = useAuthController();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isStaff = user?.role === "admin" || user?.role === "coadmin";
  const message = t("whatsapp.defaultMessage", DEFAULT_MESSAGE);
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const optionClass =
    "flex items-center gap-3 rounded-full py-2 pl-2 pr-4 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105";

  return (
    <div ref={containerRef} className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 print:hidden">
      {isOpen && (
        <ul id={MENU_ID} className="flex flex-col items-end gap-2">
          <li>
            <a
              href={isStaff ? MESSENGER_INBOX_URL : MESSENGER_CHAT_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              aria-label={
                isStaff
                  ? t("messenger.openInbox", "Open Messenger inbox")
                  : t("messenger.chatWithUs", "Chat with us on Messenger")
              }
              className={`${optionClass} bg-[#0084FF]`}
            >
              <FaFacebookMessenger size={24} aria-hidden />
              {t("chat.messenger", "Messenger")}
            </a>
          </li>
          <li>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              aria-label={t("whatsapp.chatWithUs", "Chat with us on WhatsApp")}
              className={`${optionClass} bg-[#25D366]`}
            >
              <FaWhatsapp size={24} aria-hidden />
              {t("chat.whatsapp", "WhatsApp")}
            </a>
          </li>
        </ul>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={MENU_ID}
        aria-label={isOpen ? t("chat.close", "Close chat options") : t("chat.open", "Chat with us")}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        {isOpen ? <X size={26} aria-hidden /> : <MessageCircle size={28} aria-hidden />}
      </button>
    </div>
  );
}
