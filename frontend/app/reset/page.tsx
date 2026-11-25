"use client";
import Link from "next/link";
import { useState } from "react";
import AuthCard from "@/components/AuthCard";
import { api } from "@/lib/api";

export default function Reset() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return setMsg({ ok: false, text: "This link has no token." });
    if (password.length < 8) return setMsg({ ok: false, text: "The password needs at least 8 characters." });
    try { const r = await api("/v1/auth/password/reset", { body: { token, password } }); setMsg({ ok: true, text: r.message }); } catch (e: any) { setMsg({ ok: false, text: e.message }); }
  }
  return (
    <AuthCard title="Choose a new password" foot={msg?.ok ? <Link href="/login">Sign in</Link> : undefined}>
      <form onSubmit={submit} noValidate>
        <label className="label" htmlFor="pw">New password (8 or more characters)</label>
        <input id="pw" className="input" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setMsg(null); }} autoComplete="new-password" />
        {msg && <div className={`note ${msg.ok ? "ok" : "err"}`} style={{ marginTop: 12 }}>{msg.text}</div>}
        <button className="btn primary" type="submit">Change password</button>
      </form>
    </AuthCard>
  );
}
