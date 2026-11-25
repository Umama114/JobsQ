// Small helper for calling the JobsQ API. Errors come back as readable messages.
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const PUBLIC = ["/login", "/register", "/forgot", "/reset", "/verify", "/dev-inbox"];

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: opts.method || (opts.body || opts.form ? "POST" : "GET"),
      credentials: "include",
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      body: opts.form ? opts.form : opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach JobsQ. Check your internet connection and try again.");
  }
  // Signed out (session expired) while using the app: go to the sign-in page.
  if (res.status === 401 && !path.startsWith("/v1/auth/") && typeof window !== "undefined" && !PUBLIC.some((p) => window.location.pathname.startsWith(p))) {
    window.location.href = "/login";
  }
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const d = data?.detail;
    const msg = typeof d === "string" ? d : Array.isArray(d) ? d.map((x: any) => x.msg).join(", ")
      : res.status >= 500 ? "Something went wrong on our side. Try again in a minute." : `Something went wrong (${res.status}).`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleString() : "");
