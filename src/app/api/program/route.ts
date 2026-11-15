import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { DEFAULT_WEDDING_PROGRAM, type ProgramItem, type WeddingProgram } from "@/lib/program";

function readProgram(row: Record<string, unknown> | undefined): WeddingProgram {
  if (!row) return DEFAULT_WEDDING_PROGRAM;
  const rawItems = row.items;
  const items = typeof rawItems === "string" ? JSON.parse(rawItems) : rawItems;
  if (!Array.isArray(items)) throw new Error("The saved wedding program is invalid.");
  return {
    title: String(row.title),
    subtitle: String(row.subtitle),
    items: items as ProgramItem[],
  };
}

export async function GET() {
  const db = getDb();
  const rows = await db`SELECT title, subtitle, items FROM wedding_program WHERE id = 1`;
  return NextResponse.json({ program: readProgram(rows[0] as Record<string, unknown> | undefined) });
}

export async function PUT(request: Request) {
  const staff = await getSession();
  if (!staff) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (staff.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can edit the wedding program." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid wedding program." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Enter a valid wedding program." }, { status: 400 });
  }

  const value = body as { title?: unknown; subtitle?: unknown; items?: unknown };
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const subtitle = typeof value.subtitle === "string" ? value.subtitle.trim() : "";
  if (!title || title.length > 100 || subtitle.length > 200) {
    return NextResponse.json({ error: "Add a title (up to 100 characters) and a welcome message (up to 200 characters)." }, { status: 400 });
  }
  if (!Array.isArray(value.items) || value.items.length > 30) {
    return NextResponse.json({ error: "The program can contain up to 30 events." }, { status: 400 });
  }

  const ids = new Set<string>();
  const items: ProgramItem[] = [];
  for (const rawItem of value.items) {
    if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
      return NextResponse.json({ error: "Each event needs a time and title." }, { status: 400 });
    }
    const item = rawItem as { id?: unknown; time?: unknown; title?: unknown; description?: unknown };
    const time = typeof item.time === "string" ? item.time.trim() : "";
    const itemTitle = typeof item.title === "string" ? item.title.trim() : "";
    const description = typeof item.description === "string" ? item.description.trim() : "";
    if (!time || time.length > 40 || !itemTitle || itemTitle.length > 100 || description.length > 500) {
      return NextResponse.json({ error: "Each event needs a time and title. Keep details under 500 characters." }, { status: 400 });
    }
    let id = typeof item.id === "string" && item.id.length <= 100 ? item.id : crypto.randomUUID();
    if (!id || ids.has(id)) id = crypto.randomUUID();
    ids.add(id);
    items.push({ id, time, title: itemTitle, description });
  }

  const db = getDb();
  const rows = await db`
    INSERT INTO wedding_program (id, title, subtitle, items)
    VALUES (1, ${title}, ${subtitle}, ${JSON.stringify(items)}::jsonb)
    ON CONFLICT (id) DO UPDATE
    SET title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        items = EXCLUDED.items,
        updated_at = NOW()
    RETURNING title, subtitle, items
  `;
  return NextResponse.json({ program: readProgram(rows[0] as Record<string, unknown>) });
}
