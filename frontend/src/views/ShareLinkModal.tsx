import { Mail, MessageSquareText, LucideIcon } from "lucide-react";
import { FaWhatsapp, FaFacebookMessenger, FaTelegram, FaXTwitter } from "react-icons/fa6";
import { IconType } from "react-icons";
import { Modal } from "@/components/ui/Modal";
import { useTranslations } from "@/controllers/useTranslations";
import { openWhatsAppDirect } from "@/lib/whatsapp";
import { messengerHref, openMessengerDirect } from "@/lib/messenger";

interface ShareOption {
  id: string;
  label: string;
  Icon: LucideIcon | IconType;
  color: string;
  buildHref: (url: string, text: string) => string;
}

const SHARE_OPTIONS: ShareOption[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    Icon: FaWhatsapp,
    color: "#25D366",
    buildHref: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
  {
    // Sends in a chat, not a timeline post — see lib/messenger.ts.
    id: "messenger",
    label: "Messenger",
    Icon: FaFacebookMessenger,
    color: "#0084FF",
    buildHref: (url) => messengerHref(url),
  },
  {
    id: "telegram",
    label: "Telegram",
    Icon: FaTelegram,
    color: "#26A5E4",
    buildHref: (url, text) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: "x",
    label: "X (Twitter)",
    Icon: FaXTwitter,
    color: "#000000",
    buildHref: (url, text) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: "sms",
    label: "SMS",
    Icon: MessageSquareText,
    color: "#6b7280",
    buildHref: (url, text) => `sms:?&body=${encodeURIComponent(`${text} ${url}`)}`,
  },
  {
    id: "email",
    label: "Email",
    Icon: Mail,
    color: "#6b7280",
    buildHref: (url, text) =>
      `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`,
  },
];

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  /** Short message sent alongside the link, e.g. "Please pay for my order". */
  text: string;
}

export function ShareLinkModal({ isOpen, onClose, url, text }: ShareLinkModalProps) {
  const { t } = useTranslations();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("common.shareThisLink", "Share this link")} widthClassName="max-w-sm">
      <div className="grid grid-cols-3 gap-3">
        {SHARE_OPTIONS.map(({ id, label, Icon, color, buildHref }) => (
          <a
            key={id}
            href={buildHref(url, text)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              if (id === "messenger") {
                openMessengerDirect(event, url, t("common.linkCopiedPasteInChat", "Link copied — paste it in a chat"));
              } else {
                openWhatsAppDirect(event);
              }
              onClose();
            }}
            className="flex flex-col items-center gap-1.5 rounded-md border border-border p-3 text-center hover:bg-background"
          >
            <Icon size={22} style={{ color }} />
            <span className="text-xs font-medium">{label}</span>
          </a>
        ))}
      </div>
    </Modal>
  );
}
