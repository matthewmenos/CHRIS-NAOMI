"use client";

import {
  CalendarDays,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  FileText,
  LogOut,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  Send,
  Shield,
  Users,
  UserRoundPlus,
  Clock3,
  ListOrdered,
  Trash2,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { StaffSession } from "@/lib/auth";
import { DEFAULT_EVENT_AT, fromEventDateInput, toEventDateInput } from "@/lib/event-time";
import { DEFAULT_WEDDING_PROGRAM, type ProgramItem, type WeddingProgram } from "@/lib/program";

type Attendee = {
  id: string;
  name: string;
  phone: string;
  guest_count: number;
  sms_status: "pending" | "sending" | "sent" | "failed";
  sms_error: string | null;
  sms_sent_at: string | null;
  created_at: string;
};
type SmsTemplate = { id: string; name: string; body: string };
type TeamMember = { id: string; name: string; email: string; role: "admin" | "usher"; created_at: string };
type Tab = "overview" | "attendees" | "template" | "team" | "event" | "program";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Couldn't load the dashboard.");
  return result as T;
}

export default function Dashboard() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffSession | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [eventDate, setEventDate] = useState(toEventDateInput(DEFAULT_EVENT_AT));
  const [usher, setUsher] = useState({ name: "", email: "", password: "" });
  const [showUsherPassword, setShowUsherPassword] = useState(false);
  const [program, setProgram] = useState<WeddingProgram>(DEFAULT_WEDDING_PROGRAM);

  const loadAttendees = useCallback(async () => {
    const result = await getJson<{ attendees: Attendee[] }>("/api/attendees");
    setAttendees(result.attendees);
  }, []);

  const loadTemplate = useCallback(async () => {
    const result = await getJson<{ template: SmsTemplate | null }>("/api/templates");
    setTemplateName(result.template?.name ?? "Wedding program");
    setTemplateBody(result.template?.body ?? "");
  }, []);

  const loadTeam = useCallback(async () => {
    const result = await getJson<{ team: TeamMember[] }>("/api/staff");
    setTeam(result.team);
  }, []);

  const loadEventDate = useCallback(async () => {
    const result = await getJson<{ eventAt: string }>("/api/settings");
    setEventDate(toEventDateInput(result.eventAt));
  }, []);

  const loadProgram = useCallback(async () => {
    const result = await getJson<{ program: WeddingProgram }>("/api/program");
    setProgram(result.program);
  }, []);

  const refresh = useCallback(async () => {
    await loadAttendees();
    if (staff?.role === "admin") {
      await Promise.all([loadTemplate(), loadTeam(), loadEventDate(), loadProgram()]);
    }
  }, [loadAttendees, loadEventDate, loadProgram, loadTemplate, loadTeam, staff?.role]);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/admin/login");
          return null;
        }
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Couldn't verify your sign-in.");
        return result as { staff: StaffSession };
      })
      .then(async (result) => {
        if (!result || !active) return;
        setStaff(result.staff);
        const [attendeeResult, templateResult, teamResult, settingsResult, programResult] = await Promise.all([
          getJson<{ attendees: Attendee[] }>("/api/attendees"),
          getJson<{ template: SmsTemplate | null }>("/api/templates"),
          result.staff.role === "admin"
            ? getJson<{ team: TeamMember[] }>("/api/staff")
            : Promise.resolve({ team: [] as TeamMember[] }),
          result.staff.role === "admin"
            ? getJson<{ eventAt: string }>("/api/settings")
            : Promise.resolve({ eventAt: DEFAULT_EVENT_AT }),
          getJson<{ program: WeddingProgram }>("/api/program"),
        ]);
        if (!active) return;
        setAttendees(attendeeResult.attendees);
        setTemplateName(templateResult.template?.name ?? "Wedding program");
        setTemplateBody(templateResult.template?.body ?? "");
        setTeam(teamResult.team);
        setEventDate(toEventDateInput(settingsResult.eventAt));
        setProgram(programResult.program);
      })
      .catch((error: unknown) => {
        if (active) {
          setNotice({
            type: "error",
            text: error instanceof Error ? error.message : "Couldn't load the dashboard.",
          });
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router]);

  const filteredAttendees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return attendees;
    return attendees.filter((attendee) => `${attendee.name} ${attendee.phone}`.toLowerCase().includes(term));
  }, [attendees, search]);
  const totalGuests = attendees.reduce((sum, attendee) => sum + attendee.guest_count, 0);
  const pendingCount = attendees.filter((attendee) => attendee.sms_status === "pending" || attendee.sms_status === "failed").length;
  const sentCount = attendees.filter((attendee) => attendee.sms_status === "sent").length;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  async function sendMessages() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/attendees/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience: "pending" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Couldn't send the messages.");
      setNotice({ type: result.failed ? "error" : "success", text: result.message });
      try {
        await loadAttendees();
      } catch {
        setNotice({ type: "error", text: "The SMS request finished, but the guest list couldn't refresh. Reload to verify its status." });
      }
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Couldn't send the messages." });
    } finally {
      setBusy(false);
    }
  }

  async function sendToEveryone() {
    if (!window.confirm(`Send the current program template to all ${attendees.length} registered guests? mNotify may charge per SMS.`)) return;
    setBusy(true);
    setNotice(null);
    const excludeIds: string[] = [];
    let sent = 0;
    let failed = 0;
    try {
      let remaining = true;
      while (remaining) {
        const response = await fetch("/api/attendees/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audience: "all", excludeIds }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Couldn't send the messages.");
        sent += result.sent;
        failed += result.failed;
        excludeIds.push(...result.processedIds);
        remaining = result.remaining;
      }
      setNotice({
        type: failed ? "error" : "success",
        text: failed
          ? `${sent} message${sent === 1 ? "" : "s"} sent; ${failed} failed. Retry failed messages from the pending queue.`
          : `${sent} program message${sent === 1 ? "" : "s"} sent to all registered guests.`,
      });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Couldn't send the messages." });
    } finally {
      try {
        await loadAttendees();
      } catch {
        setNotice({ type: "error", text: "The send request finished, but the guest list couldn't refresh. Reload to verify its status." });
      } finally {
        setBusy(false);
      }
    }
  }

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: templateName, body: templateBody }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Couldn't save the template.");
      setNotice({ type: "success", text: result.message });
      try {
        await loadTemplate();
      } catch {
        setNotice({ type: "error", text: "The template was saved, but couldn't be reloaded. Refresh to verify." });
      }
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Couldn't save the template." });
    } finally {
      setBusy(false);
    }
  }

  async function saveEventDate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const eventAt = fromEventDateInput(eventDate);
    if (!eventAt) {
      setNotice({ type: "error", text: "Choose a valid wedding date and time." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventAt }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Couldn't save the wedding date.");
      setEventDate(toEventDateInput(result.eventAt));
      setNotice({ type: "success", text: "Wedding date and time saved." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Couldn't save the wedding date." });
    } finally {
      setBusy(false);
    }
  }

  async function saveProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/program", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(program),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Couldn't save the program.");
      setProgram(result.program);
      setNotice({ type: "success", text: "Wedding day program saved." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Couldn't save the program." });
    } finally {
      setBusy(false);
    }
  }

  function updateProgramItem(id: string, field: keyof Omit<ProgramItem, "id">, value: string) {
    setProgram((current) => ({
      ...current,
      items: current.items.map((item) => item.id === id ? { ...item, [field]: value } : item),
    }));
  }

  function addProgramItem() {
    setProgram((current) => ({
      ...current,
      items: [...current.items, { id: crypto.randomUUID(), time: "", title: "", description: "" }],
    }));
  }

  async function createUsher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(usher),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Couldn't create the usher account.");
      setNotice({ type: "success", text: `Usher account created for ${result.staff.name}. Share the password securely.` });
      setUsher({ name: "", email: "", password: "" });
      try {
        await loadTeam();
      } catch {
        setNotice({ type: "error", text: "The usher account was created, but the team list couldn't refresh." });
      }
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Couldn't create the usher account." });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="login-shell"><div style={{ color: "white", fontSize: 13 }}>Loading your dashboard…</div></main>;
  if (!staff) return null;

  const tabs: Array<{ id: Tab; label: string; icon: typeof Users; adminOnly?: boolean }> = [
    { id: "overview", label: "Overview", icon: CalendarDays },
    { id: "attendees", label: "Attendees", icon: Users },
    { id: "template", label: "SMS template", icon: MessageSquareText, adminOnly: true },
    { id: "team", label: "Usher accounts", icon: Shield, adminOnly: true },
    { id: "event", label: "Event date", icon: Clock3, adminOnly: true },
    { id: "program", label: "Program outline", icon: ListOrdered, adminOnly: true },
  ];
  const title = tabs.find((item) => item.id === tab)?.label ?? "Overview";

  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <div className="side-brand">
          <span>Wedding celebration</span>
          <strong>Chris & Naomi</strong>
        </div>
        <div className="side-label">Workspace</div>
        <nav className="side-nav" aria-label="Dashboard navigation">
          {tabs.filter((item) => !item.adminOnly || staff.role === "admin").map(({ id, label, icon: Icon }) => (
            <button className={tab === id ? "active" : ""} key={id} onClick={() => { setTab(id); setNotice(null); }} type="button">
              <Icon size={15} />{label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="staff-identity">
            <div className="avatar">{staff.name.slice(0, 1).toUpperCase()}</div>
            <div><strong>{staff.name}</strong><span>{staff.role}</span></div>
          </div>
          <button className="signout" onClick={logout} type="button"><LogOut size={13} /> Sign out</button>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div>
            <div className="eyebrow">Celebration workspace</div>
            <h1 className="serif">{title}</h1>
          </div>
          <div className="topbar-right">
            <div className="date-chip"><CalendarDays size={12} style={{ verticalAlign: "middle", marginRight: 6 }} />{new Date(`${eventDate}:00+00:00`).toLocaleString("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Accra" })}</div>
            <button className="button button-outline" onClick={() => {
              setNotice(null);
              void refresh().catch((error: unknown) => setNotice({
                type: "error",
                text: error instanceof Error ? error.message : "Couldn't refresh the dashboard.",
              }));
            }} type="button"><RefreshCw size={13} /> Refresh</button>
          </div>
        </header>

        <div className="dashboard-content">
          {notice && <div className={`inline-alert ${notice.type}`} role="status">{notice.type === "error" ? <CircleAlert size={14} style={{ verticalAlign: "middle", marginRight: 7 }} /> : <Check size={14} style={{ verticalAlign: "middle", marginRight: 7 }} />}{notice.text}</div>}

          {(tab === "overview" || tab === "attendees") && (
            <>
              <div className="stat-grid">
                <StatCard label="Registered parties" value={attendees.length} sub="Confirmed RSVPs" icon={<Users size={14} />} />
                <StatCard label="Total guests" value={totalGuests} sub="Including plus-ones" icon={<UserRoundPlus size={14} />} />
                <StatCard label="Program SMS sent" value={sentCount} sub="Accepted by mNotify" icon={<MessageSquareText size={14} />} />
                <StatCard label="To be messaged" value={pendingCount} sub="Pending or needs retry" icon={<Send size={14} />} />
              </div>

              <section className="panel">
                <div className="panel-head">
                  <div><h2>Guest list</h2><p>Names and numbers stay saved here for future wedding updates.</p></div>
                  <div className="attendee-tools">
                    <div className="search-box"><Search size={13} /><input aria-label="Search attendees" onChange={(event) => setSearch(event.target.value)} placeholder="Search name or phone" value={search} /></div>
                    {staff.role === "admin" && (
                      <>
                        <button className="button button-primary" disabled={busy || pendingCount === 0 || !templateBody.trim()} onClick={sendMessages} title={!templateBody.trim() ? "Save an SMS template before sending." : undefined} type="button">
                          {busy ? <RefreshCw size={13} /> : <Send size={13} />} {busy ? "Sending…" : `Send program (${pendingCount})`}
                        </button>
                        <button className="button button-outline" disabled={busy || attendees.length === 0 || !templateBody.trim()} onClick={sendToEveryone} title={!templateBody.trim() ? "Save an SMS template before sending." : undefined} type="button">
                          <Send size={13} /> Send to all
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <AttendeeTable attendees={filteredAttendees} />
              </section>
            </>
          )}

          {tab === "template" && staff.role === "admin" && (
            <section className="panel">
              <div className="panel-head">
                <div><h2>Wedding program SMS</h2><p>Personalize the message guests receive after registering or when you send a reminder.</p></div>
                <span className="status-pill status-sent"><FileText size={11} style={{ marginRight: 5 }} />Saved in Neon</span>
              </div>
              <div className="template-layout">
                <div className="template-editor">
                  <form className="form-stack" onSubmit={saveTemplate}>
                    <div className="field"><label htmlFor="template-title">Template name</label><input id="template-title" maxLength={80} onChange={(event) => setTemplateName(event.target.value)} required value={templateName} /></div>
                    <div className="field">
                      <label htmlFor="template-body">Message</label>
                      <textarea id="template-body" maxLength={1600} onChange={(event) => setTemplateBody(event.target.value)} required rows={9} value={templateBody} />
                    </div>
                    <div className="muted" style={{ fontSize: 10 }}>{templateBody.length} / 1,600 characters · Use <code>{"{name}"}</code> and <code>{"{guests}"}</code> to personalize.</div>
                    <button className="button button-primary" disabled={busy} type="submit">{busy ? <RefreshCw size={14} /> : <Check size={14} />}{busy ? "Saving…" : "Save SMS template"}</button>
                  </form>
                </div>
                <div className="template-preview">
                  <div className="eyebrow">Live preview</div>
                  <div className="preview-phone">
                    <div className="preview-top">Messages · Chris & Naomi</div>
                    <div className="preview-bubble">{templateBody.replaceAll("{name}", "Ama").replaceAll("{guests}", "2") || "Your message preview appears here."}</div>
                  </div>
                  <div className="template-tip">Templates are sent via your mNotify account. Keep your sender ID approved and message lengths in mind; standard SMS segments may incur additional charges.</div>
                </div>
              </div>
            </section>
          )}

          {tab === "event" && staff.role === "admin" && (
            <section className="panel event-date-panel">
              <div className="panel-head">
                <div>
                  <h2>Wedding date and time</h2>
                  <p>This controls the public countdown. Time is shown in Ghana time (GMT).</p>
                </div>
                <span className="status-pill status-sent"><Clock3 size={11} style={{ marginRight: 5 }} />Public countdown</span>
              </div>
              <form className="event-date-form" onSubmit={saveEventDate}>
                <div className="field">
                  <label htmlFor="event-date">Wedding date and time · Ghana time</label>
                  <input
                    id="event-date"
                    onChange={(event) => setEventDate(event.target.value)}
                    required
                    type="datetime-local"
                    value={eventDate}
                  />
                </div>
                <p>The countdown updates automatically on the welcome page. The current invitation date is Saturday, 21 November 2026 at 10:00 AM.</p>
                <button className="button button-primary" disabled={busy} type="submit">
                  {busy ? <RefreshCw size={14} /> : <Check size={14} />}
                  {busy ? "Saving…" : "Save wedding date"}
                </button>
              </form>
            </section>
          )}

          {tab === "program" && staff.role === "admin" && (
            <section className="panel program-editor-panel">
              <div className="panel-head">
                <div>
                  <h2>Wedding day program</h2>
                  <p>Edit the schedule guests can view on the public program page.</p>
                </div>
                <a className="button button-outline" href="/program" rel="noreferrer" target="_blank">Preview public page</a>
              </div>
              <form className="program-editor" onSubmit={saveProgram}>
                <div className="field">
                  <label htmlFor="program-title">Page title</label>
                  <input id="program-title" maxLength={100} onChange={(event) => setProgram({ ...program, title: event.target.value })} required value={program.title} />
                </div>
                <div className="field">
                  <label htmlFor="program-subtitle">Welcome message</label>
                  <input id="program-subtitle" maxLength={200} onChange={(event) => setProgram({ ...program, subtitle: event.target.value })} value={program.subtitle} />
                </div>
                <div className="program-items-heading">
                  <div><h3>Order of events</h3><p>Entries appear in the same order as listed here.</p></div>
                  <button className="button button-outline" disabled={program.items.length >= 30} onClick={addProgramItem} type="button"><Plus size={14} /> Add event</button>
                </div>
                {program.items.length === 0 && (
                  <div className="program-empty-editor">No events yet. Add the first item to begin the outline.</div>
                )}
                {program.items.map((item, index) => (
                  <fieldset className="program-item-editor" key={item.id}>
                    <legend>Event {String(index + 1).padStart(2, "0")}</legend>
                    <div className="program-item-fields">
                      <div className="field">
                        <label htmlFor={`program-time-${item.id}`}>Time</label>
                        <input id={`program-time-${item.id}`} maxLength={40} onChange={(event) => updateProgramItem(item.id, "time", event.target.value)} placeholder="10:00 AM" required value={item.time} />
                      </div>
                      <div className="field">
                        <label htmlFor={`program-name-${item.id}`}>Event</label>
                        <input id={`program-name-${item.id}`} maxLength={100} onChange={(event) => updateProgramItem(item.id, "title", event.target.value)} placeholder="Wedding ceremony" required value={item.title} />
                      </div>
                      <button aria-label={`Remove event ${index + 1}`} className="program-remove" onClick={() => setProgram({ ...program, items: program.items.filter((entry) => entry.id !== item.id) })} type="button">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="field">
                      <label htmlFor={`program-description-${item.id}`}>Details (optional)</label>
                      <textarea id={`program-description-${item.id}`} maxLength={500} onChange={(event) => updateProgramItem(item.id, "description", event.target.value)} placeholder="Venue, host, or a short note for guests" rows={2} value={item.description} />
                    </div>
                  </fieldset>
                ))}
                <div className="program-editor-footer">
                  <span>{program.items.length} / 30 events</span>
                  <button className="button button-primary" disabled={busy || program.items.length > 30} type="submit">
                    {busy ? <RefreshCw size={14} /> : <Check size={14} />}
                    {busy ? "Saving…" : "Save program outline"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {tab === "team" && staff.role === "admin" && (
            <section className="panel">
              <div className="panel-head">
                <div><h2>Usher accounts</h2><p>Give ushers dashboard access to view and search the guest list.</p></div>
                <span className="status-pill status-pending"><Shield size={11} style={{ marginRight: 5 }} />Admin only</span>
              </div>
              <form className="team-form" onSubmit={createUsher}>
                <div className="field"><label htmlFor="usher-name">Full name</label><input id="usher-name" maxLength={120} onChange={(event) => setUsher({ ...usher, name: event.target.value })} required value={usher.name} /></div>
                <div className="field"><label htmlFor="usher-email">Email</label><input id="usher-email" onChange={(event) => setUsher({ ...usher, email: event.target.value })} required type="email" value={usher.email} /></div>
                <div className="field">
                  <label htmlFor="usher-password">Password (12+ characters)</label>
                  <div className="password-input-wrap">
                    <input id="usher-password" minLength={12} onChange={(event) => setUsher({ ...usher, password: event.target.value })} required type={showUsherPassword ? "text" : "password"} value={usher.password} />
                    <button aria-label={showUsherPassword ? "Hide password" : "Show password"} className="password-toggle" onClick={() => setShowUsherPassword(!showUsherPassword)} type="button">
                      {showUsherPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <button className="button button-primary" disabled={busy} type="submit"><Plus size={14} /> Add usher</button>
              </form>
              <div className="table-wrap">
                <table className="team-table">
                  <thead><tr><th>Team member</th><th>Email</th><th>Role</th><th>Added</th></tr></thead>
                  <tbody>{team.map((member) => (
                    <tr key={member.id}>
                      <td><div className="person-cell"><div className="person-dot">{member.name.slice(0, 1).toUpperCase()}</div><strong>{member.name}</strong></div></td>
                      <td>{member.email}</td><td><span className={`status-pill ${member.role === "admin" ? "status-sent" : "status-pending"}`}>{member.role}</span></td>
                      <td>{new Date(member.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: number; sub: string; icon: React.ReactNode }) {
  return <article className="stat-card"><div className="stat-head"><span>{label}</span><div className="stat-icon">{icon}</div></div><div className="stat-value">{value}</div><div className="stat-sub">{sub}</div></article>;
}

function AttendeeTable({ attendees }: { attendees: Attendee[] }) {
  if (!attendees.length) return <div className="empty-state"><Users size={21} style={{ display: "block", margin: "0 auto 10px", opacity: .45 }} />No guests match your search yet.</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Guest</th><th>Phone number</th><th>Party size</th><th>Program SMS</th><th>RSVP date</th></tr></thead>
        <tbody>{attendees.map((attendee) => (
          <tr key={attendee.id}>
            <td><div className="person-cell"><div className="person-dot">{attendee.name.slice(0, 1).toUpperCase()}</div><strong>{attendee.name}</strong></div></td>
            <td>{attendee.phone}</td>
            <td>{attendee.guest_count} {attendee.guest_count === 1 ? "guest" : "guests"}</td>
            <td><span className={`status-pill status-${attendee.sms_status}`}>{attendee.sms_status}</span>{attendee.sms_error && <div className="muted" style={{ maxWidth: 180, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", fontSize: 9 }} title={attendee.sms_error}>{attendee.sms_error}</div>}</td>
            <td>{new Date(attendee.created_at).toLocaleDateString()}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
