import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { DEFAULT_EVENT_AT } from "@/lib/event-time";
import { DEFAULT_WEDDING_PROGRAM, type ProgramCredit, type ProgramItem, type WeddingProgram } from "@/lib/program";

function readProgram(row: Record<string, unknown> | undefined): WeddingProgram {
  if (!row) return DEFAULT_WEDDING_PROGRAM;
  const readArray = (value: unknown) => {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) throw new Error("The saved wedding program is invalid.");
    return parsed;
  };
  const items = readArray(row.items);
  const functionaries = readArray(row.functionaries ?? []);
  const photography = readArray(row.photography ?? []);
  return {
    title: String(row.title),
    subtitle: String(row.subtitle),
    items: items as ProgramItem[],
    functionaries: functionaries as ProgramCredit[],
    photography: photography as ProgramCredit[],
  };
}

type CreditListResult =
  | { ok: true; credits: ProgramCredit[] }
  | { ok: false; error: string };

function validateCredits(value: unknown, section: string): CreditListResult {
  if (!Array.isArray(value) || value.length > 30) {
    return { ok: false, error: `${section} can contain up to 30 entries.` };
  }

  const ids = new Set<string>();
  const credits: ProgramCredit[] = [];
  for (const rawCredit of value) {
    if (!rawCredit || typeof rawCredit !== "object" || Array.isArray(rawCredit)) {
      return { ok: false, error: `Each ${section.toLowerCase()} entry needs a name or role.` };
    }
    const credit = rawCredit as { id?: unknown; title?: unknown; description?: unknown };
    const title = typeof credit.title === "string" ? credit.title.trim() : "";
    const description = typeof credit.description === "string" ? credit.description.trim() : "";
    if (!title || title.length > 120 || description.length > 500) {
      return { ok: false, error: `Each ${section.toLowerCase()} entry needs a name or role, with details under 500 characters.` };
    }
    let id = typeof credit.id === "string" && credit.id.length <= 100 ? credit.id : crypto.randomUUID();
    if (!id || ids.has(id)) id = crypto.randomUUID();
    ids.add(id);
    credits.push({ id, title, description });
  }
  return { ok: true, credits };
}

export async function GET() {
  const staff = await getSession();
  let db;
  try {
    db = getDb();
  } catch (_error) {
    return NextResponse.json({ error: "Database connection failed." }, { status: 500 });
  }
  const [rows, settings] = await Promise.all([
    db`SELECT title, subtitle, items, functionaries, photography FROM wedding_program WHERE id = 1`,
    db`SELECT event_at, show_program FROM wedding_settings WHERE id = 1`,
  ]);
  const eventAt = settings[0] ? new Date(String(settings[0].event_at)) : new Date(DEFAULT_EVENT_AT);
  const eventsVisible = staff?.role === "admin"
    || Boolean(settings[0]?.show_program)
    || eventAt.getTime() <= Date.now();
  try {
    const program = readProgram(rows[0] as Record<string, unknown> | undefined);
    return NextResponse.json({
      program: eventsVisible ? program : { ...program, items: [] },
      eventsVisible,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: "Invalid wedding program data." }, { status: 500 });
  }
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

  const value = body as {
    title?: unknown;
    subtitle?: unknown;
    items?: unknown;
    functionaries?: unknown;
    photography?: unknown;
  };
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

  const functionaries = validateCredits(value.functionaries ?? [], "Functionaries");
  if (!functionaries.ok) return NextResponse.json({ error: functionaries.error }, { status: 400 });
  const photography = validateCredits(value.photography ?? [], "Photography");
  if (!photography.ok) return NextResponse.json({ error: photography.error }, { status: 400 });

  let db;
  try {
    db = getDb();
  } catch (_error) {
    return NextResponse.json({ error: "Database connection failed." }, { status: 500 });
  }
  const rows = await db`
    INSERT INTO wedding_program (id, title, subtitle, items, functionaries, photography)
    VALUES (1, ${title}, ${subtitle}, ${JSON.stringify(items)}::jsonb, ${JSON.stringify(functionaries.credits)}::jsonb, ${JSON.stringify(photography.credits)}::jsonb)
    ON CONFLICT (id) DO UPDATE
    SET title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        items = EXCLUDED.items,
        functionaries = EXCLUDED.functionaries,
        photography = EXCLUDED.photography,
        updated_at = NOW()
    RETURNING title, subtitle, items, functionaries, photography
  `;
  try {
    return NextResponse.json({ program: readProgram(rows[0] as Record<string, unknown>) });
  } catch (error) {
    return NextResponse.json({ error: "Invalid wedding program data." }, { status: 500 });
  }
}
