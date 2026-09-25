import { api } from "@/lib/api";
import { ManagedUser, Paginated, Permission, UserRole } from "@/models";

export interface GetUsersParams {
  search?: string;
  role?: UserRole;
  permission?: Permission;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export const getUsers = async (params?: GetUsersParams): Promise<Paginated<ManagedUser>> => {
  const { data } = await api.get<Paginated<ManagedUser>>("/users", { params });
  return data;
};

export const updateUserAccess = async (
  id: string,
  access: { role?: UserRole; permissions?: Permission[] }
): Promise<ManagedUser> => {
  const { data } = await api.patch<ManagedUser>(`/users/${id}/access`, access);
  return data;
};
