"use client";

import { useEffect, useState } from "react";
import { Truck, RefreshCw, Pencil, Trash2 } from "lucide-react";
import * as orderService from "@/services/orderService";
import { Order, PathaoLocation } from "@/models";

interface OrderCourierPanelProps {
  order: Order;
  isSavingCourier: boolean;
  isBooking: boolean;
  isRefreshing: boolean;
  onSaveManual: (input: orderService.CourierInfoInput) => void;
  onBook: (input: orderService.BookPathaoOrderInput) => Promise<boolean>;
  onRefresh: () => void;
  onRemove: () => void;
}

type Mode = "idle" | "manual" | "booking";

function ManualForm({
  order,
  isSaving,
  onSave,
  onCancel,
}: {
  order: Order;
  isSaving: boolean;
  onSave: (input: orderService.CourierInfoInput) => void;
  onCancel: () => void;
}) {
  const [consignmentId, setConsignmentId] = useState(order.courierConsignmentId ?? "");
  const [trackingStatus, setTrackingStatus] = useState(order.courierTrackingStatus ?? "");
  const [note, setNote] = useState(order.courierNote ?? "");

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3">
      <p className="text-xs font-medium text-muted">
        Enter courier details by hand — useful if you booked directly on Pathao&apos;s own site, or with any
        other courier.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={consignmentId}
          onChange={(e) => setConsignmentId(e.target.value)}
          placeholder="Consignment / tracking ID"
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
        />
        <input
          value={trackingStatus}
          onChange={(e) => setTrackingStatus(e.target.value)}
          placeholder="Status (e.g. Picked up, In transit)"
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
        />
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        rows={2}
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave({ consignmentId, trackingStatus, note })}
          disabled={isSaving}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

