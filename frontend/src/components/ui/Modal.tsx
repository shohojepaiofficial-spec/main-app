"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "@/controllers/useTranslations";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Tailwind max-width class for the drawer panel, e.g. "max-w-lg". Defaults to "max-w-sm". */
  widthClassName?: string;
  /**
   * Once anything inside has been typed/changed, a backdrop click, Escape or
   * the ✕ button asks before discarding instead of closing outright, and the
   * browser warns before leaving the page. On by default — form drawers are
   * what this is for. Turn off for drawers whose inputs aren't unsaved work
   * (e.g. the cart, whose quantities already live in a store).
   */
  guardUnsavedChanges?: boolean;
}

export function Modal({ isOpen, onClose, title, children, widthClassName, guardUnsavedChanges = true }: ModalProps) {
  const { t } = useTranslations();
  const [isMounted, setIsMounted] = useState(isOpen);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [isDirty, setIsDirty] = useState(false);
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);
  // Where the current mouse press started — see onBackdropClick.
  const pressStartedOnBackdrop = useRef(false);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setIsMounted(true);
      // Every opening starts clean — the form inside resets on close anyway.
      setIsDirty(false);
      setIsConfirmingDiscard(false);
    }
  }

  const hasUnsavedChanges = guardUnsavedChanges && isDirty;

  // Every "soft" way of closing (backdrop, Escape, ✕) goes through here, so
  // none of them can silently throw away typed work. A form's own Cancel /
  // successful Save still closes directly through its own handlers.
  const requestClose = () => {
    if (hasUnsavedChanges) setIsConfirmingDiscard(true);
    else onClose();
  };
  const requestCloseRef = useRef(requestClose);
  useEffect(() => {
    requestCloseRef.current = requestClose;
  });

  useEffect(() => {
    if (!isMounted) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // An inner widget (dropdown, date picker…) already handled this Escape.
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (isConfirmingDiscard) setIsConfirmingDiscard(false);
      else requestCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = isOpen ? "hidden" : "";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isMounted, isOpen, isConfirmingDiscard]);

  // Reloading or closing the tab would lose the same work — let the browser ask.
  useEffect(() => {
    if (!isOpen || !hasUnsavedChanges) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isOpen, hasUnsavedChanges]);

  if (!isMounted) return null;

  // Only a press that both started *and* ended on the backdrop counts as a
  // click outside. Otherwise selecting text in an input and releasing the
  // mouse past the panel's edge fires a click on the backdrop (the nearest
  // common ancestor) and closes the drawer mid-edit.
  const onBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && pressStartedOnBackdrop.current) requestClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-colors duration-300 ${
        isOpen ? "bg-black/40" : "bg-transparent"
      }`}
      onMouseDown={(e) => {
        pressStartedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={onBackdropClick}
      role="presentation"
    >
      <div
        className={`relative h-full w-full ${widthClassName ?? "max-w-sm"} bg-surface text-foreground shadow-xl p-6 overflow-y-auto transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        // Any typing, picking or file choice inside counts as unsaved work.
        onInput={() => setIsDirty(true)}
        onChange={() => setIsDirty(true)}
        onTransitionEnd={() => {
          if (!isOpen) setIsMounted(false);
        }}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={requestClose}
          aria-label={t("common.close", "Close")}
          className="absolute right-4 top-4 text-muted hover:text-foreground"
        >
          <X size={20} />
        </button>
        {title && <h2 className="text-lg font-medium mb-4">{title}</h2>}

        {isConfirmingDiscard && (
          <div
            role="alertdialog"
            aria-live="assertive"
            className="sticky top-0 z-10 -mx-2 mb-4 rounded-md border border-primary/40 bg-surface p-3 text-sm text-foreground shadow-md ring-4 ring-primary/10"
          >
            <p className="font-medium">{t("modal.unsavedTitle", "Discard your changes?")}</p>
            <p className="mt-1 text-xs text-muted">
              {t("modal.unsavedBody", "You've entered information that hasn't been saved yet.")}
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setIsConfirmingDiscard(false)}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
              >
                {t("modal.keepEditing", "Keep editing")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingDiscard(false);
                  onClose();
                }}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-primary/5"
              >
                {t("modal.discard", "Discard")}
              </button>
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
