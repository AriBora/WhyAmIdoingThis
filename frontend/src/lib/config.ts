export const BACKEND_URL =
    (typeof import.meta !== "undefined" &&
        (import.meta as { env?: Record<string, string> }).env?.VITE_BACKEND_URL);