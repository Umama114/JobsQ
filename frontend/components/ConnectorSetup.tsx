"use client";
// "Your own AI" plan: connect the JobsQ Connector, which runs the agents with the user's Claude Code or Codex subscription.
import { useEffect, useRef, useState } from "react";
import { Copy, Download, KeyRound } from "lucide-react";
import { api } from "@/lib/api";
import { timeAgo, useToast } from "@/lib/ui";

type Status = { has_key: boolean; online: boolean; tool: string | null; last_seen_at: string | null };

export function copyText(text: string, toast: (t: { ok: boolean; text: string }) => void, what = "Copied.") {
  navigator.clipboard?.writeText(text).then(() => toast({ ok: true, text: what }), () => toast({ ok: false, text: "Couldn't copy. Select the text and copy it yourself." }));
}

export default function ConnectorSetup({ onOnline }: { onOnline?: () => void }) {
  const toast = useToast();
  const [st, setSt] = useState<Status | null>(null);
  const [key, setKey] = useState<{ key: string; server: string } | null>(null);
  const cb = useRef(onOnline); cb.current = onOnline;
  useEffect(() => {
    let alive = true;
    const load = () => api<Status>("/v1/connector/status").then((s) => { if (alive) { setSt(s); if (s.online) cb.current?.(); } }).catch(() => {});
    load(); const t = setInterval(load, 4000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  async function makeKey() {
    if (st?.has_key && !confirm("Make a new key? The old one stops working.")) return;
    try { setKey(await api("/v1/connector/key", { method: "POST" })); } catch (e: any) { toast({ ok: false, text: e.message }); }
  }
  const cmd = key ? `node jobsq-connector.mjs --key ${key.key}${key.server !== "http://localhost:8000" ? ` --server ${key.server}` : ""}` : "";

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row"><span className={`dot ${st?.online ? "on" : ""}`} />
        <b>{st?.online ? `Connected – using ${st.tool === "codex" ? "Codex" : "Claude Code"}` : "Not connected"}</b>
        {!st?.online && st?.last_seen_at && <span className="caption">last seen {timeAgo(st.last_seen_at)}</span>}</div>
      {!st?.online && <ol className="sub" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
        <li>Have <b>Claude Code</b> or <b>Codex</b> installed on your computer and signed in with your subscription.</li>
        <li>You need <b>Node.js</b> (nodejs.org). Then <a href="/download/connector" download><Download size={13} style={{ verticalAlign: -2 }} /> download the JobsQ Connector</a>.</li>
        <li>Make your key: <button className="btn sm" onClick={makeKey}><KeyRound size={13} />{st?.has_key ? "Make a new key" : "Make a connector key"}</button></li>
        {key && <li>In a terminal, in the folder where you saved the file, run this once (the key is shown only now):
          <div className="cmd" style={{ marginTop: 6 }}><code>{cmd}</code><button className="btn ghost sm" aria-label="Copy command" onClick={() => copyText(cmd, toast, "Command copied.")}><Copy size={13} /></button></div>
          <span className="caption">Next time just run <span className="mono">node jobsq-connector.mjs</span>. Keep its window open while you use JobsQ.</span></li>}
      </ol>}
      {st?.online && <p className="caption" style={{ margin: 0 }}>The agents run on your computer while the connector window is open. Close it and they pause.</p>}
    </div>
  );
}
