"use client";

import { format } from "date-fns";
import { Check, X } from "lucide-react";
import { StaffTimelineStep } from "@/lib/staffOrderTimeline";

// Vertical staff timeline. Finished steps are green with a tick, the step
// waiting on staff is highlighted and carries its action (`renderAction`),
// later or skipped steps are grey.
export function StaffOrderTimeline({
  steps,
  renderAction,
}: {
  steps: StaffTimelineStep[];
  renderAction: (step: StaffTimelineStep) => React.ReactNode;
}) {
  return (
    <ol className="relative">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isCancelled = step.key === "cancelled";
        const dot =
          step.state === "done"
            ? isCancelled ? "bg-red-600 text-white" : "bg-primary text-primary-foreground"
            : step.state === "current"
              ? "bg-surface text-primary ring-4 ring-primary/25 border-2 border-primary"
              : "bg-background text-muted border border-border";
        const line = step.state === "done" && !isLast && steps[index + 1]?.state === "done" ? "bg-primary" : "bg-border";

        return (
          <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && <span aria-hidden className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${line}`} />}
            <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${dot}`}>
              {step.state === "done" ? (isCancelled ? <X size={16} /> : <Check size={16} />) : step.state === "current" ? (
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
              ) : (
                index + 1
              )}
            </span>
            <div className={`min-w-0 flex-1 pt-1 ${step.state === "upcoming" || step.state === "skipped" ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className={`text-sm font-semibold ${step.state === "current" ? "text-primary" : ""}`}>
                  {step.label}
                  {step.state === "current" && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase">Next</span>}
                  {step.state === "skipped" && <span className="ml-2 text-xs font-normal text-muted">Not reached</span>}
                </p>
                {step.at && (
                  <p className="text-xs text-muted">
                    {format(new Date(step.at), "d MMM yyyy, h:mm a")}
                    {step.by && <> &middot; by {step.by}</>}
                  </p>
                )}
              </div>
              {step.state !== "skipped" && <p className="mt-0.5 text-xs text-muted">{step.task}</p>}
              {step.state === "current" && <div className="mt-3">{renderAction(step)}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
