"use client";
import { useCallback, useEffect, useState } from "react";
import { Bot, Check, Cpu, FileUp, Linkedin, MessageCircle, Monitor, Moon, Sun, Upload, User } from "lucide-react";
import Topbar from "@/components/Topbar";
import ResumeUpload from "@/components/ResumeUpload";
import ConnectorSetup from "@/components/ConnectorSetup";
import WhatsAppConnect, { WhatsAppPerks, WhatsAppPreview } from "@/components/WhatsApp";
import { api, fmtDate } from "@/lib/api";
import { Avatar, getTheme, setTheme, useMe, useToast, type ThemeChoice } from "@/lib/ui";

type Plan = { code: string; name: string; description: string; price_inr: number | null };

function Section({ id, title, icon: Icon, children, action }: { id: string; title: string; icon: any; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section id={id} className="card" aria-labelledby={`${id}-h`} style={{ scrollMarginTop: 16 }}>
      <div className="card-head"><h2 id={`${id}-h`} className="h3 row" style={{ gap: 8 }}><Icon size={16} aria-hidden="true" />{title}</h2>{action}</div>
      {children}
    </section>
  );
}

// The AI's reading of the saved resume.
function AIProfile({ d }: { d: any }) {
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="row"><Avatar name={d.name} size={44} /><div><div className="h3">{d.name}</div><div className="sub">{d.headline}</div>
        <div className="row caption" style={{ gap: 8 }}>{d.location && <span>{d.location}</span>}{d.level && <span className="tag teal">{d.level}</span>}{d.years_experience != null && <span className="tag">{d.years_experience} yrs experience</span>}</div></div></div>
      {d.summary && <p className="sub" style={{ margin: 0 }}>{d.summary}</p>}
      {(d.skills || []).map((g: any) => <div key={g.group}><div className="label" style={{ marginTop: 0 }}>{g.group}</div><div className="chips">{(g.items || []).map((s: string) => <span className="chip" key={s}>{s}</span>)}</div></div>)}
      {[["Experience", d.experience], ["Projects", d.projects]].map(([label, items]: any) => items?.length ? (
        <div key={label}><div className="label" style={{ marginTop: 0 }}>{label}</div>
          {items.map((it: any, i: number) => <div key={i} style={{ marginBottom: 8 }}><div className="row between"><b>{it.title}{it.org ? ` · ${it.org}` : ""}</b><span className="caption">{it.dates}</span></div>
            <ul style={{ margin: "2px 0 0", paddingLeft: 18 }}>{(it.bullets || []).slice(0, 4).map((b: string, j: number) => <li key={j} className="sub">{b}</li>)}</ul></div>)}</div>) : null)}
      {d.education?.length > 0 && <div><div className="label" style={{ marginTop: 0 }}>Education</div>{d.education.map((e: any, i: number) => <div key={i} className="row between"><span>{e.degree}{e.school ? ` · ${e.school}` : ""}</span><span className="caption">{e.dates}</span></div>)}</div>}
    </div>
  );
}

