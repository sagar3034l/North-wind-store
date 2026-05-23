import * as Sentry from "@sentry/react";

const raw = import.meta.env.VITE_API_URL;
const base = typeof raw === "string" ? raw.replace(/\/+$/, "") : ""; // remove trailing slashes

// this is an authenticated fetch req that we use to send reqs to our api
export async function apiFetch(path, opts = {}) {
  const { getToken, method = "GET", body } = opts;
  const headers = { "Content-Type": "application/json" };

  if (getToken) {
    const token = await getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let res;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    Sentry.addBreadcrumb({
      category: "api",
      message: `${method} ${path}`,
      level: "error",
      data: { network: true },
    });

    Sentry.captureException(e, {
      tags: { "api.fetch": "network" },
      extra: { path, method },
    });

    throw e;
  }

  const contentType = res.headers.get("content-type") ?? "";
  const raw = await res.text();

  if (!contentType.includes("application/json")) {
    const preview = raw.slice(0, 160).replace(/\s+/g, " ").trim();
    throw new Error(
      `Expected JSON from ${method} ${path}, but received ${contentType || "an unknown content type"}${preview ? `: ${preview}` : ""}`,
    );
  }

  const data = raw ? JSON.parse(raw) : null;

  Sentry.addBreadcrumb({
    category: "api",
    message: `${method} ${path}`,
    level: res.ok ? "info" : "warning",
    data: { status: res.status },
  });

  if (!res.ok) {
    const msg = typeof data?.error === "string" ? data.error : res.statusText;
    const err = new Error(typeof msg === "string" ? msg : "Request failed");

    if (res.status >= 500) {
      Sentry.captureException(err, {
        tags: { "api.fetch": "http", "http.status": String(res.status) },
        extra: { path, method, status: res.status },
      });
    }

    throw err;
  }

  return data;
}
