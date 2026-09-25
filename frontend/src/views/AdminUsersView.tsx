"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { useRequireAdmin } from "@/controllers/useRequireAdmin";
import { useAdminUsers, UserFilters } from "@/controllers/useAdminUsers";
import { useDebouncedValue } from "@/controllers/useDebouncedValue";
import { Pagination } from "@/views/Pagination";
import { ALL_PERMISSIONS, ManagedUser, PERMISSION_LABELS, Permission, UserRole } from "@/models";

const ROLE_LABELS: Record<UserRole, string> = {
  user: "User",
  coadmin: "Co-admin",
  admin: "Admin",
};

const inputClass =
  "rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground";

function UserFilterBar({
  filters,
  onChange,
}: {
  filters: UserFilters;
  onChange: (next: UserFilters) => void;
}) {
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const debouncedSearch = useDebouncedValue(searchInput);

  useEffect(() => {
    if (debouncedSearch !== (filters.search ?? "")) {
      onChange({ ...filters, search: debouncedSearch || undefined });
    }
    // Only fire when the debounced value settles, not on every filters change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const clearAll = () => {
    setSearchInput("");
    onChange({});
  };

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-border bg-background p-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">Search</label>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Email address..."
          className={`${inputClass} w-52`}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">Role</label>
        <select
          value={filters.role ?? ""}
          onChange={(e) => onChange({ ...filters, role: (e.target.value || undefined) as UserRole })}
          className={inputClass}
        >
          <option value="">All roles</option>
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">Permission</label>
        <select
          value={filters.permission ?? ""}
          onChange={(e) => onChange({ ...filters, permission: (e.target.value || undefined) as Permission })}
          className={inputClass}
        >
          <option value="">Any permission</option>
          {ALL_PERMISSIONS.map((permission) => (
            <option key={permission} value={permission}>
              {PERMISSION_LABELS[permission]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">Joined from</label>
        <input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">Joined to</label>
        <input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
          className={inputClass}
        />
      </div>
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted hover:text-foreground"
        >
          <X size={14} /> Clear filters
        </button>
      )}
    </div>
  );
}

function UserAccessRow({
  managedUser,
  isCurrentUser,
  isSaving,
  onSave,
}: {
  managedUser: ManagedUser;
  isCurrentUser: boolean;
  isSaving: boolean;
  onSave: (role: UserRole, permissions: Permission[]) => void;
}) {
  const [role, setRole] = useState<UserRole>(managedUser.role);
  const [permissions, setPermissions] = useState<Permission[]>(managedUser.permissions ?? []);

  const isDirty =
    role !== managedUser.role ||
    permissions.length !== (managedUser.permissions ?? []).length ||
    permissions.some((p) => !(managedUser.permissions ?? []).includes(p));

  const togglePermission = (permission: Permission) => {
    setPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  // There is only one admin, ever — it's set outside this UI (see the
  // promote-admin script) and never assignable here. The current user's own
  // row is the only one that can show "Admin", and it's fully disabled below,
  // so this just keeps "Admin" out of every other row's options.
  const selectableRoles: UserRole[] = isCurrentUser ? ["admin"] : ["user", "coadmin"];

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="py-3 pl-4 pr-4 align-top">
        <p className="text-sm font-medium">
          {managedUser.name} {isCurrentUser && <span className="text-xs text-muted">(you)</span>}
        </p>
        <p className="text-xs text-muted">{managedUser.email}</p>
      </td>
      <td className="py-3 pr-4 align-top">
        <select
          value={role}
          disabled={isCurrentUser}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="rounded-md border border-border bg-surface px-2 py-1 text-sm disabled:opacity-50"
        >
          {selectableRoles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </td>
      <td className="py-3 pr-4 align-top">
        <div className="flex flex-col gap-1">
          {ALL_PERMISSIONS.map((permission) => (
            <label
              key={permission}
              className={`flex items-center gap-2 text-xs ${
                role !== "coadmin" ? "opacity-40" : ""
              }`}
            >
              <input
                type="checkbox"
                disabled={isCurrentUser || role !== "coadmin"}
                checked={role === "coadmin" && permissions.includes(permission)}
                onChange={() => togglePermission(permission)}
              />
              {PERMISSION_LABELS[permission]}
            </label>
          ))}
          {role === "admin" && <span className="text-xs text-muted">Full access</span>}
        </div>
      </td>
      <td className="py-3 align-top">
        <button
          onClick={() => onSave(role, role === "coadmin" ? permissions : [])}
          disabled={isCurrentUser || !isDirty || isSaving}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
        >
          {isSaving ? <Loader2 className="animate-spin" size={14} /> : "Save"}
        </button>
      </td>
    </tr>
  );
}

export function AdminUsersView() {
  const { user: currentUser, isChecking, isAllowed } = useRequireAdmin();
  const { users, filters, setFilters, page, totalPages, setPage, isLoading, savingId, updateAccess } =
    useAdminUsers();

  if (isChecking || !isAllowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Checking your session...
      </div>
    );
  }

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-1">Manage users</h1>
      <p className="text-sm text-muted mb-6">
        Promote a user to co-admin and grant only the permissions they need.
      </p>

      <UserFilterBar filters={filters} onChange={setFilters} />

      {isLoading ? (
        <p className="text-sm text-muted">Loading users...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted">
          {Object.values(filters).some(Boolean) ? "No users match these filters." : "No users yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-border bg-background text-xs uppercase text-muted">
                <th className="py-2 pl-4 pr-4 font-medium">User</th>
                <th className="py-2 pr-4 font-medium">Role</th>
                <th className="py-2 pr-4 font-medium">Permissions</th>
                <th className="py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="px-4">
              {users.map((managedUser) => (
                <UserAccessRow
                  key={managedUser.id}
                  managedUser={managedUser}
                  isCurrentUser={managedUser.id === currentUser?.id}
                  isSaving={savingId === managedUser.id}
                  onSave={(role, permissions) => updateAccess(managedUser.id, { role, permissions })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </main>
  );
}
