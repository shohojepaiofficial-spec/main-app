import type { Metadata } from "next";
import { Suspense } from "react";
import { BkashResultView } from "@/views/BkashResultView";

export const metadata: Metadata = {
  title: "bKash payment result",
  robots: { index: false, follow: false },
};

export default function BkashResultPage() {
  return (
    <Suspense>
      <BkashResultView />
    </Suspense>
  );
}
