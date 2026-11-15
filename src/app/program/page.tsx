"use client";

import { useEffect, useState } from "react";
import ProgramBooklet from "@/components/ProgramBooklet";
import { DEFAULT_EVENT_AT } from "@/lib/event-time";
import { DEFAULT_WEDDING_PROGRAM, type WeddingProgram } from "@/lib/program";

export default function ProgramPage() {
  const [program, setProgram] = useState<WeddingProgram>(DEFAULT_WEDDING_PROGRAM);
  const [eventAt, setEventAt] = useState(DEFAULT_EVENT_AT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/program").then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Couldn't load the wedding program.");
        return result as { program: WeddingProgram };
      }),
      fetch("/api/settings").then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Couldn't load the wedding date.");
        return result as { eventAt: string };
      }),
    ])
      .then(([programResult, settingsResult]) => {
        if (!active) return;
        setProgram(programResult.program);
        setEventAt(settingsResult.eventAt);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "The wedding details are unavailable.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main>
      <ProgramBooklet eventAt={eventAt} error={error} loading={loading} program={program} />
    </main>
  );
}
