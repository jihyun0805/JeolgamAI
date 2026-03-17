import { NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/backend-client";
import { createAuthUser, getAuthUserByLoginId, getProjectById } from "@/lib/store";

interface RegisterRequestBody {
  loginId?: string;
  password?: string;
  name?: string;
}

interface BackendAuthResponse {
  userId: number;
  loginId: string;
  email: string;
  name: string;
  accessToken: string;
  tokenType: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RegisterRequestBody | null;

  const loginId = body?.loginId?.trim();
  const password = body?.password?.trim();
  const name = body?.name?.trim();

  if (!loginId || !password || !name) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_INPUT", message: "모든 항목을 입력해주세요." } },
      { status: 400 },
    );
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /\d/.test(password);

  if (password.length < 8 || !hasLetter || !hasDigit) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "WEAK_PASSWORD",
          message: "비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.",
        },
      },
      { status: 400 },
    );
  }

  if (getAuthUserByLoginId(loginId)) {
    return NextResponse.json(
      { ok: false, error: { code: "DUPLICATE_ID", message: "이미 사용 중인 아이디입니다." } },
      { status: 409 },
    );
  }

  let backendUser: BackendAuthResponse;
  try {
    const response = await fetch(`${getBackendBaseUrl()}/api/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        loginId,
        password,
        name,
      }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          isSuccess?: boolean;
          message?: string;
          data?: BackendAuthResponse;
        }
      | null;

    if (!response.ok || !payload?.isSuccess || !payload.data?.userId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: response.status === 409 ? "DUPLICATE_ID" : "BACKEND_SIGNUP_FAILED",
            message: payload?.message ?? "backend 회원가입에 실패했습니다.",
          },
        },
        { status: response.status >= 400 ? response.status : 400 },
      );
    }

    backendUser = payload.data;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BACKEND_SIGNUP_FAILED",
          message: error instanceof Error ? error.message : "backend 회원가입에 실패했습니다.",
        },
      },
      { status: 502 },
    );
  }

  const user = createAuthUser({
    userId: `backend_user_${backendUser.userId}`,
    loginId,
    password,
    name,
    role: "company_admin",
    backendUserId: String(backendUser.userId),
    email: backendUser.email,
  });

  return NextResponse.json({
    ok: true,
    data: {
      userId: user.userId,
      loginId: user.loginId,
      name: user.name,
      defaultProject: user.defaultProjectId
        ? getProjectById(user.defaultProjectId)
        : null,
    },
  });
}
