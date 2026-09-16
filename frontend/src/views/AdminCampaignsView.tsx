"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, Mail, MessageSquare, ChevronDown, CheckCircle2, XCircle } from "lucide-react";
import { useRequirePermission } from "@/controllers/useRequirePermission";
import { useAdminCampaigns } from "@/controllers/useAdminCampaigns";
import { AdminCampaignFormModal } from "@/views/AdminCampaignFormModal";
import { Campaign } from "@/models";

const SOURCE_LABEL: Record<Campaign["sourceType"], string> = {
  product: "Product",
  promotion: "Promotion",
  custom: "Custom",
};

function CampaignRow({ campaign }: { campaign: Campaign }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full flex-wrap items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            {campaign.title}
            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium uppercase text-muted ring-1 ring-border">
              {SOURCE_LABEL[campaign.sourceType]}
            </span>
          </p>
          <p className="mt-1 flex items-center gap-3 text-xs text-muted">
            {campaign.channels.includes("email") && (
              <span className="flex items-center gap-1">
                <Mail size={12} /> Email
              </span>
            )}
            {campaign.channels.includes("sms") && (
              <span className="flex items-center gap-1">
                <MessageSquare size={12} /> SMS
              </span>
            )}
          </p>
          <p className="mt-1 text-[11px] text-muted">{format(new Date(campaign.createdAt), "PPP p")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right text-xs">
            <p className="font-medium">{campaign.stats.sentCount} sent</p>
            <p className="text-muted">
              {campaign.stats.failedCount > 0 && `${campaign.stats.failedCount} failed · `}
              {campaign.stats.recipientCount} recipients
            </p>
          </div>
          <ChevronDown
            size={16}
            className={`shrink-0 text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="mt-3 border-t border-border pt-3">
          {campaign.recipients.length === 0 ? (
            <p className="text-xs text-muted">No recipients were opted in when this was sent.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {campaign.recipients.map((r, i) => (
                <div key={`${r.user}-${r.channel}-${i}`} className="flex items-center gap-2 text-xs">
                  {r.status === "sent" ? (
                    <CheckCircle2 size={13} className="shrink-0 text-green-600" />
                  ) : (
                    <XCircle size={13} className="shrink-0 text-red-600" />
                  )}
                  <span className="truncate">{r.name}</span>
                  <span className="shrink-0 rounded-full bg-background px-1.5 py-0.5 text-[10px] uppercase text-muted ring-1 ring-border">
                    {r.channel}
                  </span>
                  {r.error && <span className="truncate text-muted">— {r.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminCampaignsView() {
  const { isChecking, isAllowed } = useRequirePermission("marketing:manage");
  const { campaigns, isLoading, reload } = useAdminCampaigns();
  const [isFormOpen, setIsFormOpen] = useState(false);

  if (isChecking || !isAllowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Checking your session...
      </div>
    );
  }

  return (
    <main className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Marketing campaigns</h1>
          <p className="text-sm text-muted">
            Email or text customers who&apos;ve opted in, about a product, a promo code, or a
            custom event — sends immediately to whoever&apos;s opted into that channel.
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          <Plus size={16} /> New campaign
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading campaigns...</p>
      ) : campaigns.length === 0 ? (
        <p className="text-sm text-muted">No campaigns sent yet — create your first one.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {campaigns.map((campaign) => (
            <CampaignRow key={campaign._id} campaign={campaign} />
          ))}
        </div>
      )}

      <AdminCampaignFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onCreated={reload} />
    </main>
  );
}
