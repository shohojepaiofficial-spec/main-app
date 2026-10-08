import axios from "axios";
import Cookies from "js-cookie";
import { ensureSession, writeSessionCookies, withSessionLock } from "./sessionClient";
import { validateMultipartSize } from "./imageUpload";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Uploaded files (product images) are served from the backend's origin at
// `/uploads/...`, not under the `/api` prefix `api`'s baseURL uses.
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
export const toUploadUrl = (path: string) => (path.startsWith("http") ? path : `${API_ORIGIN}${path}`);

export const api = axios.create({
  baseURL: typeof window === "undefined" ? API_BASE_URL : "/api/backend",
  headers: { "X-Requested-With": "ecommerce" },
});

const transport = axios.getAdapter(api.defaults.adapter);
api.defaults.adapter = config => {
  const request = async () => {
    const response = await transport(config);
    if (/^\/auth\//.test(config.url ?? "") && response.status < 400) {
      const data = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
      if (data?.token && data?.refreshToken && data?.user) writeSessionCookies(data);
    }
    return response;
  };
  return /^\/auth\//.test(config.url ?? "") && config.method !== "get" ? withSessionLock(request) : request();
};

api.interceptors.request.use(async (config) => {
  if (typeof FormData !== "undefined" && config.data instanceof FormData) validateMultipartSize(config.data);
  const credentialRequest = /^\/auth\/(login|register|forgot-password|reset-password|2fa\/verify-login)(?:$|\?)/.test(config.url ?? "");
  const token = credentialRequest ? undefined : (await ensureSession())?.token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use((response) => response, async (error) => {
  const config = error.config;
  const code = error.response?.data?.code;
  const sentToken = typeof config?.headers?.Authorization === "string" ? config.headers.Authorization.slice(7) : undefined;
  if (config && code === "ACCESS_TOKEN_EXPIRED" && !config._sessionRetried && sentToken) {
    config._sessionRetried = true;
    const session = await ensureSession(sentToken);
    if (session) return api(config);
  }
  if (["SESSION_REVOKED", "INVALID_ACCESS_TOKEN"].includes(code) && sentToken === Cookies.get("token")) writeSessionCookies(null);
  return Promise.reject(error);
});
