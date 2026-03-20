"use client";

import axios from "axios";
import { clearSession, getStoredSession } from "./jwt-store";

export const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const session = getStoredSession();
  if (session) {
    config.headers.Authorization = `Bearer ${session.token}`;
    config.headers["X-User-Id"] = session.userId;
    config.headers["X-User-Name"] = encodeURIComponent(session.name);
    config.headers["X-User-Role"] = session.role;
    config.headers["X-Workspace-Id"] = session.workspaceId;
    config.headers["X-Expires-At"] = session.expiresAt;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSession();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
