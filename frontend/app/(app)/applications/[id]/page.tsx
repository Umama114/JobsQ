"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Copy, Eye, EyeOff, ExternalLink, FileText, GraduationCap, Linkedin, Mail, MessageCircle, RotateCcw, Send, Sparkles, Users } from "lucide-react";
import { api } from "@/lib/api";
import { Avatar, Markdown, timeAgo, useMe, useToast } from "@/lib/ui";
import { copyText } from "@/components/ConnectorSetup";
import { STATUSES, STATUS_LABEL, STEPS, nextStep } from "@/lib/jobs";

type Msg = { id: number; role: "user" | "agent" | "system"; agent: string | null; body: string; status: "working" | "done" | "failed"; files: { name: string; file_id: string }[]; created_at: string };
type AppData = { id: number; number: number; status: string; done: Record<string, boolean>; job: any; research: any; notes: string; messages: Msg[]; labels: Record<string, string> };

const AGENT_UI: Record<string, { icon: any; color: string; action: string }> = {
  resume: { icon: FileText, color: "#0e8a6a", action: "Tailor resume" },
  research: { icon: Users, color: "#2754c5", action: "Find referrals" },
  linkedin: { icon: Linkedin, color: "#0b6e8a", action: "LinkedIn messages" },
  email: { icon: Mail, color: "#b4532a", action: "Referral emails" },
  prep: { icon: GraduationCap, color: "#6340c4", action: "Interview prep" },
  assistant: { icon: Sparkles, color: "#5b625e", action: "" },
};

