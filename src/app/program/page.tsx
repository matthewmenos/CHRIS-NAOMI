"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import background from "@/assets/background.jpg";
import { DEFAULT_EVENT_AT, EVENT_TIME_ZONE } from "@/lib/event-time";
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

  const eventDate = new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: EVENT_TIME_ZONE,
  }).format(new Date(eventAt));

  return (
    <main className="program-page">
      <section className="program-hero">
        <Image alt="" className="program-hero-image" fill priority sizes="100vw" src={background} />
        <div className="program-hero-shade" />
        <nav className="program-topbar" aria-label="Wedding navigation">
          <Link href="/"><ArrowLeft size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />Welcome</Link>
          <Link href="/rsvp">RSVP <span aria-hidden="true">↗</span></Link>
        </nav>
        <div className="program-hero-content">
          <div className="program-overline">Christian & Naomi · The celebration</div>
          <h1 className="serif">{program.title}</h1>
          <p>{program.subtitle}</p>
          <div className="program-date-pill"><CalendarDays size={13} />{eventDate}</div>
        </div>
      </section>

      <section className="program-main">
        <article className="program-card">
          <header className="program-card-heading">
            <div>
              <div className="eyebrow">The order of celebration</div>
              <h2 className="serif">A day to remember</h2>
            </div>
            <span className="program-count">{String(program.items.length).padStart(2, "0")}</span>
          </header>
          {loading ? (
            <div className="program-loading">Preparing the day’s program…</div>
          ) : error ? (
            <div className="program-error" role="status">{error}</div>
          ) : program.items.length === 0 ? (
            <div className="program-empty-public">The wedding day program is being prepared.<br />Please check back soon.</div>
          ) : (
            <div className="program-list">
              {program.items.map((item) => (
                <article className="public-program-item" key={item.id}>
                  <div className="public-program-time"><Clock3 size={12} style={{ verticalAlign: "middle", marginRight: 5 }} />{item.time}</div>
                  <div className="public-program-copy">
                    <h3>{item.title}</h3>
                    {item.description && <p>{item.description}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <div className="program-venue">
          <MapPin size={16} />
          <div><strong>Wedding venue</strong>The Church of Pentecost, Agona-Fie Assembly<br />Agona Nkwanta</div>
        </div>
        <footer className="program-footer">With joy and gratitude · Christian & Naomi</footer>
      </section>
    </main>
  );
}
