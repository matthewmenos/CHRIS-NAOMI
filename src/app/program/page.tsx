"use client";

import { useEffect, useState } from "react";
import ProgramBooklet from "@/components/ProgramBooklet";
import { DEFAULT_EVENT_AT } from "@/lib/event-time";
import { DEFAULT_WEDDING_PROGRAM, type WeddingProgram } from "@/lib/program";

export default function ProgramPage() {
  const [program, setProgram] = useState<WeddingProgram>(DEFAULT_WEDDING_PROGRAM);
  const [eventAt, setEventAt] = useState(DEFAULT_EVENT_AT);
  const [eventsVisible, setEventsVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/program", { cache: "no-store" }).then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Couldn't load the wedding program.");
        return result as { program: WeddingProgram; eventsVisible: boolean };
      }),
      fetch("/api/settings", { cache: "no-store" }).then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Couldn't load the wedding date.");
        return result as { eventAt: string };
      }),
    ])
      .then(([programResult, settingsResult]) => {
        if (!active) return;
        setProgram(programResult.program);
        setEventAt(settingsResult.eventAt);
        setEventsVisible(programResult.eventsVisible);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "The wedding details are unavailable.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (eventsVisible) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function refreshProgramVisibility() {
      try {
        const response = await fetch("/api/program", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Couldn't reveal the wedding program.");
        if (!active) return;
        if (result.eventsVisible) {
          setProgram(result.program as WeddingProgram);
          setEventsVisible(true);
          setError("");
          return;
        }
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Couldn't check program visibility.");
      }

      const remaining = Date.parse(eventAt) - Date.now();
      timer = setTimeout(refreshProgramVisibility, Math.min(Math.max(remaining, 1_000), 60_000));
    }

    timer = setTimeout(refreshProgramVisibility, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [eventAt, eventsVisible]);

  return (
    <main>
      <ProgramBooklet eventAt={eventAt} error={error} eventsVisible={eventsVisible} loading={loading} program={program} />
    </main>
  );
}
