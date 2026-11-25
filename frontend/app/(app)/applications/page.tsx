"use client";
// Applications, grouped by where each job is: to apply -> applied -> interviewing -> closed.
// One row per job, with its progress and its next step, so it's clear what to do today.
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Briefcase, ChevronDown, MapPin } from "lucide-react";
import Topbar from "@/components/Topbar";
import { api } from "@/lib/api";
import { Avatar, timeAgo } from "@/lib/ui";
import { STATUS_LABEL, STATUS_TONE, STEPS, nextStep } from "@/lib/jobs";

type App = { id: number; number: number; status: string; done: Record<string, boolean>; working: number; updated_at: string;
  job: { title: string; company: string; location: string | null; logo: string | null } };

const GROUPS = [
  { key: "todo", title: "To apply", hint: "Tailor your resume and apply.", statuses: ["saved"] },
  { key: "applied", title: "Applied", hint: "Get referred while you wait to hear back.", statuses: ["applied"] },
  { key: "interviewing", title: "Interviewing", hint: "Prepare for each round.", statuses: ["interviewing"] },
  { key: "closed", title: "Closed", hint: "Offers and rejections.", statuses: ["offer", "rejected"] },
];
const stepDone = (a: App, key: string) => !!a.done[key] || (key === "applied" && a.status !== "saved");

function Row({ a }: { a: App }) {
  const n = STEPS.filter((s) => stepDone(a, s.key)).length;
  const next = nextStep(a.status, a.done);
  return (
    <Link href={`/applications/${a.id}`} className="app-row">
      <Avatar name={a.job.company} logo={a.job.logo} size={38} />
      <div className="app-main">
        <div className="title">{a.job.title}</div>
        <div className="caption row" style={{ gap: 6 }}>
          <span>{a.job.company}</span>{a.job.location && <span className="row" style={{ gap: 3 }}><MapPin size={11} />{a.job.location}</span>}
          <span className="mono">A{a.number}</span>
        </div>
      </div>
      <div className="app-progress" aria-label={`${n} of ${STEPS.length} steps done`}>
        <div className="steps">{STEPS.map((s) => <span key={s.key} className={stepDone(a, s.key) ? "on" : ""} title={s.label} />)}</div>
        <span className="caption">{n}/{STEPS.length} steps</span>
      </div>
      <div className="app-next">
        {a.working ? <span className="caption"><span className="pulse" /> Working…</span>
          : next.action ? <span className="next-pill">{next.action.label}<ArrowRight size={13} /></span>
          : <span className={`tag ${STATUS_TONE[a.status]}`}>{STATUS_LABEL[a.status]}</span>}
        <span className="caption">{timeAgo(a.updated_at)}</span>
      </div>
    </Link>
  );
}

export default function Applications() {
  const [apps, setApps] = useState<App[] | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  useEffect(() => {
    const load = () => api<App[]>("/v1/applications").then(setApps).catch(() => setApps((a) => a ?? []));
    load(); const t = setInterval(load, 6000); return () => clearInterval(t);
  }, []);
  const archived = (apps || []).filter((a) => a.status === "archived");
  return (
    <>
      <Topbar title="Applications" sub="Every job you picked, by stage. Open one to do its next step." />
      <div className="page stack" style={{ maxWidth: 1100 }}>
        {apps === null && <div className="stack" style={{ gap: 8 }}>{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 56 }} />)}</div>}
        {apps && !apps.length && (
          <div className="card empty"><Briefcase size={28} /><div className="h2">No applications yet</div>
            <p>Pick a job in Scout and it shows up here, with its next step.</p>
            <Link className="btn primary lg" href="/scout">Find me jobs <ArrowRight size={15} /></Link></div>
        )}
        {apps && GROUPS.map((g) => {
          const rows = apps.filter((a) => g.statuses.includes(a.status));
          if (!rows.length) return null;
          return (
            <section key={g.key} aria-labelledby={`g-${g.key}`}>
              <div className="group-head"><h2 id={`g-${g.key}`} className="h3">{g.title} <span className="count-pill">{rows.length}</span></h2><span className="caption">{g.hint}</span></div>
              <div className="app-list">{rows.map((a) => <Row key={a.id} a={a} />)}</div>
            </section>
          );
        })}
        {archived.length > 0 && <section>
          <button className="btn ghost sm" style={{ paddingLeft: 0 }} onClick={() => setShowArchived(!showArchived)} aria-expanded={showArchived}>
            <ChevronDown size={14} style={{ transform: showArchived ? "rotate(180deg)" : "none" }} />Archived ({archived.length})</button>
          {showArchived && <div className="app-list" style={{ marginTop: 8 }}>{archived.map((a) => <Row key={a.id} a={a} />)}</div>}
        </section>}
      </div>
    </>
  );
}
