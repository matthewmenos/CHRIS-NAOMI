"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import background from "@/assets/background.jpg";
import { DEFAULT_EVENT_AT, EVENT_TIME_ZONE } from "@/lib/event-time";

type Countdown = { days: number; hours: number; minutes: number; seconds: number };

function getCountdown(target: number, now: number): Countdown {
  const totalSeconds = Math.max(0, Math.floor((target - now) / 1000));
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

function CountdownUnit({ value, label }: { value: number | null; label: string }) {
  const display = value === null ? "--" : String(value).padStart(2, "0");
  return (
    <div className="countdown-unit">
      <span className="countdown-number" key={`${label}-${display}`}>{display}</span>
      <span className="countdown-label">{label}</span>
    </div>
  );
}

export default function WelcomePage() {
  const [eventAt, setEventAt] = useState(DEFAULT_EVENT_AT);
  const [now, setNow] = useState<number | null>(null);
  const [settingsUnavailable, setSettingsUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/settings")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Couldn't load the wedding date.");
        return result as { eventAt?: string };
      })
      .then((result) => {
        const timestamp = result.eventAt ? Date.parse(result.eventAt) : Number.NaN;
        if (!Number.isFinite(timestamp)) throw new Error("The saved wedding date is invalid.");
        if (active) setEventAt(new Date(timestamp).toISOString());
      })
      .catch(() => {
        if (active) setSettingsUnavailable(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const updateTime = () => setNow(Date.now());
    updateTime();
    const timer = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const target = new Date(eventAt).getTime();
  const countdown = now === null ? null : getCountdown(target, now);
  const dateLabel = new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: EVENT_TIME_ZONE,
  }).format(new Date(eventAt));
  const timeLabel = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: EVENT_TIME_ZONE,
  }).format(new Date(eventAt));
  const celebrationStarted = now !== null && now >= target;

  return (
    <main className="welcome-screen">
      <Image alt="" className="welcome-background" fill priority sizes="100vw" src={background} />
      <div aria-hidden="true" className="welcome-shade" />
      <div className="welcome-content">
        <header className="welcome-header">
          <div className="welcome-monogram" aria-label="Christian and Naomi">C <span>&</span> N</div>
        </header>
        <section className="welcome-center">
          <p className="welcome-overline">Elder Christian Sominnah & Deaconess Naomi Cudjoe</p>
          <h1 className="welcome-title serif">Christian <span>&</span> Naomi</h1>
          <p className="welcome-subtitle">Together with our families, we invite you to celebrate our wedding</p>
          <div className="welcome-event-details">
            <p>{dateLabel} <span aria-hidden="true">·</span> {timeLabel}</p>
            <p>The Church of Pentecost, Agona-Fie Assembly<br />Agona Nkwanta</p>
          </div>
          <div
            aria-label={countdown ? `${countdown.days} days, ${countdown.hours} hours, ${countdown.minutes} minutes, ${countdown.seconds} seconds remaining` : "Countdown loading"}
            className="welcome-countdown"
            role="timer"
          >
            <CountdownUnit label="Days" value={countdown?.days ?? null} />
            <CountdownUnit label="Hours" value={countdown?.hours ?? null} />
            <CountdownUnit label="Minutes" value={countdown?.minutes ?? null} />
            <CountdownUnit label="Seconds" value={countdown?.seconds ?? null} />
          </div>
          <p className="welcome-countdown-caption">{celebrationStarted ? "Our celebration has begun" : "Counting down to our special day"}</p>
          <div className="welcome-actions">
            <Link className="welcome-rsvp" href="/rsvp">Kindly RSVP <span aria-hidden="true">↗</span></Link>
            <Link className="welcome-program-link" href="/program">Wedding day program</Link>
          </div>
          {settingsUnavailable && <p className="welcome-settings-note">Showing the invitation date; live date settings are unavailable.</p>}
        </section>
        <footer className="welcome-footer">
          <span>One day · One beginning · Forever</span>
          <span>With love, Christian & Naomi</span>
        </footer>
      </div>
    </main>
  );
}
