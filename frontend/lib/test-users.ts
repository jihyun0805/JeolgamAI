import { UserRole } from "@/lib/types";

export interface TestAccountSeed {
  loginId: string;
  password: string;
  name: string;
  role: UserRole;
}

export const TEST_ACCOUNT: TestAccountSeed = {
  loginId: "testuser",
  password: "test1234",
  name: "테스트 사용자",
  role: "company_admin",
};
