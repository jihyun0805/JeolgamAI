interface BackendEnvelope<T> {
  isSuccess: boolean;
  statusCode: number;
  message: string;
  data: T;
}

const DEFAULT_BACKEND_BASE_URL = "http://127.0.0.1:8081";
const DEFAULT_BACKEND_BASIC_USERNAME = "jeolgamai_local";
const DEFAULT_BACKEND_BASIC_PASSWORD = "jeolgamai-local-dev-only";

function getBackendBaseUrl(): string {
  return process.env.BACKEND_BASE_URL?.trim() || DEFAULT_BACKEND_BASE_URL;
}

function buildBackendAuthHeader(): string {
  const username =
    process.env.BACKEND_BASIC_USERNAME?.trim() || DEFAULT_BACKEND_BASIC_USERNAME;
  const password =
    process.env.BACKEND_BASIC_PASSWORD?.trim() || DEFAULT_BACKEND_BASIC_PASSWORD;
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

export async function postBackendJson<TResponse>(
  path: string,
  body: object,
): Promise<TResponse> {
  return requestBackendJson<TResponse>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function getBackendJson<TResponse>(path: string): Promise<TResponse> {
  return requestBackendJson<TResponse>(path, {
    method: "GET",
  });
}

async function requestBackendJson<TResponse>(
  path: string,
  init: RequestInit,
): Promise<TResponse> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", buildBackendAuthHeader());
  headers.set("Accept", "application/json");

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
