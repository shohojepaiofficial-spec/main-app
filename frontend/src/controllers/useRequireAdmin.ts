"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/controllers/useRequireAuth";

// Same "no server-side check yet" caveat as useRequireAuth — this is a
// client-side redirect, the real enforcement is the API's adminOnly
// middleware. Only full admins can manage other users' roles/permissions
// (see server/src/routes/userRoutes.ts), so coadmins get bounced too.
export function useRequireAdmin() {
  const router = useRouter();
  const { user, isChecking: isCheckingAuth, isAllowed: isAuthed } = useRequireAuth();

  const isAdmin = user?.role === "admin";
  const isChecking = isCheckingAuth || (isAuthed && !isAdmin);

  useEffect(() => {
    if (!isCheckingAuth && isAuthed && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isCheckingAuth, isAuthed, isAdmin, router]);

  return { user, isChecking, isAllowed: isAuthed && isAdmin };
}
