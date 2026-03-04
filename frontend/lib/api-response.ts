import { NextResponse } from "next/server";
import { ApiResponse } from "@/lib/types";

export function ok<T>(data: T, status = 200) {
  const payload: ApiResponse<T> = { ok: true, data };
  return NextResponse.json(payload, { status });
}

export function fail(code: string, message: string, status = 400) {
  const payload: ApiResponse<never> = {
    ok: false,
    error: {
      code,
      message,
    },
  };

  return NextResponse.json(payload, { status });
}
