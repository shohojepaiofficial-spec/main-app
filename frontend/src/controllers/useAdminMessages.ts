"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as contactService from "@/services/contactService";
import { ContactMessage } from "@/models";

export function useAdminMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = () => {
    setIsLoading(true);
    return contactService
      .getContactMessages()
      .then((data) => setMessages(data))
      .catch(() => toast.error("Failed to load messages"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let ignore = false;
    contactService
      .getContactMessages()
      .then((data) => {
        if (!ignore) setMessages(data);
      })
      .catch(() => {
        if (!ignore) toast.error("Failed to load messages");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const setRead = async (id: string, isRead: boolean) => {
    setMessages((prev) => prev.map((m) => (m._id === id ? { ...m, isRead } : m)));
    try {
      await contactService.markMessageRead(id, isRead);
    } catch {
      toast.error("Failed to update message");
      setMessages((prev) => prev.map((m) => (m._id === id ? { ...m, isRead: !isRead } : m)));
    }
  };

  const remove = async (id: string) => {
    const prev = messages;
    setMessages((current) => current.filter((m) => m._id !== id));
    try {
      await contactService.deleteContactMessage(id);
    } catch {
      toast.error("Failed to delete message");
      setMessages(prev);
    }
  };

  return { messages, isLoading, reload, setRead, remove };
}
