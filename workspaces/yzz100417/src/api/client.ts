export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
}

const DEFAULT_TIMEOUT = 10000;
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { params, timeout = DEFAULT_TIMEOUT, headers, body, ...rest } = options;

  const url = `${BASE_URL}${endpoint}${params ? buildQueryString(params) : ""}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data: ApiResponse<T>;
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = {
        success: response.ok,
        data: text as unknown as T,
        message: response.statusText,
      };
    }

    if (!response.ok || !data.success) {
      throw {
        message: data.message || `请求失败: ${response.status}`,
        status: response.status,
      } as ApiError;
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if ((error as Error).name === "AbortError") {
      throw {
        message: "请求超时，请稍后重试",
        code: "TIMEOUT",
      } as ApiError;
    }

    throw error as ApiError;
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "POST", body: body as BodyInit }),

  put: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "PUT", body: body as BodyInit }),

  patch: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "PATCH", body: body as BodyInit }),

  delete: <T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};

export function createApiError(message: string, status?: number): ApiError {
  return { message, status };
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as ApiError).message === "string"
  );
}
