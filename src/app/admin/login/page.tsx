"use client";

import { ArrowLeft, LoaderCircle, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");
      router.replace("/admin");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-brand">C & N · Celebration team</div>
        <h1 className="serif">Welcome back</h1>
        <p>Sign in to manage RSVPs and wedding day messages.</p>
        <form className="form-stack" onSubmit={submit}>
          <div className="field">
            <label htmlFor="login-email">Email address</label>
            <input autoComplete="username" id="login-email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input autoComplete="current-password" id="login-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          </div>
          {error && <div className="form-note error" role="alert">{error}</div>}
          <button className="button button-primary invite-submit" disabled={busy} type="submit">
            {busy ? <LoaderCircle size={16} className="spin" /> : <LockKeyhole size={15} />}
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="form-foot"><Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><ArrowLeft size={12} /> Back to the invitation</Link></div>
      </section>
    </main>
  );
}
