type MnotifyResponse = {
  status?: string;
  code?: string;
  message?: string;
  summary?: { total_sent?: number; numbers_sent?: string[] };
};

export async function sendSms(recipients: string[], message: string): Promise<MnotifyResponse> {
  const apiKey = process.env.MNOTIFY_API_KEY;
  const sender = process.env.MNOTIFY_SENDER_ID;
  if (!apiKey || !sender) {
    throw new Error("mNotify is not configured. Add MNOTIFY_API_KEY and MNOTIFY_SENDER_ID.");
  }
  if (sender.length > 11) throw new Error("MNOTIFY_SENDER_ID must be 11 characters or fewer.");
  if (!recipients.length) throw new Error("There are no recipients to message.");

  const response = await fetch(
    `https://api.mnotify.com/api/sms/quick?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: recipients,
        sender,
        message,
        is_schedule: false,
        schedule_date: "",
      }),
      signal: AbortSignal.timeout(20_000),
    },
  );
  const result = (await response.json().catch(() => null)) as MnotifyResponse | null;
  const providerAccepted = result?.status?.toLowerCase() === "success" || result?.code === "2000";
  if (!response.ok || !providerAccepted || !result) {
    throw new Error(result?.message || `mNotify request failed with status ${response.status}.`);
  }
  return result;
}

export function renderTemplate(body: string, attendee: { name: string; guest_count: number }) {
  return body
    .replaceAll("{name}", attendee.name.trim().split(/\s+/)[0] || attendee.name)
    .replaceAll("{guests}", String(attendee.guest_count));
}

export function toMnotifyPhone(phone: string) {
  return phone.replace(/\D/g, "");
}
