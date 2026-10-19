"use client";

import { useEffect, useState } from "react";
import * as orderService from "@/services/orderService";
import { PathaoAddress, PathaoLocation, PathaoRef } from "@/models";

// Checkout's address picker: Pathao's own city → zone → area lists, so the
// order carries a location Pathao's riders know and staff can book it
// without picking again. If Pathao's lists can't be loaded (not connected,
// down, empty), `mode` becomes "fallback" and checkout shows our own
// Zila/Upazila list instead — the customer can always place the order.
export type CheckoutLocationMode = "loading" | "pathao" | "fallback";

export interface PathaoSelection {
  cityId?: number;
  zoneId?: number;
  areaId?: number;
}

// A loaded list, tagged with the city/zone it belongs to — "still loading"
// is simply "the tag isn't the current pick yet", with no reset effect.
interface TaggedList {
  parentId?: number;
  items: PathaoLocation[];
}

export function useCheckoutLocations(initial?: PathaoAddress) {
  const [mode, setMode] = useState<CheckoutLocationMode>("loading");
  const [cities, setCities] = useState<PathaoLocation[]>([]);
  const [zoneList, setZoneList] = useState<TaggedList>({ items: [] });
  const [areaList, setAreaList] = useState<TaggedList>({ items: [] });
  const [selection, setSelection] = useState<PathaoSelection>(
    initial ? { cityId: initial.cityId, zoneId: initial.zoneId, areaId: initial.areaId } : {}
  );

  useEffect(() => {
    let ignore = false;
    orderService
      .getCheckoutCities()
      .then((data) => {
        if (ignore) return;
        setCities(data);
        setMode("pathao");
      })
      .catch(() => {
        if (!ignore) setMode("fallback");
      });
    return () => {
      ignore = true;
    };
  }, []);

  const cityId = selection.cityId;
  const zoneId = selection.zoneId;

  useEffect(() => {
    if (mode !== "pathao" || !cityId) return;
    let ignore = false;
    orderService
      .getCheckoutZones(cityId)
      .then((items) => {
        if (!ignore) setZoneList({ parentId: cityId, items });
      })
      // A city whose zones can't load leaves nothing to pick: use our list.
      .catch(() => {
        if (!ignore) setMode("fallback");
      });
    return () => {
      ignore = true;
    };
  }, [mode, cityId]);

  useEffect(() => {
    if (mode !== "pathao" || !zoneId) return;
    let ignore = false;
    orderService
      .getCheckoutAreas(zoneId)
      .then((items) => {
        if (!ignore) setAreaList({ parentId: zoneId, items });
      })
      // Area is optional — without the list the customer just skips it.
      .catch(() => {
        if (!ignore) setAreaList({ parentId: zoneId, items: [] });
      });
    return () => {
      ignore = true;
    };
  }, [mode, zoneId]);

  const zones = zoneList.parentId === cityId ? zoneList.items : [];
  const areas = areaList.parentId === zoneId ? areaList.items : [];
  const isLoadingZones = !!cityId && zoneList.parentId !== cityId;
  const isLoadingAreas = !!zoneId && areaList.parentId !== zoneId;

  // Picking a city or zone clears what's below it.
  const chooseCity = (id?: number) => {
    setSelection({ cityId: id });
    return cities.find((c) => c.id === id);
  };
  const chooseZone = (id?: number) => {
    setSelection((s) => ({ cityId: s.cityId, zoneId: id }));
    return zones.find((z) => z.id === id);
  };
  const chooseArea = (id?: number) => {
    setSelection((s) => ({ ...s, areaId: id }));
    return areas.find((a) => a.id === id);
  };
  const reset = (next?: PathaoAddress) => {
    setSelection(next ? { cityId: next.cityId, zoneId: next.zoneId, areaId: next.areaId } : {});
  };

  // What the order sends: only in Pathao mode, with both city and zone.
  const pathaoRef: PathaoRef | undefined =
    mode === "pathao" && cityId && zoneId
      ? { cityId, zoneId, ...(selection.areaId ? { areaId: selection.areaId } : {}) }
      : undefined;

  return {
    mode, cities, zones, areas, selection, isLoadingZones, isLoadingAreas,
    chooseCity, chooseZone, chooseArea, reset, pathaoRef,
  };
}
