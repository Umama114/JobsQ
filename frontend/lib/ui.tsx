"use client";
// Small shared pieces: theme, toasts, company avatars, Markdown, and the signed-in user's data.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";

// ---------- theme ----------
export type ThemeChoice = "light" | "dark" | "system";
export function getTheme(): ThemeChoice {
  try { const t = localStorage.getItem("jq-theme"); return t === "light" || t === "dark" ? t : "system"; } catch { return "system"; }
}
export function setTheme(t: ThemeChoice) {
  try { if (t === "system") localStorage.removeItem("jq-theme"); else localStorage.setItem("jq-theme", t); } catch {}
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

// ---------- toast ----------
type Toast = { ok: boolean; text: string } | null;
const ToastCtx = createContext<(t: Toast) => void>(() => {});
export function ToastHost({ children }: { children: ReactNode }) {
  const [t, setT] = useState<Toast>(null);
  useEffect(() => { if (!t) return; const id = setTimeout(() => setT(null), 4500); return () => clearTimeout(id); }, [t]);
  return <ToastCtx.Provider value={setT}>{children}{t && <div role="status" className={`note toast ${t.ok ? "ok" : "err"}`}>{t.text}</div>}</ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);

// ---------- the signed-in user ----------
export type Me = {
  user: { id: number; name: string; email: string; phone: string; status: string; email_verified: boolean };
  access: { level: "full" | "limited" | "suspended"; plan: string | null; plan_name: string | null; access_until: string | null };
  channel: { channel: string; external_id: string; status: string; linked_at: string } | null;
  resume: { filename: string; text_chars: number; created_at: string } | null;
  usage: { messages_today: number; daily_cap: number };
  dev_mode: boolean; whatsapp_number: string;
};
const MeCtx = createContext<{ me: Me | null; reload: () => Promise<void> }>({ me: null, reload: async () => {} });
export function MeProvider({ children, onSignedOut }: { children: ReactNode; onSignedOut: () => void }) {
  const [me, setMe] = useState<Me | null>(null);
  const reload = useCallback(async () => {
    try { setMe(await api<Me>("/v1/me")); } catch (e) { if (e instanceof ApiError && e.status === 401) onSignedOut(); }
  }, [onSignedOut]);
  useEffect(() => { reload(); }, [reload]);
  return <MeCtx.Provider value={{ me, reload }}>{children}</MeCtx.Provider>;
}
export const useMe = () => useContext(MeCtx);

// ---------- avatars ----------
const COLORS = ["#0e8a6a", "#2754c5", "#6340c4", "#b4532a", "#1f7a3f", "#a8323a", "#0b6e8a", "#8a5a07"];
export function Avatar({ name, logo, size = 38 }: { name?: string; logo?: string | null; size?: number }) {
  const [bad, setBad] = useState(false);
  const n = (name || "?").trim();
  const color = COLORS[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  return (
    <div className="avatar" style={{ width: size, height: size, background: color }} aria-hidden="true">
      {logo && !bad ? <img src={logo} alt="" onError={() => setBad(true)} /> : n.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
    </div>
  );
}

// ---------- Markdown (the small subset the agents write: headings, bold, links, bullets, numbered lists) ----------
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s)]+)|`([^`]+)`/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={`${key}-${i++}`}>{m[1]}</strong>);
    else if (m[2]) out.push(<a key={`${key}-${i++}`} href={m[3]} target="_blank" rel="noreferrer">{m[2]}</a>);
    else if (m[4]) out.push(<a key={`${key}-${i++}`} href={m[4]} target="_blank" rel="noreferrer">{m[4].length > 60 ? m[4].slice(0, 57) + "…" : m[4]}</a>);
    else if (m[5]) out.push(<code key={`${key}-${i++}`}>{m[5]}</code>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = (text || "").replace(/\r/g, "").split("\n");
  let list: { ordered: boolean; items: string[] } | null = null, para: string[] = [];
  const flush = () => {
    if (para.length) { blocks.push(<p key={blocks.length}>{inline(para.join(" "), `p${blocks.length}`)}</p>); para = []; }
    if (list) { const Tag = list.ordered ? "ol" : "ul"; const k = blocks.length; blocks.push(<Tag key={k}>{list.items.map((it, j) => <li key={j}>{inline(it, `l${k}-${j}`)}</li>)}</Tag>); list = null; }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = line.match(/^#{1,4}\s+(.*)$/), b = line.match(/^\s*[-*•]\s+(.*)$/), n = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (!line.trim()) { flush(); continue; }
    if (h) { flush(); blocks.push(<h4 key={blocks.length}>{inline(h[1], `h${blocks.length}`)}</h4>); continue; }
    if (b || n) {
      const ordered = !!n;
      if (para.length) { const p = para; para = []; blocks.push(<p key={blocks.length}>{inline(p.join(" "), `p${blocks.length}`)}</p>); }
      if (list && list.ordered !== ordered) flush();
      list = list || { ordered, items: [] };
      list.items.push((b || n)![1]);
      continue;
    }
    if (list) flush();
    para.push(line);
    flush(); // the agents write one point per line, so every line is its own paragraph
  }
  flush();
  return <div className="md">{blocks}</div>;
}

export const timeAgo = (s?: string | null) => {
  if (!s) return "";
  const d = (Date.now() - new Date(s).getTime()) / 1000;
  if (Number.isNaN(d)) return "";
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
};
