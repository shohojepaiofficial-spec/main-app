import { api } from "@/lib/api";
import { ManagedUser, Permission, UserRole } from "@/models";

export const getUsers = async (): Promise<ManagedUser[]> => {
  const { data } = await api.get<ManagedUser[]>("/users");
  return data;
};

export const updateUserAccess = async (
  id: string,
  access: { role?: UserRole; permissions?: Permission[] }
): Promise<ManagedUser> => {
  const { data } = await api.patch<ManagedUser>(`/users/${id}/access`, access);
  return data;
};
