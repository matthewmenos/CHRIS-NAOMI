import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { renderTemplate, sendSms, toMnotifyPhone } from "@/lib/mnotify";

export const maxDuration = 60;

export async function GET() {
  const staff = await getSession();
  if (!staff) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const db = getDb();
  const attendees = await db`
    SELECT a.id, a.name, a.phone, a.guest_count, a.sms_status, a.sms_error,
           a.sms_sent_at, a.created_at, a.created_by, creator.name AS entered_by_name,
           a.checked_in_at, a.checked_in_by, checker.name AS checked_in_by_name
    FROM attendees a
    LEFT JOIN staff creator ON creator.id = a.created_by
    LEFT JOIN staff checker ON checker.id = a.checked_in_by
    ORDER BY a.created_at DESC
  `;
  if (staff.role === "admin") return NextResponse.json({ attendees });
  return NextResponse.json({
    attendees: attendees.map((attendee) => ({
      id: attendee.id,
      name: attendee.name,
      phone: attendee.phone,
      guest_count: attendee.guest_count,
      sms_status: attendee.sms_status,
      sms_sent_at: attendee.sms_sent_at,
      created_at: attendee.created_at,
      created_by: attendee.created_by,
      entered_by_name: attendee.entered_by_name,
      checked_in_at: attendee.checked_in_at,
      checked_in_by: attendee.checked_in_by,
      checked_in_by_name: attendee.checked_in_by_name,
    })),
  });
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
  const usherId = staff?.role === "usher" ? staff.id : null;
  const shouldSendSms = usherId !== null;
  const db = getDb();
  const templates = shouldSendSms
    ? await db`SELECT body FROM sms_templates ORDER BY updated_at DESC LIMIT 1`
    : [];
  const templateBody = templates[0] ? String(templates[0].body).trim() : "";
  const inserted = await db`
    INSERT INTO attendees (name, phone, guest_count, sms_consent, sms_status, created_by)
    VALUES (${name}, ${phone}, ${guestCount}, TRUE, ${shouldSendSms ? "sending" : "pending"}, ${usherId})
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