export default function Settings() {
  const toast = useToast();
  const { me, reload } = useMe();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [replace, setReplace] = useState(false);
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [ai, setAi] = useState<{ provider: string; route: string; online: boolean } | null>(null);
  const [conn, setConn] = useState<{ count: number; uploaded_at: string | null } | null>(null);

  const loadProfile = useCallback(() => api("/v1/profile").then(setProfile).catch(() => {}), []);
  const loadAI = useCallback(() => api("/v1/ai/status").then(setAi).catch(() => {}), []);
  useEffect(() => {
    api<Plan[]>("/v1/plans").then(setPlans); loadProfile(); loadAI(); setThemeState(getTheme());
    api("/v1/connections").then(setConn).catch(() => {});
    if (location.hash) setTimeout(() => document.querySelector(location.hash)?.scrollIntoView(), 200);
  }, [loadProfile, loadAI]);
  const reading = profile && profile.chars > 0 && !profile.data?.name && !profile.data?.read_error;
  useEffect(() => { if (!reading) return; const t = setInterval(loadProfile, 4000); return () => clearInterval(t); }, [reading, loadProfile]);

  const act = async (fn: () => Promise<any>, ok: string) => { try { await fn(); toast({ ok: true, text: ok }); await reload(); loadAI(); loadProfile(); } catch (e: any) { toast({ ok: false, text: e.message }); } };
  async function uploadConnections(f: File | null) {
    if (!f) return;
    const form = new FormData(); form.append("file", f);
    try { const r = await api("/v1/connections", { form }); toast({ ok: true, text: `${r.count} connections saved.` }); setConn(await api("/v1/connections")); }
    catch (e: any) { toast({ ok: false, text: e.message }); }
  }
  if (!me) return <div className="page muted">Loading…</div>;
  const full = me.access.level === "full";

  return (
    <>
      <Topbar title="Settings" sub="Your resume, plan, AI, connections and WhatsApp." />
      <div className="page stack" style={{ maxWidth: 920 }}>
        <Section id="resume" title="Resume" icon={FileUp} action={me.resume && <span className="caption">Saved {fmtDate(me.resume.created_at)}</span>}>
          {profile?.chars > 0 && !replace ? <>
            {reading ? <span className="caption"><span className="pulse" /> The AI is reading your resume. About a minute.</span>
              : profile.data?.read_error ? <div className="stack" style={{ gap: 8 }}><div className="note err">{profile.data.read_error}</div>
                  <div><button className="btn sm" onClick={() => act(() => api("/v1/resume/reread", { method: "POST" }), "Reading it again.")}>Try reading it again</button></div></div>
              : !profile.data?.name ? <p className="sub" style={{ margin: 0 }}>Saved. We'll read it as soon as your plan starts.</p>
              : <AIProfile d={profile.data} />}
            <button className="btn sm" style={{ marginTop: 14 }} onClick={() => setReplace(true)}><Upload size={14} />Upload a new resume</button>
          </> : <>
            <ResumeUpload compact onSaved={(r) => { toast({ ok: true, text: r.message }); setReplace(false); reload(); loadProfile(); }} />
            {replace && <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => setReplace(false)}>Keep my current resume</button>}
          </>}
        </Section>

        <Section id="plan" title="Plan" icon={Cpu} action={<span className={`tag ${full ? "green" : me.access.level === "suspended" ? "red" : "amber"}`}>{full ? "active" : me.access.level === "suspended" ? "suspended" : "no plan"}</span>}>
          <p className="sub" style={{ marginTop: 0 }}>{full ? `${me.access.plan_name}, active until ${fmtDate(me.access.access_until)}.` : "No active plan: the agents are off."} Payments aren't built yet{me.dev_mode ? "; the buttons start a plan in test mode." : "."}</p>
          <div className="grid-2">{plans.map((p) => (
            <div key={p.code} className="card inset">
              <div className="row between"><b className="row" style={{ gap: 6 }}>{p.code === "own_ai" ? <Bot size={15} /> : <Cpu size={15} />}{p.name}</b>{me.access.plan === p.code && full && <span className="tag teal">your plan</span>}</div>
              <p className="caption">{p.description}</p>
              {me.dev_mode && !(me.access.plan === p.code && full) && <button className="btn sm" disabled={!me.user.email_verified} onClick={() => act(() => api("/v1/dev/activate-plan", { body: { plan_code: p.code, days: 30 } }), `${p.name} active for 30 days (test).`)}>{full ? "Switch to this (test)" : "Start for 30 days (test)"}</button>}
            </div>))}</div>
          {!me.user.email_verified && <p className="caption">Confirm your email first to start a plan.</p>}
          {me.dev_mode && <div className="row" style={{ marginTop: 12 }}><span className="caption">Test other access levels:</span>
            <button className="btn ghost sm" onClick={() => act(() => api("/v1/dev/end-plan", { method: "POST" }), "Plan ended.")}>End my plan now</button>
            <button className="btn ghost sm" onClick={() => act(() => api("/v1/dev/suspend", { body: { suspended: me.user.status !== "suspended" } }), "Updated.")}>{me.user.status === "suspended" ? "Unsuspend me" : "Suspend me"}</button></div>}
        </Section>

        <Section id="ai" title="Your AI" icon={Bot} action={ai && <span className={`tag ${ai.online ? "green" : "amber"}`}>{ai.online ? "ready" : "not connected"}</span>}>
          {me.access.plan === "own_ai" ? <>
            <p className="sub" style={{ marginTop: 0 }}>Your plan uses your own <b>Claude Code</b> or <b>Codex</b> subscription. The JobsQ Connector runs the agents on your computer.</p>
            <ConnectorSetup onOnline={() => setAi((a) => (a && !a.online ? { ...a, online: true } : a))} />
          </> : <p className="sub" style={{ margin: 0 }}>
            {ai?.provider === "api" ? "JobsQ runs the AI for you (Claude). Nothing to set up."
              : <>JobsQ runs the AI for you. <span className="caption">(Development: there's no ANTHROPIC_API_KEY, so JobsQ's own connector runs it with Claude Code on this PC. {ai?.online ? "It's running." : "Start it: node connector/jobsq-connector.mjs --house"})</span></>}
          </p>}
        </Section>

        <Section id="connections" title="LinkedIn connections" icon={Linkedin} action={conn?.count ? <span className="tag green">{conn.count} saved</span> : null}>
          <p className="sub" style={{ marginTop: 0 }}>The best referrals come from people you already know. Upload your connections once, and for every job we show who you know at that company.</p>
          <ol className="caption" style={{ margin: "0 0 12px", paddingLeft: 18 }}>
            <li>On LinkedIn: <b>Settings → Data privacy → Get a copy of your data</b>, choose <b>Connections</b>, and request it.</li>
            <li>LinkedIn emails you a link (usually within minutes). Download it and unzip it.</li>
            <li>Upload the file <span className="mono">Connections.csv</span> here.</li>
          </ol>
          <label className="btn sm"><Upload size={14} />{conn?.count ? "Upload a newer file" : "Upload Connections.csv"}<input type="file" accept=".csv" className="sr" onChange={(e) => uploadConnections(e.target.files?.[0] || null)} /></label>
          {conn?.uploaded_at && <span className="caption" style={{ marginLeft: 10 }}>Last uploaded {fmtDate(conn.uploaded_at)}</span>}
        </Section>

        <Section id="whatsapp" title="WhatsApp" icon={MessageCircle} action={me.channel?.status === "active" ? <span className="tag green">connected</span> : <span className="tag">not connected</span>}>
          {me.channel?.status === "opted_out" ? <p className="sub" style={{ marginTop: 0 }}>Connected to <b>+{me.channel.external_id}</b>, but you sent <span className="mono">stop</span>. Send <span className="mono">start</span> to JobsQ to turn messages back on.</p>
            : me.channel?.status === "active" ? <>
              <WhatsAppConnect />
              <div className="label">Things you can send</div>
              <div className="chips">{["find jobs", "go 1, 3", "A1 applied", "A1 linkedin", "A1 shortlisted", "jobs", "help"].map((c) => <span key={c} className="chip mono">{c}</span>)}</div>
            </> : <div className="wa-show">
              <div className="stack" style={{ gap: 12 }}><p className="sub" style={{ margin: 0 }}>Use JobsQ from your phone, with the same jobs and steps as here.</p><WhatsAppPerks /><div><WhatsAppConnect /></div></div>
              <WhatsAppPreview compact />
            </div>}
          {me.channel && me.channel.status !== "disconnected" && <button className="btn ghost sm" style={{ marginTop: 12 }} onClick={() => { if (confirm("Disconnect WhatsApp? JobsQ will stop replying to this number.")) act(() => api("/v1/channels/current", { method: "DELETE" }), "WhatsApp disconnected."); }}>Disconnect</button>}
        </Section>

        <Section id="account" title="Account" icon={User}>
          <dl className="kv" style={{ gridTemplateColumns: "110px 1fr" }}>
            <dt>Name</dt><dd>{me.user.name}</dd>
            <dt>Email</dt><dd>{me.user.email} {me.user.email_verified ? <span className="tag green"><Check size={11} />confirmed</span> : <span className="tag amber">not confirmed</span>}</dd>
            <dt>Phone</dt><dd>+{me.user.phone}</dd>
          </dl>
          {!me.user.email_verified && <div className="row" style={{ marginTop: 12 }}>
            <button className="btn sm" onClick={() => act(() => api("/v1/auth/resend-verification", { method: "POST" }), "We sent a new confirmation link.")}>Send a new confirmation link</button>
            <a className="caption" href="/dev-inbox">Open the dev inbox</a></div>}
          <p className="caption" style={{ marginBottom: 0 }}>To change your password, sign out and use “Forgot your password?”.</p>
        </Section>

        <Section id="appearance" title="Appearance" icon={Monitor}>
          <div className="seg" role="radiogroup" aria-label="Theme">
            {([["light", Sun, "Light"], ["dark", Moon, "Dark"], ["system", Monitor, "System"]] as const).map(([t, Icon, label]) => (
              <button key={t} role="radio" aria-checked={theme === t} className={theme === t ? "on" : ""} onClick={() => { setTheme(t); setThemeState(t); }}><Icon size={13} style={{ verticalAlign: -2, marginRight: 5 }} />{label}</button>))}
          </div>
        </Section>

        <section className="card inset">
          <div className="h3" style={{ marginBottom: 8 }}>How JobsQ works</div>
          <ol className="sub" style={{ margin: 0, paddingLeft: 18 }}>
            <li><b>Find me jobs</b> (Scout): we search job sites and pick the jobs that fit your resume.</li>
            <li>Pick a job: we <b>tailor your resume</b> for it (one-page PDF).</li>
            <li><b>Apply</b> with it, then press <b>I've applied</b>.</li>
            <li>We <b>find people who can refer you</b> (people you already know first), and write your <b>LinkedIn messages</b> and <b>emails</b>.</li>
            <li>When the company replies, press <b>I got a reply</b> and we <b>prepare you for the interview</b>.</li>
            <li>Everything is a draft: you review it and send it yourself. The same works on WhatsApp.</li>
          </ol>
        </section>
      </div>
    </>
  );
}
