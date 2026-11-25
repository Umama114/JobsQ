"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthCard from "@/components/AuthCard";
import { api } from "@/lib/api";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return setErr("Enter your email and password.");
    setBusy(true);
    try { await api("/v1/auth/login", { body: { email, password } }); router.push("/start"); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <AuthCard title="Sign in" foot={<><Link href="/forgot">Forgot your password?</Link> · <Link href="/register">Create an account</Link></>}>
      <form onSubmit={submit} noValidate>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" className="input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} autoComplete="email" />
        <label className="label" htmlFor="password">Password</label>
        <input id="password" className="input" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setErr(""); }} autoComplete="current-password" />
        {err && <div className="note err" style={{ marginTop: 12 }}>{err}</div>}
        <button className="btn primary" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </AuthCard>
  );
}
