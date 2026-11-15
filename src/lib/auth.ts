import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "wedding_session";
export type StaffRole = "admin" | "usher";
export type StaffSession = { id: string; name: string; email: string; role: StaffRole };

function sessionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(staff: StaffSession) {
  return new SignJWT(staff)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(staff.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(sessionKey());
}

export async function getSession(): Promise<StaffSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      (payload.role !== "admin" && payload.role !== "usher")
    ) {
      return null;
    }
    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function isStaffSession(value: StaffSession | null): value is StaffSession {
  return value !== null;
}
