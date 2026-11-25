"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ChevronDown, ExternalLink, MapPin, Plus, Radar, Search, Sparkles, X } from "lucide-react";
import Topbar from "@/components/Topbar";
import { api } from "@/lib/api";
import { Avatar, timeAgo, useMe, useToast } from "@/lib/ui";

type Prefs = { roles: string[]; locations: string[]; level: string | null; remote: boolean; min_salary: number | null };
type Job = { title: string; company: string; location: string | null; salary: string | null; posted: string | null; link: string | null;
  source: string | null; logo: string | null; remote: boolean; why: string; match: number | null; tracked?: boolean; application_id?: number | null; description?: string | null };
type Run = { id: number; status: "queued" | "running" | "done" | "failed"; summary: string | null; picks: Job[]; error: string | null; created_at: string };

function ChipInput({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => { const v = draft.trim(); if (v && !values.includes(v)) onChange([...values, v]); setDraft(""); };
  return (
    <div>
      <label className="label">{label}</label>
      <div className="chips" style={{ marginBottom: 6 }}>
        {values.map((v) => <span className="chip" key={v}>{v}<button aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}><X size={13} /></button></span>)}
        {!values.length && <span className="caption">None yet.</span>}
      </div>
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <input className="input" value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button className="btn" onClick={add} aria-label={`Add ${label.toLowerCase()}`}><Plus size={15} /></button>
      </div>
    </div>
  );
}

function JobDetail({ j, i, busy, pick }: { j: Job; i: number; busy: number | null; pick: (i: number) => void }) {
  const [more, setMore] = useState(false);
  const desc = (j.description || "").trim();
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
        <Avatar name={j.company} logo={j.logo} size={44} />
        <div style={{ minWidth: 0 }}><div className="h2">{j.title}</div><div className="sub">{j.company}</div></div>
      </div>
      <div className="row caption" style={{ gap: 8 }}>
        {j.location && <span className="row" style={{ gap: 3 }}><MapPin size={12} />{j.location}</span>}
        {j.remote && <span className="tag blue">remote</span>}{j.salary && <span className="tag green">{j.salary}</span>}
        {j.posted && <span>posted {timeAgo(j.posted) || j.posted}</span>}{j.source && <span>via {j.source}</span>}
      </div>
      {j.why && <div className="note info"><b>{j.match != null ? `${j.match}% fit. ` : ""}</b>{j.why}</div>}
      <div className="row">
        {j.tracked ? <Link className="btn primary" href={`/applications/${j.application_id}`}>Open in Applications <ArrowRight size={14} /></Link>
          : <button className="btn primary" onClick={() => pick(i)} disabled={busy !== null}>{busy === i ? "Starting…" : <>Tailor my resume for this <ArrowRight size={14} /></>}</button>}
        {j.link && <a className="btn" href={j.link} target="_blank" rel="noreferrer"><ExternalLink size={14} />View job</a>}
      </div>
      {desc && <div>
        <div className="label" style={{ marginTop: 0 }}>About the job</div>
        <div className="job-desc" style={more ? undefined : { maxHeight: 220 }}>{desc}</div>
        {desc.length > 600 && <button className="btn ghost sm" style={{ paddingLeft: 0 }} onClick={() => setMore(!more)}>{more ? "Show less" : "Show more"}</button>}
      </div>}
    </div>
  );
}

