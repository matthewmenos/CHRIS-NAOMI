import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { renderTemplate, sendSms, toMnotifyPhone } from "@/lib/mnotify";

export const maxDuration = 60;

export async function POST(request: Request) {
  const staff = await getSession();
  if (!staff) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (staff.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can send the program SMS." }, { status: 403 });
  }
  if (!process.env.MNOTIFY_API_KEY || !process.env.MNOTIFY_SENDER_ID) {
    return NextResponse.json({ error: "Add MNOTIFY_API_KEY and MNOTIFY_SENDER_ID to enable SMS." }, { status: 503 });
  }

  let body: { audience?: string; excludeIds?: string[] } = {};
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid send request." }, { status: 400 });
    }
    body = parsed as { audience?: string; excludeIds?: string[] };
  } catch {
    return NextResponse.json({ error: "Invalid send request." }, { status: 400 });
  }
  const audience = body.audience ?? "pending";
  const excludeIds = body.excludeIds ?? [];
  if (
    (audience !== "pending" && audience !== "all") ||
    !Array.isArray(excludeIds) ||
    excludeIds.length > 10000 ||
    excludeIds.some((id) => typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
  ) {
    return NextResponse.json({ error: "Invalid send request." }, { status: 400 });
  }

  const db = getDb();
  const selected = await db`
    UPDATE attendees
    SET sms_status = 'sending', sms_error = NULL
    WHERE id IN (
      SELECT id FROM attendees
      WHERE sms_consent = TRUE
        AND sms_status <> 'sending'
        AND (${audience} = 'all' OR sms_status IN ('pending', 'failed'))
        AND id <> ALL(${excludeIds}::uuid[])
      ORDER BY created_at
      LIMIT 100
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, name, phone, guest_count
  `;
  const attendees = selected as Array<{
    id: string;
    name: string;
    phone: string;
    guest_count: number;
  }>;
  if (!attendees.length) {
    return NextResponse.json({ sent: 0, failed: 0, processedIds: [], remaining: false, message: "There are no messages to send." });
  }

  const templates = await db`SELECT body FROM sms_templates ORDER BY updated_at DESC LIMIT 1`;
  if (!templates[0] || !String(templates[0].body).trim()) {
    await db`
      UPDATE attendees SET sms_status = 'failed', sms_error = 'No SMS template exists.'
      WHERE id = ANY(${attendees.map((attendee) => attendee.id)}::uuid[])
    `;
    return NextResponse.json({ error: "Save an SMS template before sending." }, { status: 400 });
  }

  const batches = new Map<string, string[]>();
  const idsByMessage = new Map<string, string[]>();
  for (const attendee of attendees) {
    const message = renderTemplate(String(templates[0].body), attendee);
    batches.set(message, [...(batches.get(message) ?? []), toMnotifyPhone(attendee.phone)]);
    idsByMessage.set(message, [...(idsByMessage.get(message) ?? []), attendee.id]);
  }

  let sent = 0;
  let failed = 0;
  let lastError = "";
  for (const [message, recipients] of batches) {
    const ids = idsByMessage.get(message) ?? [];
    let result: Awaited<ReturnType<typeof sendSms>>;
    try {
      result = await sendSms(recipients, message);
    } catch (error) {
      lastError = error instanceof Error ? error.message : "mNotify request failed.";
      await db`
        UPDATE attendees SET sms_status = 'failed', sms_error = ${lastError.slice(0, 500)}
        WHERE id = ANY(${ids}::uuid[])
      `;
      failed += recipients.length;
      continue;
    }

    const acceptedPhones = result.summary?.numbers_sent
      ? new Set(result.summary.numbers_sent.map(toMnotifyPhone))
      : result.summary?.total_sent === recipients.length
        ? new Set(recipients)
        : new Set<string>();
    const acceptedIds = attendees
      .filter((attendee) => ids.includes(attendee.id) && acceptedPhones.has(toMnotifyPhone(attendee.phone)))
      .map((attendee) => attendee.id);
    const rejectedIds = ids.filter((id) => !acceptedIds.includes(id));
    if (acceptedIds.length) {
      await db`
        UPDATE attendees SET sms_status = 'sent', sms_sent_at = NOW(), sms_error = NULL
        WHERE id = ANY(${acceptedIds}::uuid[])
      `;
    }
    if (rejectedIds.length) {
      await db`
        UPDATE attendees
        SET sms_status = 'failed', sms_error = 'mNotify did not confirm this number as sent.'
        WHERE id = ANY(${rejectedIds}::uuid[])
      `;
    }
    sent += acceptedIds.length;
    failed += rejectedIds.length;
  }

  return NextResponse.json({
    sent,
    failed,
    remaining: attendees.length === 100,
    processedIds: attendees.map((attendee) => attendee.id),
    message: failed
      ? `${sent} message${sent === 1 ? "" : "s"} sent; ${failed} failed. ${lastError || "Check the mNotify response and retry failed messages."}`
      : `${sent} program message${sent === 1 ? "" : "s"} sent successfully.`,
  });
}
