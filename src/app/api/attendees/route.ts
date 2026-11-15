import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { renderTemplate, sendSms, toMnotifyPhone } from "@/lib/mnotify";

export const maxDuration = 60;

export async function GET() {
  const staff = await getSession();
  if (!staff) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (staff.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can view the guest list." }, { status: 403 });
  }
  const db = getDb();
  const attendees = await db`
    SELECT id, name, phone, guest_count, sms_consent, sms_status, sms_error,
           sms_sent_at, created_at
    FROM attendees ORDER BY created_at DESC
  `;
  return NextResponse.json({ attendees });
}

export async function POST(request: Request) {
  let body: { name?: string; phone?: string; guestCount?: number };
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
  const staff = await getSession();
  const shouldSendSms = staff?.role === "usher";
  const db = getDb();
  const templates = shouldSendSms
    ? await db`SELECT body FROM sms_templates ORDER BY updated_at DESC LIMIT 1`
    : [];
  const templateBody = templates[0] ? String(templates[0].body).trim() : "";
  const inserted = await db`
    INSERT INTO attendees (name, phone, guest_count, sms_consent, sms_status)
    VALUES (${name}, ${phone}, ${guestCount}, TRUE, ${shouldSendSms ? "sending" : "pending"})
    ON CONFLICT (phone) DO NOTHING
    RETURNING id, name, phone, guest_count, sms_status
  `;
  const attendee = inserted[0] as
    | { id: string; name: string; phone: string; guest_count: number; sms_status: string }
    | undefined;
  if (!attendee) {
    return NextResponse.json({
      message: "This phone number is already on the guest list. Please contact the couple if you need to change your RSVP.",
      alreadyRegistered: true,
    });
  }

  if (shouldSendSms) {
    let smsError = "";
    if (!templateBody) {
      smsError = "No SMS template exists. Ask the administrator to save one.";
    } else {
      try {
        const result = await sendSms(
          [toMnotifyPhone(attendee.phone)],
          renderTemplate(templateBody, attendee),
        );
        const sentNumbers = result.summary?.numbers_sent?.map(toMnotifyPhone);
        const confirmed = sentNumbers
          ? sentNumbers.includes(toMnotifyPhone(attendee.phone))
          : result.summary?.total_sent === 1;
        if (confirmed) {
          await db`
            UPDATE attendees
            SET sms_status = 'sent', sms_sent_at = NOW(), sms_error = NULL
            WHERE id = ${attendee.id}
          `;
          return NextResponse.json({
            saved: true,
            message: "Attendee saved and the program SMS was sent.",
            smsStatus: "sent",
          }, { status: 201 });
        }
        smsError = "mNotify did not confirm this number as sent.";
      } catch (error) {
        smsError = error instanceof Error ? error.message : "mNotify request failed.";
      }
    }

    await db`
      UPDATE attendees
      SET sms_status = 'failed', sms_error = ${smsError.slice(0, 500)}
      WHERE id = ${attendee.id}
    `;
    return NextResponse.json({
      saved: true,
      message: `Attendee saved, but the SMS could not be sent: ${smsError}`,
      smsStatus: "failed",
    }, { status: 201 });
  }

  return NextResponse.json({
    saved: true,
    message: "Your RSVP is saved. The wedding team will send the program by SMS.",
    smsStatus: "pending",
  }, { status: 201 });
}
