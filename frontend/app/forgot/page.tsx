"use client";
import Link from "next/link";
import { useState } from "react";
import AuthCard from "@/components/AuthCard";
import { api } from "@/lib/api";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return setMsg({ ok: false, text: "Enter your email." });
    try { const r = await api("/v1/auth/password/forgot", { body: { email } }); setMsg({ ok: true, text: r.message }); } catch (e: any) { setMsg({ ok: false, text: e.message }); }
  }
  return (
    <AuthCard title="Reset your password" sub="We'll send you a link to choose a new one." foot={<>Emails aren't sent yet: find the link in the <Link href="/dev-inbox">dev inbox</Link>.</>}>
      <form onSubmit={submit} noValidate>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" className="input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setMsg(null); }} />
        {msg && <div className={`note ${msg.ok ? "ok" : "err"}`} style={{ marginTop: 12 }}>{msg.text}</div>}
        <button className="btn primary" type="submit">Send reset link</button>
      </form>
    </AuthCard>
  );
}
