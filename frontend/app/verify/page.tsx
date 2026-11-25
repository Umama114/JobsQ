"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import AuthCard from "@/components/AuthCard";
import { api } from "@/lib/api";

export default function Verify() {
  const [state, setState] = useState<{ ok?: boolean; text: string }>({ text: "Confirming your email…" });
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return setState({ ok: false, text: "This link has no token." });
    api("/v1/auth/verify-email", { body: { token } }).then((r) => setState({ ok: true, text: r.message })).catch((e) => setState({ ok: false, text: e.message }));
  }, []);
  return (
    <AuthCard title="Email confirmation">
      <div className={`note ${state.ok === false ? "err" : state.ok ? "ok" : "info"}`} style={{ margin: "12px 0" }}>{state.text}</div>
      <Link className="btn primary" href="/start">Continue to JobsQ</Link>
    </AuthCard>
  );
}
