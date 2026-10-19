"use client";

import { Timer } from "lucide-react";
import { useCountdown } from "@/controllers/useCountdown";
import { useTranslations } from "@/controllers/useTranslations";

// "2d 5h left to return" next to a delivered order's Return button. Renders
// nothing before mount and once the window has closed.
export function ReturnCountdown({ endsAt, className = "" }: { endsAt: string; className?: string }) {
  const left = useCountdown(endsAt);
  const { t } = useTranslations();
  if (!left) return null;

  const time = left.days > 0
    ? t("returns.countdownDays", "{days}d {hours}h", { days: left.days, hours: left.hours })
    : t("returns.countdownHours", "{hours}h {minutes}m", { hours: left.hours, minutes: left.minutes });
  const urgent = left.msLeft < 24 * 60 * 60 * 1000;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${urgent ? "text-red-600" : "text-muted"} ${className}`}
      title={new Date(endsAt).toLocaleString()}
    >
      <Timer size={13} aria-hidden="true" />
      {t("returns.countdownLeft", "{time} left to return", { time })}
    </span>
  );
}
