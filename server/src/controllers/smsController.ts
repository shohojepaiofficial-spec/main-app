import { Request, Response } from "express";
import { getSmsBalance, isSmsBalanceConfigured } from "../integrations/sms";

// Remaining REVE SMS balance for the staff dashboard. `configured: false`
// (not an error) when SMS_CLIENT_ID isn't set, so the tile can say so.
export const getBalance = async (_req: Request, res: Response) => {
  if (!isSmsBalanceConfigured()) {
    res.json({ configured: false, balance: null });
    return;
  }
  try {
    res.json({ configured: true, balance: await getSmsBalance() });
  } catch (err) {
    console.error("SMS balance check failed:", (err as Error).message);
    res.status(502).json({ message: "Could not get the balance from the SMS gateway" });
  }
};