function BookingForm({
  order,
  isBooking,
  onBook,
  onCancel,
}: {
  order: Order;
  isBooking: boolean;
  onBook: (input: orderService.BookPathaoOrderInput) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [cities, setCities] = useState<PathaoLocation[]>([]);
  const [zones, setZones] = useState<PathaoLocation[]>([]);
  const [areas, setAreas] = useState<PathaoLocation[]>([]);
  const [cityId, setCityId] = useState<number | "">("");
  const [zoneId, setZoneId] = useState<number | "">("");
  const [areaId, setAreaId] = useState<number | "">("");
  const [weightKg, setWeightKg] = useState("0.5");
  const [specialInstruction, setSpecialInstruction] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingCities, setIsLoadingCities] = useState(true);

  useEffect(() => {
    let ignore = false;
    orderService
      .getPathaoCities()
      .then((data) => {
        if (!ignore) setCities(data);
      })
      .catch((err) => {
        if (ignore) return;
        setLoadError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            "Couldn't load Pathao's city list"
        );
      })
      .finally(() => {
        if (!ignore) setIsLoadingCities(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Picking a city or zone clears everything below it here, in the handler,
  // rather than in the effects (see ARCHITECTURE.md on set-state-in-effect).
  // The zone and area ids belong to the old choice, so they must not survive
  // into the booking.
  const chooseCity = (id: number | "") => {
    setCityId(id);
    setZones([]);
    chooseZone("");
  };
  const chooseZone = (id: number | "") => {
    setZoneId(id);
    setAreas([]);
    setAreaId("");
  };

  useEffect(() => {
    if (cityId === "") return;
    let ignore = false;
    orderService.getPathaoZones(cityId).then((data) => {
      if (!ignore) setZones(data);
    });
    return () => {
      ignore = true;
    };
  }, [cityId]);

  useEffect(() => {
    if (zoneId === "") return;
    let ignore = false;
    orderService.getPathaoAreas(zoneId).then((data) => {
      if (!ignore) setAreas(data);
    });
    return () => {
      ignore = true;
    };
  }, [zoneId]);

  if (loadError) {
    return (
      <div className="rounded-md border border-border bg-background p-3 text-xs text-muted">
        {loadError}
        <button onClick={onCancel} className="ml-2 font-medium text-primary underline">
          Enter manually instead
        </button>
      </div>
    );
  }

  if (isLoadingCities) {
    return <p className="rounded-md border border-border bg-background p-3 text-xs text-muted">Loading Pathao&apos;s coverage area list...</p>;
  }

  const canSubmit = cityId !== "" && zoneId !== "" && Number(weightKg) > 0;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3">
      <p className="text-xs text-muted">
        Recipient details are pulled from this order&apos;s shipping address. Pick the closest Pathao
        coverage area below.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <select
          value={cityId}
          onChange={(e) => chooseCity(e.target.value ? Number(e.target.value) : "")}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
        >
          <option value="">City</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={zoneId}
          onChange={(e) => chooseZone(e.target.value ? Number(e.target.value) : "")}
          disabled={cityId === ""}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm disabled:opacity-50"
        >
          <option value="">Zone</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
        <select
          value={areaId}
          onChange={(e) => setAreaId(e.target.value ? Number(e.target.value) : "")}
          disabled={zoneId === ""}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm disabled:opacity-50"
        >
          <option value="">Area (optional)</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-xs text-muted">
          Weight (kg)
          <input
            type="number"
            min="0.5"
            max="10"
            step="0.5"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-sm"
          />
        </label>
        <input
          value={specialInstruction}
          onChange={(e) => setSpecialInstruction(e.target.value)}
          placeholder="Special instruction (optional)"
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
        />
      </div>
      {order.paymentMethod === "cod" && (
        <p className="text-xs text-muted">
          Pathao will collect {order.totalAmount.toFixed(2)} on delivery (Cash on Delivery order).
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface"
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            if (cityId === "" || zoneId === "") return;
            await onBook({
              cityId,
              zoneId,
              areaId: areaId === "" ? undefined : areaId,
              weightKg: Number(weightKg),
              specialInstruction: specialInstruction || undefined,
            });
          }}
          disabled={!canSubmit || isBooking}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {isBooking ? "Booking..." : "Book with Pathao"}
        </button>
      </div>
    </div>
  );
}

export function OrderCourierPanel({
  order,
  isSavingCourier,
  isBooking,
  isRefreshing,
  onSaveManual,
  onBook,
  onRefresh,
  onRemove,
}: OrderCourierPanelProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const hasCourier = !!order.courierConsignmentId;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted">
        <Truck size={13} /> Courier &amp; delivery
      </p>

      {hasCourier && mode === "idle" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background p-3 text-xs">
          <div>
            <p className="font-medium">
              {order.courierProvider === "pathao" ? "Pathao" : order.courierProvider} &middot;{" "}
              {order.courierConsignmentId}
            </p>
            <p className="text-muted">
              {order.courierTrackingStatus ?? "Status unknown"}
              {order.courierNote ? ` — ${order.courierNote}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 font-medium hover:bg-surface disabled:opacity-50"
            >
              <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              onClick={() => setMode("manual")}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 font-medium hover:bg-surface"
            >
              <Pencil size={12} /> Edit
            </button>
            <button
              onClick={() => setIsConfirmingRemove(true)}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 size={12} /> Remove booking
            </button>
          </div>
          {isConfirmingRemove && (
            <div className="w-full rounded-md border border-red-200 bg-red-50 p-2 text-red-700">
              <p>
                Cancel the parcel in the Pathao merchant panel first — this only removes it here. The history is kept and
                the order can be booked again.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => {
                    setIsConfirmingRemove(false);
                    onRemove();
                  }}
                  disabled={isSavingCourier}
                  className="rounded-md bg-red-600 px-2 py-1 font-medium text-white disabled:opacity-50"
                >
                  It&apos;s cancelled in Pathao — remove
                </button>
                <button onClick={() => setIsConfirmingRemove(false)} className="rounded-md px-2 py-1 text-muted hover:text-foreground">
                  Keep it
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!hasCourier && mode === "idle" && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode("booking")}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Book with Pathao
          </button>
          <button
            onClick={() => setMode("manual")}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-background"
          >
            Enter manually
          </button>
        </div>
      )}

      {mode === "manual" && (
        <ManualForm
          order={order}
          isSaving={isSavingCourier}
          onSave={(input) => {
            onSaveManual(input);
            setMode("idle");
          }}
          onCancel={() => setMode("idle")}
        />
      )}

      {mode === "booking" && (
        <BookingForm
          order={order}
          isBooking={isBooking}
          onBook={async (input) => {
            const ok = await onBook(input);
            if (ok) setMode("idle");
            return ok;
          }}
          onCancel={() => setMode("idle")}
        />
      )}
    </div>
  );
}
