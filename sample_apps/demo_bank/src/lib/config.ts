export const API_BASE_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: Record<string, string> }).env?.VITE_FASTAPI_URL) ||
  "http://10.29.67.5:8000";
