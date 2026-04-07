type ApiError = {
  message?: string;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8080';

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {})
    }
  });

  if (!res.ok) {
    const body = (await parseJsonSafe(res)) as ApiError | null;
    const message = body?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;

  const json = (await parseJsonSafe(res)) as T | null;
  return (json ?? (undefined as T));
}

