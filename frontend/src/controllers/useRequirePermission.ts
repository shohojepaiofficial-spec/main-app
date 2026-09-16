"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/controllers/useRequireAuth";
import { useAuthController } from "@/controllers/useAuthController";
import { Permission } from "@/models";

// Same client-side-only caveat as useRequireAuth/useRequireAdmin. Gates a
// page behind one specific permission instead of the full-admin role, so a
// coadmin only reaches the sections they were actually granted.
export function useRequirePermission(permission: Permission) {
  const router = useRouter();
  const { isChecking: isCheckingAuth, isAllowed: isAuthed } = useRequireAuth();
  const { user, hasPermission } = useAuthController();

  const isPermitted = hasPermission(permission);
  const isChecking = isCheckingAuth || (isAuthed && !isPermitted);

  useEffect(() => {
    if (!isCheckingAuth && isAuthed && !isPermitted) {
      router.replace("/dashboard");
    }
  }, [isCheckingAuth, isAuthed, isPermitted, router]);

  return { user, isChecking, isAllowed: isAuthed && isPermitted };
}
