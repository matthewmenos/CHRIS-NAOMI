import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const staff = await getSession();
  if (!staff) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Choose a guest party to check in." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Choose a guest party to check in." }, { status: 400 });
  }

  const value = body as { id?: unknown };
  const id = typeof value.id === "string" ? value.id : "";
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Choose a valid guest party to check in." }, { status: 400 });
  }

  const db = getDb();
  const checkedIn = await db`
    UPDATE attendees
    SET checked_in_at = NOW(), checked_in_by = ${staff.id}
    WHERE id = ${id} AND checked_in_at IS NULL
    RETURNING id
  `;
  if (checkedIn[0]) {
    return NextResponse.json({ message: "Guest party checked in." });
  }

  const attendee = await db`
    SELECT checked_in_at FROM attendees WHERE id = ${id}
  `;
  if (!attendee[0]) {
    return NextResponse.json({ error: "Guest party not found." }, { status: 404 });
  }
  return NextResponse.json({ error: "This guest party is already checked in." }, { status: 409 });
}
