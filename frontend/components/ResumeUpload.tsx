"use client";
// Upload a resume: it fills in an application-style form by itself and the user fixes anything wrong.
// The sign-up page uses the form to create the account; Settings uses <ResumeUpload> to replace a resume.
import { useEffect, useState } from "react";
import { Check, FileUp, Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import { Avatar, useToast } from "@/lib/ui";

const SECTION_NAMES: Record<string, string> = { summary: "Summary", experience: "Experience", projects: "Projects", education: "Education", certifications: "Certifications", achievements: "Achievements" };
export type Basics = { name: string; email: string; phone: string; location: string; years: string; skills: string[] };

// Accounts need the country code. A bare 10-digit number is taken as Indian; the user can correct it in the form.
function withCountryCode(p: string) {
  const d = p.replace(/\D/g, "");
  if (!d || p.trim().startsWith("+")) return p;
  if (d.length === 10) return `+91 ${d}`;
  return d.length === 12 && d.startsWith("91") ? `+${d}` : p;
}

// Reads a resume (no account or AI needed) and turns it into the form's starting values.
export async function readResume(file: File): Promise<{ parsed: any; basics: Basics }> {
  const form = new FormData(); form.append("file", file);
  const r = await api("/v1/resume/read", { form });
  return { parsed: r, basics: { name: r.name || "", email: r.email || "", phone: withCountryCode(r.phone || ""), location: r.location || "",
    years: r.experience_years_mentioned != null ? `${r.experience_years_mentioned}+` : "", skills: r.skills || [] } };
}
type Row = { key: keyof Basics | string; label: string; kind: "line" | "area" | "chips"; text: string; items: string[] };

export function AutoFillForm({ parsed, basics, setBasics, done: doneNote = "Fix anything that's wrong, then save." }: { parsed: any; basics: Basics; setBasics: (b: Basics) => void; done?: string }) {
  const rows: Row[] = [
    { key: "name", label: "Full name", kind: "line", text: basics.name, items: [] },
    { key: "email", label: "Email", kind: "line", text: basics.email, items: [] },
    { key: "phone", label: "WhatsApp number, with country code", kind: "line", text: basics.phone, items: [] },
    { key: "location", label: "Location", kind: "line", text: basics.location, items: [] },
    { key: "years", label: "Years of experience", kind: "line", text: basics.years, items: [] },
    { key: "skills", label: "Skills", kind: "chips", text: "", items: basics.skills },
    ...Object.entries(SECTION_NAMES).filter(([k]) => parsed.sections?.[k]?.length)
      .map(([k, label]) => ({ key: k, label, kind: "area" as const, text: parsed.sections[k].slice(0, 10).join("\n"), items: [] })),
  ];
  // The form fills itself in, one field after another (at most 18 steps of 28 ms per field).
  const size = (f: Row) => (f.kind === "chips" ? f.items.length : f.text.length);
  const ticksFor = (f: Row) => Math.min(size(f), 18);
  const [total] = useState(() => rows.reduce((a, f) => a + ticksFor(f), 0));
  const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [tick, setTick] = useState(reduce ? total : 0);
  const [skill, setSkill] = useState("");
  useEffect(() => {
    if (tick >= total) return;
    const id = setInterval(() => setTick((t) => t + 1), 28);
    return () => clearInterval(id);
  }, [tick, total]);
  const filling = tick < total;
  let offset = 0;
  return (
    <div className="stack" style={{ gap: 4 }}>
      <div className="row" style={{ marginBottom: 6 }}><Avatar name={basics.name || "?"} size={36} />
        <span className="caption">{filling ? <><span className="pulse" /> Filling in your details…</> : `Filled in from your resume. ${doneNote}`}</span></div>
      <div className="form-grid">
        {rows.map((f) => {
          const n = ticksFor(f), done = Math.max(0, Math.min(n, tick - offset)); offset += n;
          const frac = !filling || !n ? 1 : done / n, filled = !filling || n === 0 || done >= n;
          const empty = size(f) === 0;
          const editable = !filling && f.kind === "line";
          return (
            <div key={f.key} className={f.kind !== "line" ? "form-wide" : undefined}>
              <label className="label" htmlFor={`rf-${f.key}`} style={{ marginTop: 8 }}>{f.label}{filled && !empty && <Check size={11} style={{ marginLeft: 5, color: "var(--green)", verticalAlign: -1 }} aria-label="filled" />}</label>
              {f.kind === "chips" ? (
                <div className="input autofill chips" style={{ height: "auto", minHeight: 38, padding: 8 }}>
                  {f.items.slice(0, Math.ceil(f.items.length * frac)).map((s) => <span className="chip" key={s}>{s}
                    {!filling && <button type="button" aria-label={`Remove ${s}`} onClick={() => setBasics({ ...basics, skills: basics.skills.filter((x) => x !== s) })}><X size={12} /></button>}</span>)}
                  {!filling && <span className="row" style={{ gap: 4, flexWrap: "nowrap" }}>
                    <input id="rf-skills" className="chip-add" value={skill} placeholder={empty ? "Add a skill" : "Add another"} onChange={(e) => setSkill(e.target.value)}
                      onKeyDown={(e) => { if (e.key !== "Enter") return; e.preventDefault(); if (skill.trim()) { if (!basics.skills.includes(skill.trim())) setBasics({ ...basics, skills: [...basics.skills, skill.trim()] }); setSkill(""); } }} />
                    {skill.trim() && <button type="button" className="btn ghost sm" aria-label="Add skill" onClick={() => { if (!basics.skills.includes(skill.trim())) setBasics({ ...basics, skills: [...basics.skills, skill.trim()] }); setSkill(""); }}><Plus size={13} /></button>}
                  </span>}
                </div>
              ) : f.kind === "area" ? (
                <textarea id={`rf-${f.key}`} className="textarea autofill" readOnly rows={Math.min(8, Math.max(2, f.text.split("\n").length + Math.floor(f.text.length / 110)))} value={f.text.slice(0, Math.ceil(f.text.length * frac))} />
              ) : (
                <input id={`rf-${f.key}`} className={`input ${editable ? "" : "autofill"}`} readOnly={!editable} placeholder={filled ? "Not found – type it in" : ""}
                  value={editable ? f.text : f.text.slice(0, Math.ceil(f.text.length * frac))}
                  onChange={(e) => setBasics({ ...basics, [f.key]: e.target.value })} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ResumeUpload({ onSaved, compact }: { onSaved: (r: { reading: boolean; message: string }) => void; compact?: boolean }) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<any>(null);
  const [basics, setBasics] = useState<Basics | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function pick(f: File | null) {
    setFile(f); setParsed(null); setBasics(null);
    if (!f) return;
    setReading(true);
    try {
      const r = await readResume(f);
      setParsed(r.parsed);
      setBasics(r.basics);
    } catch (e: any) { toast({ ok: false, text: e.message }); setFile(null); } finally { setReading(false); }
  }
  async function save() {
    if (!file || !basics) return;
    setSaving(true);
    const form = new FormData(); form.append("file", file); form.append("basics", JSON.stringify(basics));
    try { const r = await api("/v1/resume", { form }); setParsed(null); setFile(null); setBasics(null); onSaved(r); }
    catch (e: any) { toast({ ok: false, text: e.message }); } finally { setSaving(false); }
  }

  return (
    <div>
      {!parsed && !reading && (
        <label className={`dropzone ${compact ? "compact" : ""}`}>
          <FileUp size={22} aria-hidden="true" />
          <span><b>Choose your resume</b> (PDF or Word)</span>
          <span className="caption">We fill in the form from it. Nothing is saved until you press Save.</span>
          <input type="file" accept=".pdf,.docx" className="sr" onChange={(e) => pick(e.target.files?.[0] || null)} />
        </label>
      )}
      {reading && <div className="stack" style={{ gap: 8 }}><span className="caption"><span className="pulse" /> Reading {file?.name}…</span><div className="skeleton" style={{ width: "50%" }} /><div className="skeleton" /></div>}
      {parsed && basics && <div className="card inset">
        <div className="row between" style={{ marginBottom: 6 }}><div className="h3">Your details</div><span className="caption">{file?.name}</span></div>
        <AutoFillForm parsed={parsed} basics={basics} setBasics={setBasics} />
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn primary" onClick={save} disabled={saving}><Check size={15} />{saving ? "Saving…" : "Save my resume"}</button>
          <button className="btn ghost" onClick={() => { setParsed(null); setFile(null); setBasics(null); }}>Choose another file</button>
        </div>
      </div>}
    </div>
  );
}
