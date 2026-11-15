import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const staff = await getSession();
  if (!staff) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (staff.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can manage staff accounts." }, { status: 403 });
  }
  const db = getDb();
  const team = await db`
    SELECT id, name, email, role, created_at FROM staff ORDER BY created_at ASC
  `;
  return NextResponse.json({ team });
}

export async function POST(request: Request) {
  const staff = await getSession();
  if (!staff) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (staff.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can create usher accounts." }, { status: 403 });
  }
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter the usher's name, email, and password." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Enter the usher's name, email, and password." }, { status: 400 });
  }
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!name || name.length > 120 || !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid name and email address." }, { status: 400 });
  }
  if (!password || password.length < 12 || password.length > 200) {
    return NextResponse.json({ error: "Use a password of at least 12 characters." }, { status: 400 });
  }

  const db = getDb();
  const passwordHash = await hash(password, 12);
  const created = await db`
    INSERT INTO staff (name, email, password_hash, role)
    VALUES (${name}, ${email}, ${passwordHash}, 'usher')
    ON CONFLICT (email) DO NOTHING
    RETURNING id, name, email, role, created_at
  `;
  if (!created[0]) {
    return NextResponse.json({ error: "A staff account with that email already exists." }, { status: 409 });
  }
  return NextResponse.json({ staff: created[0] }, { status: 201 });
}
