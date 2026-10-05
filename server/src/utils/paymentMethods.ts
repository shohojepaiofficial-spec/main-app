import { PaymentMethod } from "../models/Order";
import { isBkashLive } from "../integrations/bkash";

// The payment methods a customer can pick at checkout right now. "cod"
// always works; "bkash" only with real (non-sandbox) credentials — see
// isBkashLive. createOrder rejects anything not in this list, and
// GET /api/config serves it so checkout only shows what will be accepted.
// adminCreateOrder (a manual/phone order the shop owner enters themselves)
// isn't restricted to this list, since the admin may be recording a payment
// that already happened outside the site (e.g. a bKash transfer to the
// shop's personal number) rather than triggering a live charge.
export function liveOnlinePaymentMethods(): PaymentMethod[] {
  return isBkashLive() ? ["cod", "bkash"] : ["cod"];
}
