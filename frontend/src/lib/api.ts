import axios from "axios";
import Cookies from "js-cookie";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Uploaded files (product images) are served from the backend's origin at
// `/uploads/...`, not under the `/api` prefix `api`'s baseURL uses.
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
export const toUploadUrl = (path: string) => (path.startsWith("http") ? path : `${API_ORIGIN}${path}`);

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = Cookies.get("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
