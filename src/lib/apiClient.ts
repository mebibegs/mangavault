"use client";

let csrfToken: string | null = null;
let fetchingToken: Promise<string> | null = null;

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (fetchingToken) return fetchingToken;

  fetchingToken = fetch("/api/csrf", { credentials: "same-origin" })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch CSRF token");
      return res.json();
    })
    .then((data: { token: string }) => {
      csrfToken = data.token;
      fetchingToken = null;
      // Auto-refresh at 55 minutes (before 1-hour expiry)
      setTimeout(() => { csrfToken = null; }, 55 * 60 * 1000);
      return csrfToken!;
    })
    .catch((err) => {
      fetchingToken = null;
      throw err;
    });

  return fetchingToken;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getCsrfToken();

  const res = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      "X-CSRF-Token": token,
      ...(options.headers || {}),
    },
  });

  if (res.status === 403) {
    csrfToken = null;
    throw new Error("API access forbidden — CSRF token may have expired");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}
