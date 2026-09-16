"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Phone, Mail, MapPin } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import * as contactService from "@/services/contactService";
import {
  CONTACT_ADDRESS,
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
  WHATSAPP_NUMBER,
} from "@/lib/contact";

function extractErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

const contactSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email("Enter a valid email"),
  subject: z.string().min(2, "Subject is too short"),
  message: z.string().min(10, "Message is too short"),
});
type ContactValues = z.infer<typeof contactSchema>;

function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({ resolver: zodResolver(contactSchema) });

  const onSubmit = async (values: ContactValues) => {
    try {
      await contactService.submitContactMessage(values);
      toast.success("Message sent — we'll get back to you soon");
      reset();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to send message"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Name</label>
          <input
            {...register("name")}
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            {...register("email")}
            type="email"
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Subject</label>
        <input
          {...register("subject")}
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
        />
        {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium">Message</label>
        <textarea
          {...register("message")}
          rows={5}
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
        />
        {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="self-start rounded bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {isSubmitting ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}

export function ContactView() {
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}`;

  return (
    <main className="mx-auto max-w-5xl px-6 pb-16 pt-[calc(var(--navbar-height)+2rem)]">
      <h1 className="mb-1 text-2xl font-semibold">Contact Us</h1>
      <p className="mb-8 text-sm text-muted">
        Have a question about an order or a product? Send us a message or reach out directly.
      </p>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ContactForm />
        </div>

        <div className="flex flex-col gap-4">
          <a
            href={`tel:${CONTACT_PHONE_TEL}`}
            className="flex items-center gap-3 rounded-md border border-border bg-surface p-4 hover:bg-background"
          >
            <Phone size={18} className="shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Phone</p>
              <p className="text-sm text-muted">{CONTACT_PHONE_DISPLAY}</p>
            </div>
          </a>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="flex items-center gap-3 rounded-md border border-border bg-surface p-4 hover:bg-background"
          >
            <Mail size={18} className="shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted">{CONTACT_EMAIL}</p>
            </div>
          </a>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-md border border-border bg-surface p-4 hover:bg-background"
          >
            <FaWhatsapp size={18} className="shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">WhatsApp</p>
              <p className="text-sm text-muted">Chat with us</p>
            </div>
          </a>
          <div className="flex items-center gap-3 rounded-md border border-border bg-surface p-4">
            <MapPin size={18} className="shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Address</p>
              <p className="text-sm text-muted">{CONTACT_ADDRESS}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
