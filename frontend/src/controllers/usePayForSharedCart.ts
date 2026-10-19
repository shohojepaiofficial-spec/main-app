"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import * as sharedCartService from "@/services/sharedCartService";

// The "Pay with bKash" button on a payment link: starts the payment and
// sends the browser to bKash. No account needed.
export function usePayForSharedCart(link: string) {
  const [isPaying, setIsPaying] = useState(false);

  const pay = async () => {
    setIsPaying(true);
    try {
      window.location.assign(await sharedCartService.payForSharedCart(link));
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Couldn't start the payment");
      setIsPaying(false);
    }
  };

  return { isPaying, pay };
}
