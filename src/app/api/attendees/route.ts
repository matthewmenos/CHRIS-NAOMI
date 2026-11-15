import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const staff = await getSession();
  if (!staff) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const db = getDb();
  const attendees = await db`
    SELECT id, name, phone, guest_count, sms_consent, sms_status, sms_error,
           sms_sent_at, created_at
    FROM attendees ORDER BY created_at DESC
  `;
  return NextResponse.json({ attendees });
}

export async function POST(request: Request) {
  let body: { name?: string; phone?: string; guestCount?: number; smsConsent?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter your RSVP details to continue." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Enter your RSVP details to continue." }, { status: 400 });
  }

  const name = body.name?.trim();
  const phone = body.phone?.trim().replace(/[()\s-]/g, "");
  const guestCount = Number(body.guestCount ?? 1);
  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Please enter your name (up to 120 characters)." }, { status: 400 });
  }
  if (!phone || !/^\+?\d{7,15}$/.test(phone)) {
    return NextResponse.json({ error: "Enter a valid phone number, including the country code if needed." }, { status: 400 });
  }
  if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 10) {
    return NextResponse.json({ error: "Guest count must be between 1 and 10." }, { status: 400 });
  }
  if (body.smsConsent !== true) {
    return NextResponse.json({ error: "Please agree to receive the wedding program by SMS." }, { status: 400 });
  }

  const db = getDb();
  const inserted = await db`
    INSERT INTO attendees (name, phone, guest_count, sms_consent)
    VALUES (${name}, ${phone}, ${guestCount}, TRUE)
    ON CONFLICT (phone) DO NOTHING
    RETURNING id, name, phone, guest_count
  `;
  const attendee = inserted[0] as
    | { id: string; name: string; phone: string; guest_count: number }
    | undefined;
  if (!attendee) {
    return NextResponse.json({
      message: "This phone number is already on the guest list. Please contact the couple if you need to change your RSVP.",
      alreadyRegistered: true,
    });
  }

  return NextResponse.json({
    message: "Your RSVP is saved. The wedding team will send the program by SMS.",
    smsStatus: "pending",
  }, { status: 201 });
}
