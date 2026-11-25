"use client";
// WhatsApp: a preview of what JobsQ looks like there, and a one-tap way to connect.
import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, FileText, MessageCircle, Smartphone } from "lucide-react";
import { api } from "@/lib/api";
import { useMe, useToast } from "@/lib/ui";

// ---------- a small chat preview (used on the home page and after sign-up) ----------
const CHAT: { me?: boolean; text: React.ReactNode }[] = [
  { me: true, text: "find jobs" },
  { text: <>Scout found <b>6 jobs</b> that fit your resume 👇</> },
  { text: <><b>1. Acme – Frontend Developer</b><br />Hyderabad · ₹8–12L<br /><span className="wa-link">acme.com/careers/frontend</span></> },
  { me: true, text: "go 1" },
  { text: <span className="wa-file"><FileText size={16} />Resume_Acme.pdf<small>Tailored for this job · 1 page</small></span> },
  { me: true, text: "A1 applied" },
  { text: <>Nice! 2 people at Acme can refer you. Want the LinkedIn messages?</> },
];

export function WhatsAppPreview({ compact }: { compact?: boolean }) {
  return (
    <div className={`wa-phone ${compact ? "compact" : ""}`} aria-label="Example of JobsQ on WhatsApp" role="img">
      <div className="wa-top"><span className="wa-avatar">Q</span><div><b>JobsQ</b><small>online</small></div></div>
      <div className="wa-chat">
        {(compact ? CHAT.slice(0, 5) : CHAT).map((m, i) => <div key={i} className={`wa-bubble ${m.me ? "me" : ""}`}>{m.text}</div>)}
      </div>
    </div>
  );
}

// ---------- connecting ----------
type Code = { code: string; expires_in_minutes: number; whatsapp_number: string; chat_link: string | null };

export default function WhatsAppConnect({ onConnected }: { onConnected?: () => void }) {
  const toast = useToast();
  const { me, reload } = useMe();
  const [code, setCode] = useState<Code | null>(null);
  const [qr, setQr] = useState("");
  const [busy, setBusy] = useState(false);
  const connected = me?.channel?.status === "active";

  // While a code is shown, check every few seconds whether the message arrived.
  useEffect(() => {
    if (!code || connected) return;
    const t = setInterval(reload, 3000);
    return () => clearInterval(t);
  }, [code, connected, reload]);
  useEffect(() => { if (connected && code) { toast({ ok: true, text: "WhatsApp connected!" }); setCode(null); onConnected?.(); } }, [connected, code, toast, onConnected]);
  useEffect(() => {
    if (!code?.chat_link) return setQr("");
    QRCode.toDataURL(code.chat_link, { margin: 1, width: 200 }).then(setQr).catch(() => setQr(""));
  }, [code]);

  async function start() {
    setBusy(true);
    try {
      const c = await api<Code>("/v1/channels/whatsapp/link-code", { method: "POST" });
      setCode(c);
      // On a phone, open WhatsApp straight away with the message already typed.
      if (c.chat_link && matchMedia("(pointer: coarse)").matches) window.open(c.chat_link, "_blank", "noopener");
    } catch (e: any) { toast({ ok: false, text: e.message }); } finally { setBusy(false); }
  }

  if (!me) return null;
  if (connected) return (
    <div className="row"><span className="dot on" /><span>Connected to <b>+{me.channel!.external_id}</b>. Send <span className="mono">find jobs</span> to JobsQ{me.whatsapp_number ? ` (+${me.whatsapp_number})` : ""} any time.</span></div>
  );
  if (me.access.level !== "full") return (
    <span className="caption">WhatsApp comes with your plan. <Link href="/start">Start a plan</Link> to connect it.</span>
  );
  if (!code) return (
    <button className="btn wa lg" onClick={start} disabled={busy}><MessageCircle size={17} />{busy ? "One moment…" : "Connect WhatsApp"}</button>
  );
  return (
    <div className="wa-connect">
      {qr && <img src={qr} alt="QR code: scan it with your phone camera to open WhatsApp" width={160} height={160} className="wa-qr" />}
      <div className="stack" style={{ gap: 8, minWidth: 0 }}>
        <b>{qr ? "Scan with your phone's camera" : "Send this code to JobsQ on WhatsApp"}</b>
        <span className="sub">WhatsApp opens with the message ready. Just press <b>Send</b>.</span>
        {code.chat_link && <a className="btn wa" href={code.chat_link} target="_blank" rel="noreferrer"><Smartphone size={15} />Open WhatsApp on this device</a>}
        <span className="caption">Or send <span className="mono">{code.code}</span> to {code.whatsapp_number ? <b>+{code.whatsapp_number}</b> : "the JobsQ number"} from <b>+{me.user.phone}</b>. The code works for {code.expires_in_minutes} minutes.</span>
        <span className="caption"><span className="pulse" /> Waiting for your message…</span>
      </div>
    </div>
  );
}

export function WhatsAppPerks() {
  return (
    <ul className="perks">
      {["Get new jobs in your chat", "Your tailored resume as a PDF, ready to send", "Reply “A1 applied” and we find people who can refer you", "Everything stays in sync with the website"].map((t) => (
        <li key={t}><Check size={14} />{t}</li>))}
    </ul>
  );
}
