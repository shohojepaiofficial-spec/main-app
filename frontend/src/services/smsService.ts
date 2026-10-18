import { api } from "@/lib/api";
import { SmsBalance } from "@/models";

export const getSmsBalance = async (): Promise<SmsBalance> => {
  const { data } = await api.get<SmsBalance>("/sms/balance");
  return data;
};
