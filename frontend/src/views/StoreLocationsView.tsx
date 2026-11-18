import { MapPin, Phone } from "lucide-react";
import { StoreLocation } from "@/models";
import { toUploadUrl } from "@/lib/api";

export function StoreLocationsView({ locations }: { locations: StoreLocation[] }) {
  if (locations.length === 0) {
    return <p className="text-sm text-muted">No store locations have been added yet.</p>;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {locations.map((location) => (
        <div key={location.id} className="overflow-hidden rounded-lg border border-border bg-surface">
          {location.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={toUploadUrl(location.images[0])} alt={location.name} className="aspect-video w-full object-cover" />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-primary/5 text-muted">
              <MapPin size={28} aria-hidden />
            </div>
          )}
          <div className="p-4">
            <h2 className="text-lg font-semibold">{location.name}</h2>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
              <MapPin size={14} className="mt-0.5 shrink-0" /> {location.address}
            </p>
            {location.phone && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <Phone size={14} className="shrink-0" />
                <a href={`tel:${location.phone}`} className="hover:text-foreground">{location.phone}</a>
              </p>
            )}
            {location.images.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {location.images.slice(1).map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={toUploadUrl(url)} alt="" className="aspect-square w-full rounded object-cover" />
                ))}
              </div>
            )}
            {location.mapUrl && (
              <a
                href={location.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
              >
                View on map →
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
