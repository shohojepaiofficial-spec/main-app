import { api } from "@/lib/api";
import { Campaign, CampaignAudiencePreview, CampaignChannel, CampaignSourceType } from "@/models";

export const getCampaigns = async (): Promise<Campaign[]> => {
  const { data } = await api.get<Campaign[]>("/campaigns");
  return data;
};

export const getAudiencePreview = async (): Promise<CampaignAudiencePreview> => {
  const { data } = await api.get<CampaignAudiencePreview>("/campaigns/audience");
  return data;
};

export interface CampaignInput {
  title: string;
  sourceType: CampaignSourceType;
  productId?: string;
  // The code, not an id — mirrors adService.ts's AdInput#promoCode.
  promoCode?: string;
  channels: CampaignChannel[];
  emailSubject?: string;
  emailBody?: string;
  smsMessage?: string;
}

export const createCampaign = async (input: CampaignInput): Promise<Campaign> => {
  const { data } = await api.post<Campaign>("/campaigns", input);
  return data;
};
