"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api, fmtDate } from "@/lib/api";

type Mail = { id: number; to_email: string; subject: string; body: string; created_at: string };

// Turns the link inside an email into a link on this site.
function Body({ text }: { text: string }) {
  const m = text.match(/https?:\/\/\S+/);
  if (!m) return <>{text}</>;
  const url = new URL(m[0]);
  return <>{text.slice(0, m.index)}<Link href={url.pathname + url.search}>Open the link</Link></>;
}

export default function DevInbox() {
  const [mails, setMails] = useState<Mail[]>([]);
  const [err, setErr] = useState("");
  const load = () => api<Mail[]>("/v1/dev/outbox").then(setMails).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  return (
    <main className="auth" style={{ alignItems: "start" }}>
      <div style={{ width: "100%", maxWidth: 760 }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <Link href="/scout" className="brand" style={{ textDecoration: "none", padding: 0 }}><span className="logo">Q</span>JobsQ</Link>
          <button className="btn sm" onClick={load}><RefreshCw size={14} />Refresh</button>
        </div>
        <div className="auth-card" style={{ maxWidth: "none" }}>
          <h1 className="h1">Dev inbox</h1>
          <p className="sub">No email is sent in this build. Every email the app would send appears here, newest first.</p>
          {err && <div className="note err">{err}</div>}
          <div className="stack" style={{ gap: 0 }}>
            {mails.map((m) => (
              <div key={m.id} style={{ padding: "12px 0", borderTop: "1px solid var(--border)" }}>
                <div className="row between"><b>{m.subject}</b><span className="caption">{fmtDate(m.created_at)}</span></div>
                <div className="caption">{m.to_email}</div>
                <div className="sub" style={{ marginTop: 4 }}><Body text={m.body} /></div>
              </div>
            ))}
            {!mails.length && !err && <p className="muted">No emails yet.</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
