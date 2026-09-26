import { Request, Response } from "express";
import { ContactMessage } from "../models/ContactMessage";
import { sendEmail } from "../utils/sendEmail";
import { escapeHtml } from "../utils/escapeHtml";
import { isNonEmptyString } from "../utils/validate";
import { AuthRequest } from "../middleware/auth";

export const submitContactMessage = async (req: Request, res: Response) => {
  const { name, email, subject, message } = req.body as {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
  };

  if (
    !isNonEmptyString(name) ||
    !isNonEmptyString(email) ||
    !isNonEmptyString(subject) ||
    !isNonEmptyString(message)
  ) {
    return res.status(400).json({ message: "name, email, subject and message are required" });
  }

  // Saved first, always — the message must not be lost even if the mail
  // provider isn't configured (server/.env's RESEND_API_KEY/EMAIL_FROM are
  // blank until that's set up). The notification email below is
  // best-effort on top of that.
  const contactMessage = await ContactMessage.create({
    name: name.trim(),
    email: email.trim(),
    subject: subject.trim(),
    message: message.trim(),
  });

  const notifyEmail = process.env.CONTACT_EMAIL;
  if (notifyEmail) {
    // Anyone on the internet can submit this form — name/subject/message are
    // attacker-controlled, so they're HTML-escaped before going into the
    // notification email. Without this, a submitter could embed arbitrary
    // markup (a fake sender block, a tracking pixel, a disguised phishing
    // link) into the email the store owner actually opens.
    sendEmail({
      to: notifyEmail,
      subject: `New contact message: ${subject.trim()}`,
      html: `<p><strong>From:</strong> ${escapeHtml(name.trim())} (${escapeHtml(email.trim())})</p><p>${escapeHtml(message.trim()).replace(/\n/g, "<br/>")}</p>`,
      text: `From: ${name.trim()} (${email.trim()})\n\n${message.trim()}`,
    }).catch((err) => console.error("Contact notification email failed:", err.message));
  }

  res.status(201).json({ id: contactMessage.id });
};

// Admin inbox (messages:manage) — from here down. There was previously
// nowhere to actually read a submitted message other than the best-effort
// CONTACT_EMAIL notification, which doesn't arrive at all until real mail
// provider credentials exist (see docs/ARCHITECTURE.md).
export const getContactMessages = async (_req: AuthRequest, res: Response) => {
  const messages = await ContactMessage.find().sort({ createdAt: -1 });
  res.json(messages);
};

export const markMessageRead = async (req: AuthRequest, res: Response) => {
  const { isRead } = req.body as { isRead?: boolean };
  const message = await ContactMessage.findByIdAndUpdate(
    req.params.id,
    { isRead: isRead ?? true },
    { new: true }
  );
  if (!message) return res.status(404).json({ message: "Message not found" });
  res.json(message);
};

export const deleteContactMessage = async (req: AuthRequest, res: Response) => {
  const message = await ContactMessage.findByIdAndDelete(req.params.id);
  if (!message) return res.status(404).json({ message: "Message not found" });
  res.status(204).send();
};
