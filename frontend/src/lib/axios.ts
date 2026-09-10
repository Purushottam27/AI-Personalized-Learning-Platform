/**
 * Centralized Axios instance.
 *
 * Responsibilities:
 * - withCredentials: true  → sends HttpOnly cookies on every request
 * - Response interceptor   → detects 401 → silent refresh → retry original request
 * - Exposes a structured ApiError shape for consumers
 *
 * This module is intentionally UI-free.  It surfaces structured errors
 * (including ACCOUNT_DEACTIVATED / ACCOUNT_SUSPENDED) upward to callers;
 * AuthContext and React components decide what to render.
 */
import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';

// ─── Structured error shape ────────────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  status: number;
}

export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'status' in err
  );
}

// ─── Axios instance ─────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Refresh-lock ────────────────────────────────────────────────────────────
// Prevent multiple concurrent refresh calls by queuing failed requests.

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
}

// ─── Response interceptor ────────────────────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const status = error.response?.status;
    const data = error.response?.data as Record<string, unknown> | undefined;
    // Backend wraps errors as: { success: false, error: { code, message, details } }
    const backendError = data?.error as Record<string, unknown> | undefined;
    const backendCode = (backendError?.code as string) ?? 'UNKNOWN_ERROR';
    const backendMessage = (backendError?.message as string) ?? 'An unexpected error occurred.';

    // ── Build structured error ───────────────────────────────────────────────
    const structuredError: ApiError = {
      code: backendCode,
      message: backendMessage,
      status: status ?? 0,
    };

    // ── 401 → attempt silent refresh, then retry ─────────────────────────────
    // Skip refresh if:
    //   - already retried (prevent infinite loop)
    //   - the failing request *is* the refresh endpoint itself
    const isRefreshEndpoint = originalRequest.url?.includes('/auth/refresh');

    if (status === 401 && !originalRequest._retry && !isRefreshEndpoint) {
      if (isRefreshing) {
        // Another refresh is already in-flight; queue this request.
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch(() => Promise.reject(structuredError));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
        processQueue(null);
        isRefreshing = false;
        return api(originalRequest);
      } catch (_refreshError) {
        processQueue(_refreshError);
        isRefreshing = false;
        // Refresh failed → surface a SESSION_EXPIRED error so AuthContext
        // can clear state and redirect to login.
        const sessionExpiredError: ApiError = {
          code: 'SESSION_EXPIRED',
          message: 'Your session has expired. Please log in again.',
          status: 401,
        };
        return Promise.reject(sessionExpiredError);
      }
    }

    return Promise.reject(structuredError);
  }
);

export default api;

// Named re-export for convenience
export { api };
