import { NextResponse } from "next/server";
import { createAuthUser, getAuthUserByLoginId } from "@/lib/store";

interface RegisterRequestBody {
  loginId?: string;
  password?: string;
  name?: string;
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

  if (password.length < 4) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "WEAK_PASSWORD", message: "비밀번호는 4자 이상이어야 합니다." },
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

  const user = createAuthUser({
    loginId,
    password,
    name,
    role: "company_admin",
  });

  return NextResponse.json({
    ok: true,
    data: {
      userId: user.userId,
      loginId: user.loginId,
      name: user.name,
    },
  });
}
