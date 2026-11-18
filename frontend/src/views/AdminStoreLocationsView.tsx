"use client";

import { useState } from "react";
import { Pencil, Trash2, Loader2, Plus, ArrowUp, ArrowDown, EyeOff, ImageOff, MapPin, Phone } from "lucide-react";
import { useRequirePermission } from "@/controllers/useRequirePermission";
import { useAdminStoreLocations } from "@/controllers/useAdminStoreLocations";
import { StoreLocationFormModal } from "@/views/StoreLocationFormModal";
import { toUploadUrl } from "@/lib/api";
import { confirmDialog } from "@/lib/confirm";
import { StoreLocation } from "@/models";

export function AdminStoreLocationsView() {
  const { isChecking, isAllowed } = useRequirePermission("locations:manage");
  const { locations, isLoading, pendingId, upsert, remove, move } = useAdminStoreLocations();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StoreLocation | null>(null);

  if (isChecking || !isAllowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Checking your session...
      </div>
    );
  }

  const openAddForm = () => {
    setEditingLocation(null);
    setIsFormOpen(true);
  };

  const openEditForm = (location: StoreLocation) => {
    setEditingLocation(location);
    setIsFormOpen(true);
  };

  const onDelete = async (location: StoreLocation) => {
    const confirmed = await confirmDialog(`Delete "${location.name}"? This can't be undone.`, {
      title: "Delete store location",
      confirmLabel: "Delete",
      danger: true,
    });
    if (confirmed) remove(location.id);
  };

  return (
    <main className="p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold mb-1">Manage store locations</h1>
          <p className="text-sm text-muted">
            Physical stores shown on the website&apos;s Our Stores page. Order top-to-bottom is the
            order shoppers see.
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="flex shrink-0 items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium hover:bg-primary-hover"
        >
          <Plus size={16} /> Add location
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading store locations...</p>
      ) : locations.length === 0 ? (
        <p className="text-sm text-muted">No store locations yet — add one to show it on the website.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {locations.map((location, index) => (
            <li
              key={location.id}
              className="flex items-center gap-4 rounded-md border border-border bg-surface p-3"
            >
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => move(location.id, "up")}
                  disabled={index === 0 || pendingId === location.id}
                  aria-label={`Move ${location.name} up`}
                  className="text-muted hover:text-foreground disabled:opacity-30"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => move(location.id, "down")}
                  disabled={index === locations.length - 1 || pendingId === location.id}
                  aria-label={`Move ${location.name} down`}
                  className="text-muted hover:text-foreground disabled:opacity-30"
                >
                  <ArrowDown size={16} />
                </button>
              </div>

              {location.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={toUploadUrl(location.images[0])}
                  alt=""
                  className="h-14 w-20 shrink-0 rounded object-cover border border-border"
                />
              ) : (
                <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded border border-dashed border-border text-muted">
                  <ImageOff size={16} aria-hidden />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium truncate">{location.name}</p>
                  {!location.isActive && (
                    <span className="flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[10px] uppercase text-muted">
                      <EyeOff size={10} /> Hidden
                    </span>
                  )}
                </div>
                <p className="flex items-center gap-1 text-xs text-muted truncate">
                  <MapPin size={11} className="shrink-0" /> {location.address}
                </p>
                {location.phone && (
                  <p className="flex items-center gap-1 text-xs text-muted">
                    <Phone size={11} className="shrink-0" /> {location.phone}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => openEditForm(location)}
                  aria-label={`Edit ${location.name}`}
                  className="text-muted hover:text-foreground"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => onDelete(location)}
                  disabled={pendingId === location.id}
                  aria-label={`Delete ${location.name}`}
                  className="text-red-600 hover:text-red-700 disabled:opacity-30"
                >
                  {pendingId === location.id ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <StoreLocationFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editingLocation={editingLocation}
        onSaved={upsert}
      />
    </main>
  );
}
