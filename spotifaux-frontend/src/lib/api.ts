// src/lib/api.ts

export const API_BASE =
  (import.meta as any)?.env?.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Parse response as JSON when content-type matches, otherwise as text.
 * Return null for 204 No Content.
 */
async function parseResponse(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (res.status === 204) return null;
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

/**
 * Throw a uniform error including server-provided detail if available.
 */
async function throwHttpError(res: Response, path: string): Promise<never> {
  let body: unknown = null;
  try {
    body = await parseResponse(res);
  } catch {}
  const detail =
    typeof body === "string"
      ? body
      : body && typeof body === "object" && "detail" in (body as any)
      ? String((body as any).detail)
      : "";
  const msg = `HTTP ${res.status} on ${path}${detail ? ` – ${detail}` : ""}`;
  throw new Error(msg);
}

/**
 * GET with credentials (sends cookies).
 */
export async function getJSON<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) await throwHttpError(res, path);
  return parseResponse(res) as Promise<T>;
}

/**
 * POST with optional JSON body and credentials.
 */
export async function postJSON<T>(path: string, body?: unknown): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) await throwHttpError(res, path);
  return parseResponse(res) as Promise<T>;
}

/**
 * PUT with optional JSON body and credentials.
 */
export async function putJSON<T>(path: string, body?: unknown): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) await throwHttpError(res, path);
  return parseResponse(res) as Promise<T>;
}

/**
 * DELETE with credentials. May return 204 or JSON.
 */
export async function deleteJSON<T = null>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) await throwHttpError(res, path);
  return parseResponse(res) as Promise<T>;
}