export default function ScoutPage() {
  const router = useRouter();
  const toast = useToast();
  const { me } = useMe();
  const [profile, setProfile] = useState<any>(null);
  const [prefs, setPrefs] = useState<Prefs>({ roles: [], locations: [], level: null, remote: true, min_salary: null });
  const [run, setRun] = useState<Run | null | undefined>(undefined);
  const [busy, setBusy] = useState<number | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const [sel, setSel] = useState(0);
  useEffect(() => setSel(0), [run?.id]);

  const loadRun = useCallback(() => api<Run | null>("/v1/scout/runs/latest").then(setRun).catch(() => setRun(null)), []);
  const loadProfile = useCallback(() => api("/v1/profile").then((p) => {
    setProfile(p);
    if (p.prefs && Object.keys(p.prefs).length) setPrefs({ roles: [], locations: [], level: null, remote: true, min_salary: null, ...p.prefs });
  }), []);
  useEffect(() => { loadProfile(); loadRun(); }, [loadProfile, loadRun]);
  const searching = run && (run.status === "queued" || run.status === "running");
  useEffect(() => { if (!searching) return; const t = setInterval(loadRun, 3000); return () => clearInterval(t); }, [searching, loadRun]);
  const d = profile?.data || {};
  const reading = profile && profile.chars > 0 && !d.name && !d.read_error;
  useEffect(() => { if (!reading) return; const t = setInterval(loadProfile, 3000); return () => clearInterval(t); }, [reading, loadProfile]);

  async function find() {
    try { await api("/v1/profile/prefs", { method: "PUT", body: prefs }); await api("/v1/scout/runs", { method: "POST" }); setShowPrefs(false); loadRun(); }
    catch (e: any) { toast({ ok: false, text: e.message }); }
  }
  async function pick(i: number) {
    if (!run) return;
    setBusy(i);
    try { const r = await api("/v1/applications", { body: { run_id: run.id, index: i } }); router.push(`/applications/${r.id}`); }
    catch (e: any) { toast({ ok: false, text: e.message }); setBusy(null); }
  }

  const ready = me?.access.level === "full" && profile?.chars > 0;
  if (me && profile && !ready) {
    return (<><Topbar title="Scout" /><div className="page"><div className="hero" style={{ maxWidth: 620 }}>
      <div className="h1">Almost there</div>
      <p className="sub">{!profile.chars ? "Add your resume and choose a plan, then Scout can find jobs for you." : "Choose a plan, then Scout can find jobs for you."}</p>
      <Link href="/start" className="btn primary lg">Finish setting up <ArrowRight size={15} /></Link></div></div></>);
  }

  return (
    <>
      <Topbar title="Scout" sub="Finds jobs that fit your resume." />
      <div className="page stack">
        {/* The main action: Find me jobs */}
        <section className="hero" aria-labelledby="find">
          <div className="row between" style={{ alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 320px", minWidth: 0 }}>
              <h2 id="find" className="h1">{searching ? "Scout is searching…" : run?.status === "done" ? "Want more jobs?" : "Let's find you a job"}</h2>
              <p className="sub" style={{ margin: 0 }}>
                {searching ? "Searching job sites and picking what fits your resume. About a minute or two."
                  : <>Looking for <b>{prefs.roles.join(", ") || "roles that fit your resume"}</b> in <b>{prefs.locations.join(", ") || "any location"}</b>{prefs.remote ? ", remote included" : ""}.</>}
              </p>
            </div>
            <button className={`btn primary xl ${!searching && !run?.picks?.length ? "glow" : ""}`} onClick={find} disabled={!!searching || reading}>
              {searching ? <><span className="pulse" style={{ background: "#fff" }} />Searching…</> : <><Search size={18} />Find me jobs</>}</button>
          </div>
          <button className="btn ghost sm" style={{ marginTop: 10, paddingLeft: 0 }} onClick={() => setShowPrefs(!showPrefs)} aria-expanded={showPrefs}>
            <ChevronDown size={14} style={{ transform: showPrefs ? "rotate(180deg)" : "none" }} />Change what I'm looking for</button>
          {showPrefs && <div className="grid-2" style={{ marginTop: 6 }}>
            <ChipInput label="Roles" values={prefs.roles} onChange={(roles) => setPrefs({ ...prefs, roles })} placeholder="e.g. Frontend Developer" />
            <ChipInput label="Locations" values={prefs.locations} onChange={(locations) => setPrefs({ ...prefs, locations })} placeholder="e.g. Hyderabad, Remote" />
            <div><label className="label" htmlFor="lvl">Level</label>
              <select id="lvl" className="select" value={prefs.level || ""} onChange={(e) => setPrefs({ ...prefs, level: e.target.value || null })}>
                <option value="">Any</option><option value="fresher">Fresher</option><option value="junior">Junior (0–2 yrs)</option><option value="mid">Mid (2–5 yrs)</option><option value="senior">Senior (5+ yrs)</option>
              </select></div>
            <div><label className="label" htmlFor="sal">Minimum salary (₹ a year)</label>
              <input id="sal" className="input" inputMode="numeric" value={prefs.min_salary ?? ""} placeholder="Any" onChange={(e) => setPrefs({ ...prefs, min_salary: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null })} /></div>
            <label className="switch"><input type="checkbox" checked={prefs.remote} onChange={(e) => setPrefs({ ...prefs, remote: e.target.checked })} />Include remote jobs</label>
          </div>}
          {reading && <p className="caption" style={{ margin: "8px 0 0" }}><span className="pulse" /> Reading your resume first… about a minute.</p>}
        </section>

        {run?.status === "failed" && <div className="note err">{run.error} <button className="btn sm" style={{ marginLeft: 8 }} onClick={find}>Try again</button></div>}
        {searching && <div className="stack" style={{ gap: 8 }} aria-hidden="true">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 62 }} />)}</div>}

        {run?.status === "done" && <section aria-labelledby="results">
          <div className="row between" style={{ marginBottom: 10 }}>
            <h2 id="results" className="h3">{run.picks.length} jobs for you</h2><span className="caption">Best fit first · searched {timeAgo(run.created_at)}</span>
          </div>
          {run.summary && <p className="sub" style={{ margin: "0 0 12px" }}><Sparkles size={14} style={{ verticalAlign: -2 }} /> {run.summary}</p>}
          {!run.picks.length ? <div className="card empty"><div className="h2">Nothing matched</div><p>Press <b>Change what I'm looking for</b> and try other roles or another city.</p></div> :
            <div className="job-split">
              <ul className="job-list" aria-label="Jobs">
                {run.picks.map((j, i) => (
                  <li key={i}>
                    <button className={`job-item ${sel === i ? "on" : ""}`} onClick={() => setSel(i)} aria-expanded={sel === i}>
                      <Avatar name={j.company} logo={j.logo} size={36} />
                      <span className="job-item-main">
                        <span className="title">{j.title}</span>
                        <span className="caption">{j.company}{j.location ? ` · ${j.location}` : ""}</span>
                        {j.why && <span className="caption job-why">{j.why}</span>}
                      </span>
                      <span className="job-item-side">
                        {j.match != null && <span className="fit" style={{ ["--fit" as any]: `${j.match}%` }}>{j.match}%</span>}
                        {j.tracked && <span className="tag green">picked</span>}
                      </span>
                    </button>
                    {sel === i && <div className="job-detail inline"><JobDetail j={j} i={i} busy={busy} pick={pick} /></div>}
                  </li>
                ))}
              </ul>
              <div className="job-detail side" aria-live="polite">{run.picks[sel] && <JobDetail j={run.picks[sel]} i={sel} busy={busy} pick={pick} />}</div>
            </div>}
        </section>}

        {run === null && <div className="card empty"><Radar size={28} /><div className="h2">No search yet</div><p>Press <b>Find me jobs</b> above.</p></div>}
      </div>
    </>
  );
}
