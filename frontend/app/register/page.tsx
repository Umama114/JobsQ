"use client";
// Sign up: upload the resume first, the form fills itself in, add a password. The resume is saved right after the account is made.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileUp } from "lucide-react";
import AuthCard from "@/components/AuthCard";
import { AutoFillForm, readResume, type Basics } from "@/components/ResumeUpload";
import { api } from "@/lib/api";

const EMPTY: Basics = { name: "", email: "", phone: "", location: "", years: "", skills: [] };

export default function Register() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<any>(null);
  const [f, setF] = useState<Basics>(EMPTY);
  const [password, setPassword] = useState("");
  const [manual, setManual] = useState(false);
  const [reading, setReading] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const change = (b: Basics) => { setF(b); setErr(""); };
  const set = (k: "name" | "phone" | "email") => (e: React.ChangeEvent<HTMLInputElement>) => change({ ...f, [k]: e.target.value });

  async function pick(picked: File | null) {
    if (!picked) return;
    setReading(true); setErr("");
    try { const r = await readResume(picked); setFile(picked); setParsed(r.parsed); setF(r.basics); setManual(false); }
    catch (e: any) { setErr(e.message); } finally { setReading(false); }
  }
  const another = () => { setFile(null); setParsed(null); setF(EMPTY); setManual(false); setErr(""); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim() || !f.phone.trim() || !f.email.trim()) return setErr("Fill in your name, WhatsApp number and email.");
    if (!f.phone.trim().startsWith("+")) return setErr("Start the number with + and the country code, for example +91 98765 43210.");
    if (password.length < 8) return setErr("The password needs at least 8 characters.");
    setBusy(true);
    try {
      await api("/v1/auth/register", { body: { name: f.name, phone: f.phone, email: f.email, password } });
    } catch (e: any) { setErr(e.message); setBusy(false); return; }
    if (file) {
      const form = new FormData(); form.append("file", file); form.append("basics", JSON.stringify(f));
      try { await api("/v1/resume", { form }); } catch {}  // the account exists: the start page asks for the resume again
    }
    router.push("/start");
  }

  const filled = !!parsed, showFields = filled || manual;
  return (
    <AuthCard wide={filled} title="Create your account" sub="Start with your resume. We fill in your details from it." foot={<>Already have an account? <Link href="/login">Sign in</Link></>}>
      <form onSubmit={submit} noValidate>
        {!showFields && (reading
          ? <div className="stack" style={{ gap: 8, marginTop: 12 }}><span className="caption"><span className="pulse" /> Reading your resume…</span><div className="skeleton" style={{ width: "50%" }} /><div className="skeleton" /></div>
          : <div className="stack" style={{ gap: 10, marginTop: 12 }}>
              <label className="dropzone">
                <FileUp size={22} aria-hidden="true" />
                <span><b>Upload your resume</b> (PDF or Word)</span>
                <span className="caption">Nothing is saved until you create your account.</span>
                <input type="file" accept=".pdf,.docx" className="sr" onChange={(e) => pick(e.target.files?.[0] || null)} />
              </label>
              <button type="button" className="btn ghost sm" onClick={() => { setManual(true); setErr(""); }}>I don't have my resume right now</button>
            </div>)}

        {filled && <>
          <div className="row between" style={{ margin: "12px 0 6px" }}><span className="caption">{file?.name}</span>
            <button type="button" className="btn ghost sm" onClick={another}>Choose another file</button></div>
          <AutoFillForm parsed={parsed} basics={f} setBasics={change} done="Fix anything that's wrong, then add a password." />
        </>}

        {manual && <>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" className="input" value={f.name} onChange={set("name")} autoComplete="name" />
          <label className="label" htmlFor="phone">WhatsApp number, with country code</label>
          <input id="phone" className="input" type="tel" value={f.phone} onChange={set("phone")} placeholder="+91 98765 43210" autoComplete="tel" />
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" value={f.email} onChange={set("email")} autoComplete="email" />
          <button type="button" className="btn ghost sm" style={{ marginTop: 8 }} onClick={another}>Upload a resume instead</button>
        </>}

        {showFields && <>
          <label className="label" htmlFor="password">Password (8 or more characters)</label>
          <input id="password" className="input" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setErr(""); }} autoComplete="new-password" />
          <div className="caption" style={{ marginTop: 8 }}>JobsQ works on WhatsApp too: jobs, resumes and referral messages right in your chat.</div>
        </>}
        {err && <div className="note err" style={{ marginTop: 12 }}>{err}</div>}
        {showFields && <button className="btn primary" type="submit" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>}
      </form>
    </AuthCard>
  );
}
