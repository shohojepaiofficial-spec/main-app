"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import toast from "react-hot-toast";
import { AlertTriangle, CheckCircle2, Clock, Copy, MapPin, Pencil, RefreshCw, ShieldCheck, Trash2, Truck } from "lucide-react";
import * as orderService from "@/services/orderService";
import { Order, PathaoLocation } from "@/models";

type SaveResult = { result: "saved" | "failed" } | { result: "mismatch"; message: string };

interface OrderCourierPanelProps {
  order: Order;
  isSavingCourier: boolean;
  isBooking: boolean;
  isRefreshing: boolean;
  onSaveManual: (input: orderService.CourierInfoInput) => Promise<SaveResult>;
  onBook: (input: orderService.BookPathaoOrderInput) => Promise<boolean>;
  onBookedOnPathaoSite: () => Promise<boolean>;
  onVerify: () => void;
  onRefresh: () => void;
  onRemove: () => void;
}

type Mode = "idle" | "manual" | "booking" | "pathaoSite";

// How long "booked on Pathao's site" may wait for Pathao's first update
// before staff are told to check it.
const AWAITING_WARN_MS = 3 * 60 * 60 * 1000;

const buttonClass = "inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-surface disabled:opacity-50";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    toast.error("Couldn't copy — select it and copy by hand");
  }
}

// Where the customer said it goes, in Pathao's terms or not. A Pathao
// location means booking needs no picking; otherwise staff pick it.
function LocationSource({ order }: { order: Order }) {
  const p = order.shippingAddress.pathao;
  if (p) {
    return (
      <p className="mb-2 flex items-start gap-1.5 rounded-md bg-green-50 px-2 py-1.5 text-xs text-green-800">
        <MapPin size={13} className="mt-0.5 shrink-0" />
        <span>
          Location from Pathao: <strong>{[p.cityName, p.zoneName, p.areaName].filter(Boolean).join(" › ")}</strong> — ready to book.
        </span>
      </p>
    );
  }
  return (
    <p className="mb-2 flex items-start gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
      <span>
        The customer used our own area list ({order.shippingAddress.zila}, {order.shippingAddress.upazila}) — pick the
        Pathao location before booking.
      </span>
    </p>
  );
}

function ManualForm({
  order,
  isSaving,
  onSave,
  onCancel,
}: {
  order: Order;
  isSaving: boolean;
  onSave: (input: orderService.CourierInfoInput) => Promise<SaveResult>;
  onCancel: () => void;
}) {
  const [provider, setProvider] = useState<"pathao" | "other">(order.courierProvider === "other" ? "other" : "pathao");
  const [courierName, setCourierName] = useState(order.courierName ?? "");
  const [consignmentId, setConsignmentId] = useState(order.courierConsignmentId ?? "");
  const [trackingStatus, setTrackingStatus] = useState(order.courierTrackingStatus ?? "");
  const [note, setNote] = useState(order.courierNote ?? "");
  const [mismatch, setMismatch] = useState<string | null>(null);

  const save = async (confirmMismatch = false) => {
    const outcome = await onSave({
      provider,
      courierName: provider === "other" ? courierName : undefined,
      consignmentId,
      trackingStatus,
      note,
      ...(confirmMismatch ? { confirmMismatch: true } : {}),
    });
    if (outcome.result === "mismatch") setMismatch(outcome.message);
    else if (outcome.result === "saved") onCancel();
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3">
      <p className="text-xs text-muted">
        Only for a parcel you booked yourself. On Pathao&apos;s site it&apos;s easier to use &quot;Booked on Pathao&apos;s
        site&quot; — the number then fills in by itself.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as "pathao" | "other")}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
        >
          <option value="pathao">Pathao</option>
          <option value="other">Another courier</option>
        </select>
        {provider === "other" && (
          <input
            value={courierName}
            onChange={(e) => setCourierName(e.target.value)}
            placeholder="Courier name (e.g. Steadfast)"
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          />
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={consignmentId}
          onChange={(e) => {
            setConsignmentId(e.target.value);
            setMismatch(null);
          }}
          placeholder="Consignment / tracking number"
          autoComplete="off"
          spellCheck={false}
          className="rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-sm"
        />
        <input
          value={trackingStatus}
          onChange={(e) => setTrackingStatus(e.target.value)}
          placeholder="Status (e.g. Picked up)"
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
        />
      </div>
      {provider === "pathao" && (
        <p className="text-xs text-muted">The number is checked with Pathao before it&apos;s saved.</p>
      )}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        rows={2}
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
      />
      {mismatch && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          <p>{mismatch}. Is this the right parcel?</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => save(true)} disabled={isSaving} className="rounded-md bg-amber-600 px-2 py-1 font-medium text-white disabled:opacity-50">
              Yes, save it
            </button>
            <button onClick={() => setMismatch(null)} className="rounded-md px-2 py-1 hover:underline">
              Let me check the number
            </button>
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface">
          Cancel
        </button>
        <button
          onClick={() => save()}
          disabled={isSaving || !!mismatch}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {isSaving ? (provider === "pathao" ? "Checking with Pathao..." : "Saving...") : "Save"}
        </button>
      </div>
    </div>
  );
}

