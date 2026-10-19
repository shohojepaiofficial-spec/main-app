"use client";

import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useTranslations } from "@/controllers/useTranslations";
import { PathaoLocation } from "@/models";
import type { PathaoSelection } from "@/controllers/useCheckoutLocations";

interface PathaoLocationFieldsProps {
  cities: PathaoLocation[];
  zones: PathaoLocation[];
  areas: PathaoLocation[];
  selection: PathaoSelection;
  isLoadingZones: boolean;
  isLoadingAreas: boolean;
  onCity: (id?: number) => void;
  onZone: (id?: number) => void;
  onArea: (id?: number) => void;
  cityError?: string;
  zoneError?: string;
  disabled?: boolean;
}

const toOptions = (list: PathaoLocation[]) => list.map((l) => ({ value: String(l.id), label: l.name }));
const toId = (value: string) => (value ? Number(value) : undefined);

// City → zone → area from Pathao's own lists (presentational; the parent
// owns the selection via controllers/useCheckoutLocations.ts).
export function PathaoLocationFields({
  cities, zones, areas, selection, isLoadingZones, isLoadingAreas,
  onCity, onZone, onArea, cityError, zoneError, disabled = false,
}: PathaoLocationFieldsProps) {
  const { t } = useTranslations();
  const search = t("address.typeToSearch", "Type to search...");
  const noMatch = t("address.noMatch", "No match — try another spelling");

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SearchableSelect
          label={t("address.city", "District / City")}
          options={toOptions(cities)}
          value={selection.cityId ? String(selection.cityId) : ""}
          onChange={(v) => onCity(toId(v))}
          placeholder={t("address.selectCity", "Select district")}
          searchPlaceholder={search}
          noMatchText={noMatch}
          disabled={disabled}
          error={cityError}
        />
        <SearchableSelect
          label={t("address.zone", "Thana / Zone")}
          options={toOptions(zones)}
          value={selection.zoneId ? String(selection.zoneId) : ""}
          onChange={(v) => onZone(toId(v))}
          placeholder={
            !selection.cityId
              ? t("address.selectCityFirst", "Select a district first")
              : isLoadingZones
                ? t("address.loading", "Loading...")
                : t("address.selectZone", "Select thana / zone")
          }
          searchPlaceholder={search}
          noMatchText={noMatch}
          disabled={disabled || !selection.cityId || isLoadingZones}
          error={zoneError}
        />
      </div>
      {selection.zoneId && (isLoadingAreas || areas.length > 0) && (
        <SearchableSelect
          label={t("address.areaOptional", "Area (optional)")}
          options={toOptions(areas)}
          value={selection.areaId ? String(selection.areaId) : ""}
          onChange={(v) => onArea(toId(v))}
          placeholder={isLoadingAreas ? t("address.loading", "Loading...") : t("address.selectArea", "Select area")}
          searchPlaceholder={search}
          noMatchText={noMatch}
          disabled={disabled || isLoadingAreas}
        />
      )}
    </div>
  );
}
