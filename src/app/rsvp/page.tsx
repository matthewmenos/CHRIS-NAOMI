"use client";

import { ArrowLeft, ArrowRight, Check, Heart, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function RSVPFormPage() {
  const [form, setForm] = useState({ name: "", phone: "", guestCount: "1" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/attendees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          guestCount: Number(form.guestCount),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn't save your RSVP.");
      setNotice({ type: "success", text: result.message });
      if (!result.alreadyRegistered) {
        setForm({ name: "", phone: "", guestCount: "1" });
      }
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Something went wrong. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="invite-page">
      <section className="invite-visual">
        <div className="brand-mark">C <span style={{ color: "#d7bc98" }}>&</span> N</div>
        <div className="invite-copy">
          <div className="eyebrow">Together with our families</div>
          <h1 className="serif">Chris <span>& Naomi</span></h1>
          <p>Two hearts, one beautiful beginning. We would be honored to have you with us as we celebrate our wedding day.</p>
          <div className="invite-date">THE WEDDING CELEBRATION · DETAILS TO FOLLOW</div>
        </div>
        <div className="visual-foot">
          <span>A day to remember</span>
          <span>With love, C & N</span>
        </div>
      </section>

      <section className="invite-form-wrap">
        <div className="invite-form">
          <Link className="rsvp-back" href="/"><ArrowLeft size={13} /> Back to welcome</Link>
          <div className="eyebrow">You are warmly invited</div>
          <h2 className="serif">Kindly RSVP</h2>
          <p>Please let us know if you can join us. We’ll send the day’s program to your phone so you don’t miss a moment.</p>
          <form className="form-stack" onSubmit={submit}>
            <div className="field">
              <label htmlFor="guest-name">Your full name</label>
              <input
                autoComplete="name"
                id="guest-name"
                maxLength={120}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="e.g. Ama Mensah"
                required
                value={form.name}
              />
            </div>
            <div className="field">
              <label htmlFor="guest-phone">Mobile number</label>
              <input
                autoComplete="tel"
                id="guest-phone"
                inputMode="tel"
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                placeholder="+233 24 000 0000"
                required
                value={form.phone}
              />
            </div>
            <div className="field">
              <label htmlFor="guest-count">Number of guests, including you</label>
              <select
                id="guest-count"
                onChange={(event) => setForm({ ...form, guestCount: event.target.value })}
                value={form.guestCount}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                  <option key={count} value={count}>{count} {count === 1 ? "guest" : "guests"}</option>
                ))}
              </select>
            </div>
            <p className="sms-consent-note">By submitting your RSVP, you agree to receive the wedding program and event updates by SMS. Your number will be kept for wedding communications.</p>
            {notice && <div className={`form-note ${notice.type}`} role="status">{notice.text}</div>}
            <button className="button button-primary invite-submit" disabled={busy} type="submit">
              {busy ? <LoaderCircle size={16} className="spin" /> : notice?.type === "success" ? <Check size={16} /> : <Heart size={15} />}
              {busy ? "Saving your RSVP..." : "Confirm my RSVP"}
              {!busy && notice?.type !== "success" && <ArrowRight size={15} />}
            </button>
          </form>
          <div className="form-foot">
            We can’t wait to celebrate with you · Chris & Naomi
            <span style={{ display: "block", marginTop: 10 }}><Link href="/admin/login">Team sign in</Link></span>
          </div>
        </div>
      </section>
    </main>
  );
}
