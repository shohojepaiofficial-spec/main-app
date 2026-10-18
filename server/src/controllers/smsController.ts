import { Request, Response } from "express";
import { getSmsBalance, isSmsBalanceConfigured } from "../integrations/sms";

// Remaining REVE SMS balance for the staff dashboard. `configured: false`
// (not an error) when no SMS values are set, so the tile can say so.
// `source` is the env var *name* REVE accepted as the client ID.
export const getBalance = async (_req: Request, res: Response) => {
  if (!isSmsBalanceConfigured()) {
    res.json({ configured: false, balance: null, source: null });
    return;
  }
  try {
    const { balance, source } = await getSmsBalance();
    res.json({ configured: true, balance, source });
  } catch (err) {
    console.error("SMS balance check failed:", (err as Error).message);
    res.status(502).json({ message: "Could not get the balance from the SMS gateway" });
  }
};
