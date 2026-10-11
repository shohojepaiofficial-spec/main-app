"use client";

import { Info } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { usePageHelp } from "@/controllers/usePageHelp";
import { useTranslations } from "@/controllers/useTranslations";
import { PageHelp } from "@/lib/pageHelp";

// An "About this page" button at the top of every dashboard page, opening a
// side panel: what the page does, what to expect, and its short forms.
export function PageHelpPanel() {
  const { help, isOpen, open, close } = usePageHelp();
  const { t } = useTranslations();
  if (!help) return null;

  return (
    <div className="flex justify-end px-6 pt-4 print:hidden">
      <button
        type="button"
        onClick={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted hover:text-foreground"
      >
        <Info size={14} aria-hidden />
        {t("help.aboutThisPage", "About this page")}
      </button>
      <Modal
        isOpen={isOpen}
        onClose={close}
        title={help.i18n ? t(`${help.i18n}.title`, help.title) : help.title}
        widthClassName="max-w-md"
        guardUnsavedChanges={false}
      >
        <PageHelpBody help={help} />
      </Modal>
    </div>
  );
}

function PageHelpBody({ help }: { help: PageHelp }) {
  const { t } = useTranslations();
  // Customer pages are translated; admin pages pass their English through.
  const tr = (key: string, fallback: string) => (help.i18n ? t(`${help.i18n}.${key}`, fallback) : fallback);

  return (
    <div className="flex flex-col gap-5 text-sm">
      <p className="text-foreground">{tr("summary", help.summary)}</p>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase text-muted">{t("help.whatToExpect", "What to expect")}</h3>
        <ul className="list-disc space-y-1.5 pl-5">
          {help.expect.map((line, i) => (
            <li key={i}>{tr(`expect.${i}`, line)}</li>
          ))}
        </ul>
      </section>

      {help.terms.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted">{t("help.shortForms", "Short forms & terms")}</h3>
          <dl className="divide-y divide-border rounded-md border border-border">
            {help.terms.map((item, i) => (
              <div key={item.term} className="flex gap-3 px-3 py-2">
                <dt className="w-28 shrink-0 font-semibold">{tr(`termName.${i}`, item.term)}</dt>
                <dd className="text-muted">{tr(`term.${i}`, item.meaning)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
