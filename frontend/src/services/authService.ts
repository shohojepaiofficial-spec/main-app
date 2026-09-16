import { api } from "@/lib/api";
import { DeliveryLocation, MarketingOptIn, User } from "@/models";

interface AuthResponse {
  token: string;
  user: User;
}

export const loginWithEmail = async (email: string, password: string): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
  return data;
};

export const registerWithEmail = async (
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>("/auth/register", { name, email, password });
  return data;
};

// Refreshes role/permissions for an already-logged-in user — see useRefreshUser.
export const getCurrentUser = async (): Promise<User> => {
  const { data } = await api.get<User>("/auth/me");
  return data;
};

export const updateProfile = async (input: {
  name: string;
  phone?: string;
  image?: File;
}): Promise<User> => {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("phone", input.phone ?? "");
  if (input.image) formData.append("image", input.image);

  const { data } = await api.patch<User>("/auth/profile", formData);
  return data;
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  await api.patch("/auth/password", { currentPassword, newPassword });
};

export const updateDeliveryLocation = async (input: DeliveryLocation): Promise<User> => {
  const { data } = await api.patch<User>("/auth/delivery-location", input);
  return data;
};

// Always resolves — the server replies the same way whether or not the
// email is registered, so this can't be used to check who has an account.
export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  const { data } = await api.post<{ message: string }>("/auth/forgot-password", { email });
  return data;
};

export const resetPassword = async (token: string, password: string): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>("/auth/reset-password", { token, password });
  return data;
};

export const verifyEmail = async (token: string): Promise<{ message: string }> => {
  const { data } = await api.post<{ message: string }>("/auth/verify-email", { token });
  return data;
};

export const resendVerificationEmail = async (): Promise<{ message: string }> => {
  const { data } = await api.post<{ message: string }>("/auth/resend-verification");
  return data;
};

export const updateMarketingOptIn = async (input: Partial<MarketingOptIn>): Promise<User> => {
  const { data } = await api.patch<User>("/auth/marketing-opt-in", input);
  return data;
};

// The one-click link at the bottom of a campaign email — public, no login
// required. Only ever turns off email marketing for the linked account.
export const unsubscribeFromMarketing = async (
  uid: string,
  token: string
): Promise<{ message: string }> => {
  const { data } = await api.get<{ message: string }>("/auth/unsubscribe", { params: { uid, token } });
  return data;
};