export default function Thread() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { me } = useMe();
  const [app, setApp] = useState<AppData | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [notes, setNotes] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showDesc, setShowDesc] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  const load = useCallback(() => api<AppData>(`/v1/applications/${id}`).then((a) => { setApp(a); setNotes((n) => (n === null ? a.notes || "" : n)); }).catch((e) => setErr(e.message)), [id]);
  useEffect(() => { load(); }, [load]);
  const working = app?.messages.some((m) => m.status === "working");
  useEffect(() => { if (!working) return; const t = setInterval(load, 2500); return () => clearInterval(t); }, [working, load]);
  useEffect(() => { if (app && app.messages.length !== lastCount.current) { lastCount.current = app.messages.length; end.current?.scrollIntoView({ behavior: "smooth" }); } }, [app]);

  async function run(fn: () => Promise<any>) { setErr(""); try { await fn(); setText(""); load(); } catch (e: any) { setErr(e.message); } }
  const ask = (agent?: string) => {
    if (!agent && !text.trim()) return setErr("Type a message, or use the buttons above.");
    return run(() => api(`/v1/applications/${id}/messages`, { body: { text: agent ? "" : text, agent: agent || null } }));
  };
  const markApplied = () => run(() => api(`/v1/applications/${id}/applied`, { method: "POST" }));
  const markReplied = () => run(() => api(`/v1/applications/${id}/replied`, { method: "POST" }));
  async function setStatus(status: string) {
    try { await api(`/v1/applications/${id}`, { method: "PATCH", body: { status } }); load(); toast({ ok: true, text: `Marked as ${STATUS_LABEL[status].toLowerCase()}.` }); } catch (e: any) { toast({ ok: false, text: e.message }); }
  }
  async function saveNotes() {
    if (notes === null || notes === (app?.notes || "")) return;
    try { await api(`/v1/applications/${id}`, { method: "PATCH", body: { notes } }); toast({ ok: true, text: "Notes saved." }); load(); } catch (e: any) { toast({ ok: false, text: e.message }); }
  }

  if (!app) return <div className="page">{err ? <div className="note err">{err}</div> : <p className="muted">Loading…</p>}</div>;
  const j = app.job;
  const next = nextStep(app.status, app.done);
  const lastResume = [...app.messages].reverse().find((m) => m.agent === "resume" && m.files?.length);
  return (
    <>
      <header className="topbar">
        <Link href="/applications" className="btn ghost sm" aria-label="Back to applications"><ArrowLeft size={16} /></Link>
        <Avatar name={j.company} logo={j.logo} size={32} />
        <div className="grow">
          <h1 className="h2" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.title}</h1>
          <div className="caption">{j.company} · <span className="mono">A{app.number}</span></div>
        </div>
        <select className="select" style={{ width: 140 }} value={app.status} onChange={(e) => setStatus(e.target.value)} aria-label="Application status">
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        {j.link && <a className="btn sm" href={j.link} target="_blank" rel="noreferrer"><ExternalLink size={14} />View job</a>}
      </header>

      <div className="thread-wrap">
        <div className="thread">
          <div className="msgs" aria-live="polite">
            {app.messages.map((m) => {
              if (m.role === "system") return <div key={m.id} className="msg system"><Markdown text={m.body} /></div>;
              if (m.role === "user") return <div key={m.id} className="msg user">{m.body}</div>;
              const ui = AGENT_UI[m.agent || "assistant"] || AGENT_UI.assistant; const Icon = ui.icon;
              return (
                <div key={m.id} className="msg agent">
                  <div className="agent-head"><span className="agent-ico" style={{ background: ui.color }}><Icon size={14} /></span>{app.labels[m.agent || "assistant"]}<span className="caption" style={{ fontWeight: 400 }}>{timeAgo(m.created_at)}</span></div>
                  <div className={`agent-body ${m.status === "failed" ? "failed" : ""}`}>
                    {m.status === "working" ? <span className="row caption" style={{ gap: 8 }}><span className="dots"><span /><span /><span /></span>Working on it. This can take a minute or two.</span> : <Markdown text={m.body} />}
                    {m.files?.map((f) => <div key={f.file_id} className="row" style={{ gap: 6 }}>
                      <a className="file" href={`/api/v1/files/${f.file_id}`}><FileText size={16} />{f.name}</a>
                      <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => setPreview(preview === f.file_id ? null : f.file_id)}>{preview === f.file_id ? <><EyeOff size={13} />Hide</> : <><Eye size={13} />Preview</>}</button>
                      {preview === f.file_id && <iframe className="pdf-preview" title={`Preview of ${f.name}`} src={`/api/v1/files/${f.file_id}?inline=true#view=FitH`} />}
                    </div>)}
                    {m.status === "done" && <div className="msg-tools"><button className="btn ghost sm" onClick={() => copyText(m.body, toast)}><Copy size={13} />Copy</button></div>}
                    {m.status === "failed" && m.agent && m.agent !== "assistant" && <div className="msg-tools"><button className="btn sm" onClick={() => ask(m.agent!)} disabled={working}><RotateCcw size={13} />Try again</button></div>}
                  </div>
                </div>
              );
            })}
            <div ref={end} />
          </div>

          <div className="composer">
            {!working && <div className="next-card" role="region" aria-label="Next step">
              <div className="eyebrow">Next step</div>
              <div className="row between" style={{ marginTop: 2 }}>
                <div style={{ flex: "1 1 260px", minWidth: 0 }}><b>{next.title}</b><div className="caption">{next.text}</div></div>
                <div className="row" style={{ gap: 6 }}>
                  {next.action?.kind === "applied" && j.link && <a className="btn" href={j.link} target="_blank" rel="noreferrer"><ExternalLink size={14} />Open the job</a>}
                  {next.action?.kind === "applied" && lastResume && <a className="btn" href={`/api/v1/files/${lastResume.files[0].file_id}`}><FileText size={14} />Resume PDF</a>}
                  {next.also && <button className="btn" onClick={() => ask(next.also!.agent)}>{next.also.label}</button>}
                  {next.action && <button className="btn primary" onClick={() => next.action!.kind === "agent" ? ask((next.action as any).agent) : next.action!.kind === "applied" ? markApplied() : markReplied()}>
                    {next.action.label}<ArrowRight size={14} /></button>}
                </div>
              </div>
            </div>}
            <div className="composer-box">
              <textarea className="textarea" rows={2} value={text} disabled={working} placeholder={working ? "An agent is working…" : "Or ask anything about this job, e.g. “make the resume shorter”"}
                onChange={(e) => { setText(e.target.value); setErr(""); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }} aria-label="Message" />
              <button className="btn primary" onClick={() => ask()} disabled={working} aria-label="Send"><Send size={15} /></button>
            </div>
            {err && <div className="field-err">{err}</div>}
          </div>
        </div>

        <aside className="thread-side" aria-label="Job details">
          <section>
            <div className="h3" style={{ marginBottom: 8 }}>Steps</div>
            {STEPS.map((s, i) => {
              const done = !!app.done[s.key] || (s.key === "applied" && app.status !== "saved");
              return <div key={s.key} className="step-row"><span className="tag" style={done ? { background: "var(--green-bg)", color: "var(--green)" } : {}}>{done ? <Check size={12} /> : i + 1}</span>
                <span style={{ flex: 1, color: done ? "var(--text-3)" : "var(--text)" }}>{s.label}</span>
                {s.key !== "applied" && done && <button className="btn ghost sm" onClick={() => ask(s.key)} disabled={working} title="Run this step again">Redo</button>}</div>;
            })}
          </section>
          <section>
            <label className="h3" htmlFor="notes" style={{ display: "block", marginBottom: 8 }}>Your notes</label>
            <textarea id="notes" className="textarea" rows={4} value={notes ?? ""} placeholder="Interview date, who you talked to, anything to remember…"
              onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} />
          </section>
          <section>
            <div className="h3" style={{ marginBottom: 8 }}>Job</div>
            <dl className="kv">
              <dt>Company</dt><dd><Building2 size={12} style={{ verticalAlign: -1 }} /> {j.company}</dd>
              <dt>Location</dt><dd>{j.location || "Not listed"}{j.remote ? " · remote" : ""}</dd>
              <dt>Salary</dt><dd>{j.salary || "Not listed"}</dd>
              {j.match != null && <><dt>Fit</dt><dd>{j.match}% · {j.why}</dd></>}
            </dl>
            {j.description && <>
              <button className="btn ghost sm" style={{ marginTop: 8, paddingLeft: 0 }} onClick={() => setShowDesc(!showDesc)}>{showDesc ? "Hide description" : "Show description"}</button>
              {showDesc && <div className="caption" style={{ whiteSpace: "pre-wrap", maxHeight: 320, overflow: "auto", marginTop: 6 }}>{j.description}</div>}
            </>}
          </section>
          {me?.channel?.status === "active" && <section className="card inset" style={{ padding: 12 }}>
            <div className="row" style={{ gap: 6, fontWeight: 600 }}><MessageCircle size={14} />On WhatsApp</div>
            <p className="caption" style={{ margin: "4px 0 0" }}>Send <span className="mono">A{app.number} applied</span>, <span className="mono">A{app.number} linkedin</span> or <span className="mono">A{app.number} shortlisted</span> to work on this job from your phone.</p>
          </section>}
          <p className="caption">Agents only draft. You review everything and send it yourself.</p>
        </aside>
      </div>
    </>
  );
}
