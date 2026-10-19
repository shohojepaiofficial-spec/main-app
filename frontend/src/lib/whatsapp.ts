import type { MouseEvent } from "react";

// wa.me links first show WhatsApp's "Continue to chat" page (and on a
// computer, an app-or-web choice). This click handler skips it: phones open
// the WhatsApp app straight into the chat, falling back to the wa.me page if
// the app isn't installed; computers open WhatsApp Web on the chat. The
// anchor keeps its wa.me href, so without JS (or on middle-click) the normal
// link still works.
export function openWhatsAppDirect(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const href = event.currentTarget.href;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return;
  }
  if (url.hostname !== "wa.me") return;
  const phone = url.pathname.replace(/\D/g, "");
  const text = url.searchParams.get("text") ?? "";
  const query = new URLSearchParams({ ...(phone ? { phone } : {}), ...(text ? { text } : {}) }).toString();

  event.preventDefault();
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    // If the app opened, the page is hidden by now; otherwise use wa.me.
    const fallback = setTimeout(() => {
      if (document.visibilityState === "visible") window.location.href = href;
    }, 1500);
    document.addEventListener("visibilitychange", () => clearTimeout(fallback), { once: true });
    window.location.href = `whatsapp://send?${query}`;
  } else {
    window.open(`https://web.whatsapp.com/send?${query}`, "_blank", "noopener,noreferrer");
  }
}
