"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import * as returnService from "@/services/returnService";
import { toReturnRequestInput, type ReturnFormState } from "@/lib/returns";
import { ReturnType } from "@/models";

function errorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

// One return/exchange form for one order. Mount it fresh (key=orderId) per
// order instead of resetting state. `asStaff` logs it from the admin side
// (no 7-day limit on the server).
export function useReturnRequestForm({
  orderId,
  remaining,
  asStaff = false,
  onSubmitted,
}: {
  orderId: string;
  remaining: number[];
  asStaff?: boolean;
  onSubmitted: () => void;
}) {
  const [form, setForm] = useState<ReturnFormState>({
    type: "return",
    reason: "",
    details: "",
    exchangeFor: "",
    // A one-line, one-unit order is preselected — the common case.
    quantities: remaining.length === 1 && remaining[0] === 1 ? [1] : remaining.map(() => 0),
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (patch: Partial<ReturnFormState>) => {
    setError(null);
    setForm((prev) => ({ ...prev, ...patch }));
  };
  const setType = (type: ReturnType) => update({ type });
  const setQuantity = (index: number, quantity: number) =>
    update({
      quantities: form.quantities.map((q, i) => (i === index ? Math.max(0, Math.min(quantity, remaining[i] ?? 0)) : q)),
    });

  const submit = async (successMessage: string) => {
    const result = toReturnRequestInput(orderId, form, remaining);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setIsSubmitting(true);
    try {
      await (asStaff ? returnService.adminCreateReturnRequest : returnService.createReturnRequest)(result.input);
      toast.success(successMessage);
      onSubmitted();
    } catch (err) {
      setError(errorMessage(err, "Couldn't send the request. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return { form, error, isSubmitting, update, setType, setQuantity, submit };
}
