import { api } from "@/lib/api";
import { ContactMessage } from "@/models";

export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const submitContactMessage = async (input: ContactInput): Promise<void> => {
  await api.post("/contact", input);
};

// Admin ("messages:manage") only, from here down.

export const getContactMessages = async (): Promise<ContactMessage[]> => {
  const { data } = await api.get<ContactMessage[]>("/contact");
  return data;
};

export const markMessageRead = async (id: string, isRead: boolean): Promise<ContactMessage> => {
  const { data } = await api.patch<ContactMessage>(`/contact/${id}/read`, { isRead });
  return data;
};

export const deleteContactMessage = async (id: string): Promise<void> => {
  await api.delete(`/contact/${id}`);
};