// Booking on Pathao's own website: paste our order id as the Merchant Order
// ID there, and Pathao's first update links the parcel here by itself.
function PathaoSiteSteps({
  order,
  isSaving,
  onDone,
  onCancel,
}: {
  order: Order;
  isSaving: boolean;
  onDone: () => Promise<boolean>;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 text-xs">
      <ol className="flex list-decimal flex-col gap-2 pl-4">
        <li>
          Copy this order&apos;s ID:
          <span className="ml-1 inline-flex items-center gap-1 rounded border border-border bg-surface px-1.5 py-0.5 font-mono">
            {order._id}
          </span>
          <button onClick={() => copyText(order._id)} className={`${buttonClass} ml-1`}>
            <Copy size={12} /> Copy
          </button>
        </li>
        <li>
          On Pathao&apos;s merchant site, create the parcel and paste it into <strong>Merchant Order ID</strong>.
        </li>
        <li>Come back and press the button below. The consignment number fills in when Pathao sends its first update.</li>
      </ol>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-md border border-border px-3 py-1.5 font-medium hover:bg-surface">
          Cancel
        </button>
        <button
          onClick={async () => {
            if (await onDone()) onCancel();
          }}
          disabled={isSaving}
          className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground disabled:opacity-50"
        >
          I&apos;ve booked it on Pathao
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
  // Pre-filled from the customer's Pathao pick at checkout, when there is one.
  const picked = order.shippingAddress.pathao;
  const [cities, setCities] = useState<PathaoLocation[]>([]);
  const [zones, setZones] = useState<PathaoLocation[]>([]);
  const [areas, setAreas] = useState<PathaoLocation[]>([]);
  const [cityId, setCityId] = useState<number | "">(picked?.cityId ?? "");
  const [zoneId, setZoneId] = useState<number | "">(picked?.zoneId ?? "");
  const [areaId, setAreaId] = useState<number | "">(picked?.areaId ?? "");
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
        {loadError}. You can book on Pathao&apos;s own site instead.
        <button onClick={onCancel} className="ml-2 font-medium text-primary underline">
          Back
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
        Recipient details come from this order&apos;s shipping address.
        {picked ? " The location is the one the customer picked — change it only if it's wrong." : " Pick the closest Pathao coverage area below."}
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
        <button onClick={onCancel} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface">
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

function RemoveConfirm({ awaiting, isSaving, onRemove, onKeep }: { awaiting: boolean; isSaving: boolean; onRemove: () => void; onKeep: () => void }) {
  return (
    <div className="w-full rounded-md border border-red-200 bg-red-50 p-2 text-red-700">
      <p>
        {awaiting
          ? "If you did book it on Pathao's site, cancel it there first."
          : "Cancel the parcel with the courier first — this only removes it here."}{" "}
        The history is kept and the order can be booked again.
      </p>
      <div className="mt-2 flex gap-2">
        <button onClick={onRemove} disabled={isSaving} className="rounded-md bg-red-600 px-2 py-1 font-medium text-white disabled:opacity-50">
          Remove booking
        </button>
        <button onClick={onKeep} className="rounded-md px-2 py-1 text-muted hover:text-foreground">
          Keep it
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
  onBookedOnPathaoSite,
  onVerify,
  onRefresh,
  onRemove,
}: OrderCourierPanelProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  // When the panel opened — enough to tell if the wait has gone on too long.
  const [now] = useState(() => Date.now());
  const hasCourier = !!order.courierConsignmentId;
  const awaiting = !hasCourier && !!order.courierAwaitingSince;
  const isPathao = order.courierProvider === "pathao";
  const waitedTooLong = awaiting && now - new Date(order.courierAwaitingSince!).getTime() > AWAITING_WARN_MS;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted">
        <Truck size={13} /> Courier &amp; delivery
      </p>

      {!hasCourier && <LocationSource order={order} />}

      {hasCourier && mode === "idle" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background p-3 text-xs">
          <div>
            <p className="font-medium">
              {isPathao ? "Pathao" : order.courierName || "Courier"} &middot; <span className="font-mono">{order.courierConsignmentId}</span>
            </p>
            <p className="text-muted">
              {order.courierTrackingStatus ?? "Status unknown"}
              {order.courierNote ? ` — ${order.courierNote}` : ""}
            </p>
            {isPathao &&
              (order.courierVerifiedAt ? (
                <p className="mt-1 inline-flex items-center gap-1 text-green-700">
                  <ShieldCheck size={12} /> Checked with Pathao
                </p>
              ) : (
                <p className="mt-1 inline-flex items-center gap-1 text-amber-700">
                  <AlertTriangle size={12} /> Not checked with Pathao yet
                </p>
              ))}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {isPathao && !order.courierVerifiedAt && (
              <button onClick={onVerify} disabled={isRefreshing} className={buttonClass}>
                <CheckCircle2 size={12} /> Check number
              </button>
            )}
            {isPathao && (
              <button onClick={onRefresh} disabled={isRefreshing} className={buttonClass}>
                <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} /> Refresh
              </button>
            )}
            <button onClick={() => setMode("manual")} className={buttonClass}>
              <Pencil size={12} /> Edit
            </button>
            <button onClick={() => setIsConfirmingRemove(true)} className={`${buttonClass} text-red-600 hover:bg-red-50`}>
              <Trash2 size={12} /> Remove booking
            </button>
          </div>
          {isConfirmingRemove && (
            <RemoveConfirm
              awaiting={false}
              isSaving={isSavingCourier}
              onRemove={() => {
                setIsConfirmingRemove(false);
                onRemove();
              }}
              onKeep={() => setIsConfirmingRemove(false)}
            />
          )}
        </div>
      )}

      {awaiting && mode === "idle" && (
        <div className={`flex flex-col gap-2 rounded-md border p-3 text-xs ${waitedTooLong ? "border-amber-300 bg-amber-50" : "border-border bg-background"}`}>
          <p className="flex items-center gap-1.5 font-medium">
            <Clock size={13} /> Booked on Pathao&apos;s site — waiting for Pathao to confirm (
            {formatDistanceToNowStrict(new Date(order.courierAwaitingSince!), { addSuffix: true })})
          </p>
          {waitedTooLong && (
            <p className="text-amber-900">
              Pathao hasn&apos;t confirmed yet. Check that the Merchant Order ID on Pathao is exactly{" "}
              <span className="font-mono">{order._id}</span>, or enter the consignment number by hand.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => copyText(order._id)} className={buttonClass}>
              <Copy size={12} /> Copy order ID
            </button>
            <button onClick={() => setMode("manual")} className={buttonClass}>
              <Pencil size={12} /> Enter number by hand
            </button>
            <button onClick={() => setIsConfirmingRemove(true)} className={`${buttonClass} text-red-600 hover:bg-red-50`}>
              <Trash2 size={12} /> Undo
            </button>
          </div>
          {isConfirmingRemove && (
            <RemoveConfirm
              awaiting
              isSaving={isSavingCourier}
              onRemove={() => {
                setIsConfirmingRemove(false);
                onRemove();
              }}
              onKeep={() => setIsConfirmingRemove(false)}
            />
          )}
        </div>
      )}

      {!hasCourier && !awaiting && mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMode("booking")}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Book with Pathao
          </button>
          <button onClick={() => setMode("pathaoSite")} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-background">
            Booked on Pathao&apos;s site
          </button>
          <button onClick={() => setMode("manual")} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-background">
            Enter manually
          </button>
        </div>
      )}

      {mode === "manual" && (
        <ManualForm order={order} isSaving={isSavingCourier} onSave={onSaveManual} onCancel={() => setMode("idle")} />
      )}

      {mode === "pathaoSite" && (
        <PathaoSiteSteps order={order} isSaving={isSavingCourier} onDone={onBookedOnPathaoSite} onCancel={() => setMode("idle")} />
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
