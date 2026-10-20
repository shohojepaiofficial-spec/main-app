"use client";

import { useState } from "react";
import * as authService from "@/services/authService";

export type UnsubscribeStatus = "ready" | "working" | "success" | "error";

const errorMessage = (err: unknown) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
  "This unsubscribe link is invalid or has expired.";

// /unsubscribe only acts when the customer presses the button. Email link
// scanners open every link in a message (some in a real browser), so doing
// it on page load could unsubscribe someone who never clicked.
export function useUnsubscribe(uid: string | null, token: string | null) {
  const hasLink = !!uid && !!token;
  const [status, setStatus] = useState<UnsubscribeStatus>(hasLink ? "ready" : "error");
  const [message, setMessage] = useState("");

  const unsubscribe = async () => {
    if (!uid || !token || status === "working") return;
    setStatus("working");
    try {
      await authService.unsubscribeFromMarketing(uid, token);
      setStatus("success");
    } catch (err) {
      setMessage(errorMessage(err));
      setStatus("error");
    }
  };

  return { status, message, unsubscribe };
}
