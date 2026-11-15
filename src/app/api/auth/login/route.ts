import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSession, SESSION_COOKIE, type StaffSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!email || !password || email.length > 254 || password.length > 200) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const db = getDb();
  const rows = await db`
    SELECT id, name, email, password_hash, role
    FROM staff WHERE email = ${email} LIMIT 1
  `;
  const staff = rows[0] as
    | { id: string; name: string; email: string; password_hash: string; role: "admin" | "usher" }
    | undefined;
  if (!staff || !(await compare(password, staff.password_hash))) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  const session: StaffSession = {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
  };
  const token = await createSession(session);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return NextResponse.json({ staff: session });
}
