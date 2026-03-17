import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const passwordHash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return {
    passwordHash,
    passwordSalt: salt,
  };
}

export function verifyPassword(params: {
  password: string;
  passwordHash: string;
  passwordSalt: string;
}) {
  const expected = Buffer.from(params.passwordHash, "hex");
  const actual = Buffer.from(
    scryptSync(params.password, params.passwordSalt, KEY_LENGTH).toString("hex"),
    "hex",
  );

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}
