import Link from "next/link";
import { Truck, ShieldCheck, RotateCcw, Headset } from "lucide-react";

function getBadges(storeCity: string) {
  return [
    {
      Icon: Truck,
      title: "Fast Delivery",
      description: `Reliable delivery inside and outside ${storeCity}.`,
      href: "/shipping",
    },
    {
      Icon: ShieldCheck,
      title: "Secure Shopping",
      description: "Your data and payments are protected.",
      href: undefined,
    },
    {
      Icon: RotateCcw,
      title: "Easy Returns",
      description: "Hassle-free returns on eligible items.",
      href: "/returns",
    },
    {
      Icon: Headset,
      title: "Dedicated Support",
      description: "We're here to help with any questions.",
      href: "/contact",
    },
  ];
}

export function TrustBadges({ storeCity }: { storeCity: string }) {
  const badges = getBadges(storeCity);
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
        {badges.map(({ Icon, title, description, href }) => {
          const isClickable = !!href;

          const content = (
            <>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full ${
                  isClickable ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                }`}
              >
                <Icon size={20} />
              </div>
              <p
                className={`text-sm font-medium ${isClickable ? "text-primary group-hover:underline" : ""}`}
              >
                {title}
              </p>
              <p className="text-xs text-muted">{description}</p>
            </>
          );

          return isClickable ? (
            <Link
              key={title}
              href={href}
              className="group flex flex-col items-center gap-2 rounded-md p-2 text-center transition-colors hover:bg-primary/5"
            >
              {content}
            </Link>
          ) : (
            <div key={title} className="flex flex-col items-center gap-2 p-2 text-center">
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
