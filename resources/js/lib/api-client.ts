/**
 * Thin fetch wrapper for the Laravel API. Uses Sanctum cookie-session
 * authentication with same-origin credentials and CSRF tokens, serializes
 * JSON bodies, and turns Laravel's error envelope (`{message, errors}`)
 * into a typed ApiError.
 *
 * Callers get back the raw parsed JSON body — Laravel's JsonResource wraps
 * single resources as `{data: T}` and collections as `{data: T[], links,
 * meta}`, so feature `*-api.ts` modules unwrap `.data` themselves rather than
 * this file guessing at the shape.
 */

const API_URL = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "")

export function getXsrfToken(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/(^|;)\s*XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[2]) : null
}

export class ApiError extends Error {
  status: number
  errors?: Record<string, string[]>
  /**
   * Machine-readable reason some endpoints add next to `message` — e.g. the
   * UIS print returns 409 `{code: "uis_no_assessment"}` so the UI can offer
   * "Assess" instead of a generic failure.
   */
  code?: string

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[]>,
    code?: string,
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.errors = errors
    this.code = code
  }

  /** First validation message, if any — handy for a single-line toast. */
  get firstValidationMessage(): string | undefined {
    if (!this.errors) return undefined
    const firstKey = Object.keys(this.errors)[0]
    return firstKey ? this.errors[firstKey]?.[0] : undefined
  }
}

export type QueryParams = Record<
  string,
  string | number | boolean | undefined | null
>

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  params?: QueryParams
  /** Nested `filter[key]=value` params, per the backend's ListQuery contract. */
  filters?: QueryParams
  signal?: AbortSignal
}

export function buildUrl(path: string, options: RequestOptions): string {
  const cleanPath = path.replace(/^\//, "")
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(options.params ?? {})) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }

  for (const [key, value] of Object.entries(options.filters ?? {})) {
    if (value === undefined || value === null || value === "") continue
    search.set(`filter[${key}]`, String(value))
  }

  const qs = search.toString()
  return `${API_URL}/${cleanPath}${qs ? `?${qs}` : ""}`
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const xsrfToken = getXsrfToken()
  const hasBody = options.body !== undefined

  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  }

  if (hasBody) {
    headers["Content-Type"] = "application/json"
  }

  if (xsrfToken) {
    headers["X-XSRF-TOKEN"] = xsrfToken
  }

  const res = await fetch(buildUrl(path, options), {
    method: options.method ?? "GET",
    signal: options.signal,
    credentials: "same-origin",
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined,
  })

  if (res.status === 204) {
    return undefined as T
  }

  const contentType = res.headers.get("content-type") ?? ""
  const payload = contentType.includes("application/json")
    ? await res.json().catch(() => undefined)
    : undefined

  if (!res.ok) {
    if ((res.status === 401 || res.status === 419) && typeof window !== "undefined") {
      if (window.location.pathname !== "/login") {
        window.location.href = "/login"
      }
    }

    throw new ApiError(
      payload?.message ?? res.statusText ?? "Request failed",
      res.status,
      payload?.errors,
      payload?.code,
    )
  }

  return payload as T
}

/**
 * For endpoints that return a binary body (the case PDFs, e.g. the UIS) rather
 * than JSON.
 */
export async function fetchBlob(path: string, params?: QueryParams): Promise<Blob> {
  const xsrfToken = getXsrfToken()

  const headers: Record<string, string> = {
    Accept: "application/pdf, application/json",
    "X-Requested-With": "XMLHttpRequest",
  }

  if (xsrfToken) {
    headers["X-XSRF-TOKEN"] = xsrfToken
  }

  const res = await fetch(buildUrl(path, { params }), {
    credentials: "same-origin",
    headers,
  })

  if (!res.ok) {
    if ((res.status === 401 || res.status === 419) && typeof window !== "undefined") {
      if (window.location.pathname !== "/login") {
        window.location.href = "/login"
      }
    }

    const contentType = res.headers.get("content-type") ?? ""
    const payload = contentType.includes("application/json")
      ? await res.json().catch(() => undefined)
      : undefined

    throw new ApiError(
      payload?.message ?? (res.statusText || "Request failed"),
      res.status,
      payload?.errors,
      payload?.code,
    )
  }

  return res.blob()
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "POST", body }),

  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PUT", body }),

  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "DELETE" }),
}
