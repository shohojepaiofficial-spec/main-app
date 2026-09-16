"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as adService from "@/services/adService";
import { Ad, AdPlatform } from "@/models";

export function useAdminAds() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const reload = () => {
    setIsLoading(true);
    return adService
      .getAds()
      .then((data) => setAds(data))
      .catch(() => toast.error("Failed to load ads"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let ignore = false;
    adService
      .getAds()
      .then((data) => {
        if (!ignore) setAds(data);
      })
      .catch(() => {
        if (!ignore) toast.error("Failed to load ads");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const publish = async (id: string, platforms?: AdPlatform[]) => {
    setPublishingId(id);
    try {
      const updated = await adService.publishAd(id, platforms);
      setAds((prev) => prev.map((a) => (a._id === id ? updated : a)));
      toast.success("Publish attempted — check each platform's status below");
    } catch {
      toast.error("Failed to publish");
    } finally {
      setPublishingId(null);
    }
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      await adService.deleteAd(id);
      setAds((prev) => prev.filter((a) => a._id !== id));
      toast.success("Ad deleted");
    } catch {
      toast.error("Failed to delete ad");
    } finally {
      setDeletingId(null);
    }
  };

  return { ads, isLoading, publishingId, deletingId, publish, remove, reload };
}
