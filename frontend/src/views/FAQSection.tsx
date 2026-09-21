"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "@/controllers/useTranslations";

function getFaqs(t: ReturnType<typeof useTranslations>["t"], storeCity: string) {
  return [
    {
      question: t("faq.deliveryTime.question", "How long does delivery take?"),
      answer: t(
        "faq.deliveryTime.answer",
        "Orders inside {city} are typically delivered within 1-2 business days. Outside {city}, delivery usually takes 3-5 business days depending on the courier.",
        { city: storeCity }
      ),
    },
    {
      question: t("faq.payment.question", "What payment methods do you accept?"),
      answer: t(
        "faq.payment.answer",
        "We accept cash on delivery, along with major mobile banking and card payment options at checkout."
      ),
    },
    {
      question: t("faq.returns.question", "Can I return or exchange a product?"),
      answer: t(
        "faq.returns.answer",
        "Yes — most items can be returned or exchanged within 7 days of delivery, as long as they're unused and in their original packaging."
      ),
    },
    {
      question: t("faq.tracking.question", "How do I track my order?"),
      answer: t(
        "faq.tracking.answer",
        "Once you're logged in, visit your Dashboard or Orders page to see the current status of every order you've placed."
      ),
    },
    {
      question: t("faq.promoCodes.question", "Do you offer discounts or promo codes?"),
      answer: t(
        "faq.promoCodes.answer",
        "Yes — keep an eye on our homepage banners and product pages for active promo codes, or check with us before checkout."
      ),
    },
  ];
}

export function FAQSection({ storeCity }: { storeCity: string }) {
  const { t } = useTranslations();
  const faqs = getFaqs(t, storeCity);
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <h2 className="mb-6 text-center text-2xl font-semibold">
        {t("faq.heading", "Frequently Asked Questions")}
      </h2>
      <div className="flex flex-col gap-3">
        {faqs.map((faq) => (
          <details key={faq.question} className="group rounded-md border border-border bg-surface p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium marker:content-none">
              {faq.question}
              <Plus size={16} className="shrink-0 text-muted transition-transform group-open:rotate-45" />
            </summary>
            <p className="mt-3 text-sm text-muted">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
