"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "@/controllers/useTranslations";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Tailwind max-width class for the drawer panel, e.g. "max-w-lg". Defaults to "max-w-sm". */
  widthClassName?: string;
}

export function Modal({ isOpen, onClose, title, children, widthClassName }: ModalProps) {
  const { t } = useTranslations();
  const [isMounted, setIsMounted] = useState(isOpen);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) setIsMounted(true);
  }

  useEffect(() => {
    if (!isMounted) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = isOpen ? "hidden" : "";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isMounted, isOpen, onClose]);

  if (!isMounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-colors duration-300 ${
        isOpen ? "bg-black/40" : "bg-transparent"
      }`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`relative h-full w-full ${widthClassName ?? "max-w-sm"} bg-surface text-foreground shadow-xl p-6 overflow-y-auto transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
        onTransitionEnd={() => {
          if (!isOpen) setIsMounted(false);
        }}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          aria-label={t("common.close", "Close")}
          className="absolute right-4 top-4 text-muted hover:text-foreground"
        >
          <X size={20} />
        </button>
        {title && <h2 className="text-lg font-medium mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
