interface BackendEnvelope<T> {
  isSuccess: boolean;
  statusCode: number;
  message: string;
  data: T;
}

const DEFAULT_BACKEND_BASE_URL = "http://localhost:8081";

export function getBackendBaseUrl(): string {
  return process.env.BACKEND_BASE_URL?.trim() || DEFAULT_BACKEND_BASE_URL;
}

interface BackendRequestOptions {
  accessToken?: string;
}

export async function postBackendJson<TResponse>(
  path: string,
  body: object,
  options?: BackendRequestOptions,
): Promise<TResponse> {
  return requestBackendJson<TResponse>(
    path,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    options,
  );
}

export async function getBackendJson<TResponse>(
  path: string,
  options?: BackendRequestOptions,
): Promise<TResponse> {
  return requestBackendJson<TResponse>(
    path,
    {
      method: "GET",
    },
    options,
  );
}

async function requestBackendJson<TResponse>(
  path: string,
  init: RequestInit,
  options?: BackendRequestOptions,
): Promise<TResponse> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (options?.accessToken) {
    headers.set("Authorization", `Bearer ${options.accessToken}`);
  }

  const response = await fetch(`${getBackendBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | BackendEnvelope<TResponse>
    | null;

  if (!response.ok || !payload?.isSuccess) {
    throw new Error(payload?.message ?? `backend 요청에 실패했습니다. status=${response.status}`);
  }

  return payload.data;
}
