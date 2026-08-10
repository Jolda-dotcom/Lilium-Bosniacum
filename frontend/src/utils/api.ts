export interface FetchJsonError extends Error {
  status?: number;
  body?: unknown;
}

export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const error = new Error(response.statusText) as FetchJsonError;
    error.status = response.status;
    error.body = data;
    throw error;
  }

  return data as T;
}
