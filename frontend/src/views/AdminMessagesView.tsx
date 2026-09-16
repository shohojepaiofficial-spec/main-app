"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Mail, MailOpen, Trash2 } from "lucide-react";
import { useRequirePermission } from "@/controllers/useRequirePermission";
import { useAdminMessages } from "@/controllers/useAdminMessages";
import { confirmDialog } from "@/lib/confirm";
import { ContactMessage } from "@/models";

function MessageRow({
  message,
  onToggleRead,
  onDelete,
}: {
  message: ContactMessage;
  onToggleRead: () => void;
  onDelete: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const onOpen = () => {
    setIsExpanded((prev) => !prev);
    if (!message.isRead) onToggleRead();
  };

  return (
    <div className={`rounded-md border p-4 ${message.isRead ? "border-border bg-surface" : "border-primary/40 bg-primary/5"}`}>
      <button onClick={onOpen} className="flex w-full items-start justify-between gap-3 text-left">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            {!message.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
            {message.subject}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {message.name} &middot; {message.email}
          </p>
          {!isExpanded && <p className="mt-1 line-clamp-1 text-xs text-muted">{message.message}</p>}
        </div>
        <span className="shrink-0 text-[11px] text-muted">{format(new Date(message.createdAt), "PPP p")}</span>
      </button>

      {isExpanded && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="whitespace-pre-wrap text-sm">{message.message}</p>
          <div className="mt-3 flex items-center gap-3">
            <a
              href={`mailto:${message.email}`}
              className="text-xs font-medium text-primary hover:underline"
            >
              Reply by email
            </a>
            <button
              onClick={onToggleRead}
              className="flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
            >
              {message.isRead ? <Mail size={12} /> : <MailOpen size={12} />}
              Mark as {message.isRead ? "unread" : "read"}
            </button>
            <button
              onClick={onDelete}
              className="ml-auto flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminMessagesView() {
  const { isChecking, isAllowed } = useRequirePermission("messages:manage");
  const { messages, isLoading, setRead, remove } = useAdminMessages();

  if (isChecking || !isAllowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Checking your session...
      </div>
    );
  }

  const onDelete = async (message: ContactMessage) => {
    const confirmed = await confirmDialog(`Delete the message from ${message.name}?`, {
      title: "Delete message",
      confirmLabel: "Delete",
      danger: true,
    });
    if (confirmed) remove(message._id);
  };

  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <main className="p-6">
      <div className="mb-6">
        <h1 className="mb-1 text-xl font-semibold">Messages</h1>
        <p className="text-sm text-muted">
          Everything submitted through the Contact page{" "}
          {unreadCount > 0 ? `— ${unreadCount} unread` : "— all caught up"}.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading messages...</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-muted">No messages yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((message) => (
            <MessageRow
              key={message._id}
              message={message}
              onToggleRead={() => setRead(message._id, !message.isRead)}
              onDelete={() => onDelete(message)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
