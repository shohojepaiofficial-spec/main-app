import { UseFormRegisterReturn } from "react-hook-form";
import { BANGLADESH_ZILAS } from "@/lib/bangladeshGeo";

interface ZilaUpazilaFieldsProps {
  zilaRegister: UseFormRegisterReturn;
  upazilaRegister: UseFormRegisterReturn;
  selectedZila: string;
  zilaError?: string;
  upazilaError?: string;
  disabled?: boolean;
}

// Presentational only — the parent form owns the actual field state (via
// react-hook-form's register) and is responsible for clearing `upazila`
// when it's no longer valid for a newly-selected `zila` (see SettingsView/
// CheckoutView for that effect). Shared here so both places don't duplicate
// the ~500-entry BANGLADESH_ZILAS dropdown markup.
export function ZilaUpazilaFields({
  zilaRegister,
  upazilaRegister,
  selectedZila,
  zilaError,
  upazilaError,
  disabled = false,
}: ZilaUpazilaFieldsProps) {
  const upazilas = BANGLADESH_ZILAS.find((z) => z.zila === selectedZila)?.upazilas ?? [];

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-sm font-medium">Zila (District)</label>
        <select
          {...zilaRegister}
          disabled={disabled}
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2 disabled:opacity-50"
        >
          <option value="">Select Zila</option>
          {BANGLADESH_ZILAS.map((z) => (
            <option key={z.zila} value={z.zila}>
              {z.zila}
            </option>
          ))}
        </select>
        {zilaError && <p className="mt-1 text-sm text-red-600">{zilaError}</p>}
      </div>
      <div>
        <label className="text-sm font-medium">Upazila</label>
        <select
          {...upazilaRegister}
          disabled={disabled || !selectedZila}
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2 disabled:opacity-50"
        >
          <option value="">{selectedZila ? "Select Upazila" : "Select a Zila first"}</option>
          {upazilas.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        {upazilaError && <p className="mt-1 text-sm text-red-600">{upazilaError}</p>}
      </div>
    </div>
  );
}
