import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const staff = await getSession();
  if (!staff) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const db = getDb();
  const templates = await db`
    SELECT id, name, body, updated_at FROM sms_templates
    ORDER BY updated_at DESC LIMIT 1
  `;
  return NextResponse.json({ template: templates[0] ?? null });
}

export async function PUT(request: Request) {
  const staff = await getSession();
  if (!staff) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (staff.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can edit the SMS template." }, { status: 403 });
  }
  let body: { name?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a template name and message." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Enter a template name and message." }, { status: 400 });
  }
  const name = body.name?.trim();
  const message = body.body?.trim();
  if (!name || name.length > 80 || !message || message.length > 1600) {
    return NextResponse.json({ error: "Template name is required and message must be 1–1,600 characters." }, { status: 400 });
  }

  const db = getDb();
  const current = await db`SELECT id FROM sms_templates ORDER BY updated_at DESC LIMIT 1`;
  if (current[0]) {
    await db`
      UPDATE sms_templates SET name = ${name}, body = ${message}, updated_at = NOW()
      WHERE id = ${String(current[0].id)}
    `;
  } else {
    await db`INSERT INTO sms_templates (name, body) VALUES (${name}, ${message})`;
  }
  return NextResponse.json({ message: "SMS template saved." });
}
