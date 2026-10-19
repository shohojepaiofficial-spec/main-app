import type { MouseEvent } from "react";
import toast from "react-hot-toast";

// Facebook's sharer.php always opens "post to your timeline". To send a link
// in a chat instead: phones open the Messenger app's share sheet (pick a
// chat), falling back to messenger.com if the app isn't installed; computers
// use Facebook's Send dialog when NEXT_PUBLIC_FACEBOOK_APP_ID is set, else
// copy the link and open messenger.com to paste it into a chat.
const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

export function messengerHref(url: string) {
  if (FACEBOOK_APP_ID) {
    const params = new URLSearchParams({ app_id: FACEBOOK_APP_ID, link: url, redirect_uri: url });
    return `https://www.facebook.com/dialog/send?${params}`;
  }
  return "https://www.messenger.com/";
}

export function openMessengerDirect(event: MouseEvent<HTMLAnchorElement>, url: string, copiedMessage: string) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    event.preventDefault();
    const fallback = event.currentTarget.href;
    const timer = setTimeout(() => {
      if (document.visibilityState === "visible") window.location.href = fallback;
    }, 1500);
    document.addEventListener("visibilitychange", () => clearTimeout(timer), { once: true });
    window.location.href = `fb-messenger://share?link=${encodeURIComponent(url)}`;
    return;
  }

  // Desktop without an app id: the anchor still opens messenger.com; put the
  // link on the clipboard so it can be pasted into any chat.
  if (!FACEBOOK_APP_ID) {
    navigator.clipboard?.writeText(url).then(() => toast.success(copiedMessage)).catch(() => {});
  }
}
