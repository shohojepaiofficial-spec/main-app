"use client";

import { useForm } from "react-hook-form";
import { useRequireAdmin } from "@/controllers/useRequireAdmin";
import { useAdminSiteSettings } from "@/controllers/useAdminSiteSettings";
import { SiteSettings } from "@/models";
import { SiteSettingsInput } from "@/services/siteSettingsService";

type FormValues = SiteSettingsInput;

function SettingsForm({ settings, onSave }: { settings: SiteSettings; onSave: (input: FormValues) => Promise<boolean> }) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: settings });

  return (
    <form onSubmit={handleSubmit(onSave)} className="flex flex-col gap-6">
      <fieldset className="rounded-md border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-semibold">Social links</legend>
        <p className="mb-3 text-xs text-muted">
          Shown in the storefront&apos;s navbar/footer icons, the WhatsApp chat button, and the homepage&apos;s
          search-engine listing. Leave a field blank to keep showing the default.
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-medium" htmlFor="facebookUrl">Facebook page URL</label>
            <input
              id="facebookUrl"
              {...register("social.facebookUrl")}
              placeholder="https://www.facebook.com/yourpage"
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="instagramUrl">Instagram profile URL</label>
            <input
              id="instagramUrl"
              {...register("social.instagramUrl")}
              placeholder="https://www.instagram.com/yourprofile"
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="whatsappNumber">WhatsApp number</label>
            <input
              id="whatsappNumber"
              {...register("social.whatsappNumber")}
              placeholder="01712345678"
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted">A Bangladeshi mobile number, with or without the country code.</p>
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-md border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-semibold">Contact details</legend>
        <p className="mb-3 text-xs text-muted">
          Shown in the navbar top bar, footer, and the Contact/About pages. Leave a field blank
          to keep showing the default.
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-medium" htmlFor="contactPhone">Phone number</label>
            <input
              id="contactPhone"
              {...register("contact.phone")}
              placeholder="+880 1700-502013"
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted">Shown as typed; also used for the tap-to-call link.</p>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="contactPhoneEmail">Email</label>
            <input
              id="contactPhoneEmail"
              type="email"
              {...register("contact.email")}
              placeholder="hello@yourdomain.com"
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="contactAddress">Address</label>
            <textarea
              id="contactAddress"
              {...register("contact.address")}
              rows={2}
              placeholder="Shop/house, road, area, city"
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-md border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-semibold">Email routing</legend>
        <p className="mb-3 text-xs text-muted">
          Which business mailbox (e.g. a Namecheap Private Email address on your own domain) each kind of email
          uses. Leave a field blank to keep using the server&apos;s default address.
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-medium" htmlFor="contactEmail">Contact-form messages</label>
            <input
              id="contactEmail"
              type="email"
              {...register("emailRouting.contact")}
              placeholder="support@yourdomain.com"
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted">Where a customer&apos;s contact-form submission is sent.</p>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="transactionalEmail">Account &amp; order emails</label>
            <div className="mt-1 flex gap-2">
              <input
                id="transactionalName"
                {...register("emailRouting.transactionalName")}
                placeholder="Display name, e.g. Shohoje Pai"
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                id="transactionalEmail"
                type="email"
                {...register("emailRouting.transactional")}
                placeholder="orders@yourdomain.com"
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <p className="mt-1 text-xs text-muted">
              Sends as this name and address: verification, password reset, order status, 2FA, review replies, role
              changes, sign-in alerts and return updates.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="marketingEmail">Marketing campaigns</label>
            <div className="mt-1 flex gap-2">
              <input
                id="marketingName"
                {...register("emailRouting.marketingName")}
                placeholder="Display name, e.g. Shohoje Pai"
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                id="marketingEmail"
                type="email"
                {...register("emailRouting.marketing")}
                placeholder="news@yourdomain.com"
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <p className="mt-1 text-xs text-muted">Sends as this name and address: email campaigns sent from Email Campaigns.</p>
          </div>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={isSubmitting}
        className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {isSubmitting ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}

export function AdminSiteSettingsView() {
  const { isChecking, isAllowed } = useRequireAdmin();
  const { settings, isLoading, save } = useAdminSiteSettings();

  if (isChecking || !isAllowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Checking your session...
      </div>
    );
  }

  return (
    <main className="p-6">
      <div className="mb-6">
        <h1 className="mb-1 text-xl font-semibold">Site settings</h1>
        <p className="text-sm text-muted">Social links, contact details and which mailbox each kind of email uses.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading settings...</p>
      ) : settings ? (
        <div className="max-w-2xl">
          <SettingsForm settings={settings} onSave={save} />
        </div>
      ) : (
        <p className="text-sm text-muted">Couldn&apos;t load site settings.</p>
      )}
    </main>
  );
}
