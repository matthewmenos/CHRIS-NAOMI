import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request) {
  const staff = await getSession();
  if (!staff) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter valid attendee details." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Enter valid attendee details." }, { status: 400 });
  }

  const value = body as { id?: unknown; name?: unknown; phone?: unknown; guestCount?: unknown };
  const id = typeof value.id === "string" ? value.id : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const phone = typeof value.phone === "string" ? value.phone.trim().replace(/[()\s-]/g, "") : "";
  const guestCount = Number(value.guestCount);
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Choose an attendee to update." }, { status: 400 });
  }
  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Please enter a name (up to 120 characters)." }, { status: 400 });
  }
  if (!/^\+?\d{7,15}$/.test(phone)) {
    return NextResponse.json({ error: "Enter a valid phone number, including the country code if needed." }, { status: 400 });
  }
  if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 10) {
    return NextResponse.json({ error: "Guest count must be between 1 and 10." }, { status: 400 });
  }

  const db = getDb();
  const owned = await db`
    SELECT id, sms_status FROM attendees
    WHERE id = ${id} AND (${staff.role} = 'admin' OR created_by = ${staff.id})
  `;
  if (!owned[0]) {
    return NextResponse.json({ error: "You can only correct attendee records you entered." }, { status: 404 });
  }
  if (owned[0].sms_status === "sending") {
    return NextResponse.json({ error: "The program SMS is currently sending. Try correcting this entry again shortly." }, { status: 409 });
  }

  const duplicate = await db`
    SELECT id FROM attendees WHERE phone = ${phone} AND id <> ${id} LIMIT 1
  `;
  if (duplicate[0]) {
    return NextResponse.json({ error: "That phone number belongs to another guest record." }, { status: 409 });
  }

  const updated = await db`
    UPDATE attendees
    SET name = ${name}, phone = ${phone}, guest_count = ${guestCount},
        sms_status = 'pending', sms_sent_at = NULL, sms_error = NULL
    WHERE id = ${id}
      AND (${staff.role} = 'admin' OR created_by = ${staff.id})
      AND sms_status <> 'sending'
    RETURNING id
  `;
  if (!updated[0]) {
    return NextResponse.json({ error: "That attendee could not be updated. Check that the SMS is not currently sending." }, { status: 409 });
  }
  return NextResponse.json({ message: "Attendee details updated. The program SMS is pending admin review." });
}
