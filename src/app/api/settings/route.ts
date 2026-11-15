import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { DEFAULT_EVENT_AT } from "@/lib/event-time";

export async function GET() {
  const db = getDb();
  const rows = await db`SELECT event_at FROM wedding_settings WHERE id = 1`;
  const eventAt = rows[0]
    ? new Date(String(rows[0].event_at)).toISOString()
    : DEFAULT_EVENT_AT;
  return NextResponse.json({ eventAt });
}

export async function PUT(request: Request) {
  const staff = await getSession();
  if (!staff) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (staff.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can change the wedding date." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid wedding date and time." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Enter a valid wedding date and time." }, { status: 400 });
  }
  const eventAt = (body as { eventAt?: unknown }).eventAt;
  if (typeof eventAt !== "string" || !Number.isFinite(Date.parse(eventAt))) {
    return NextResponse.json({ error: "Enter a valid wedding date and time." }, { status: 400 });
  }

  const db = getDb();
  const eventAtIso = new Date(eventAt).toISOString();
  const updated = await db`
    INSERT INTO wedding_settings (id, event_at)
    VALUES (1, ${eventAtIso}::timestamptz)
    ON CONFLICT (id) DO UPDATE
    SET event_at = EXCLUDED.event_at, updated_at = NOW()
    RETURNING event_at
  `;
  return NextResponse.json({ eventAt: new Date(String(updated[0].event_at)).toISOString() });
}
