"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as campaignService from "@/services/campaignService";
import { Campaign } from "@/models";

export function useAdminCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = () => {
    setIsLoading(true);
    return campaignService
      .getCampaigns()
      .then((data) => setCampaigns(data))
      .catch(() => toast.error("Failed to load campaigns"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let ignore = false;
    campaignService
      .getCampaigns()
      .then((data) => {
        if (!ignore) setCampaigns(data);
      })
      .catch(() => {
        if (!ignore) toast.error("Failed to load campaigns");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return { campaigns, isLoading, reload };
}
