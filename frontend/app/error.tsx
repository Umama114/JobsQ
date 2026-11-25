"use client";
// Shown if a page crashes, instead of a blank screen.
import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="auth"><div className="auth-card" style={{ textAlign: "center" }}>
      <h1 className="h1">Something went wrong</h1>
      <p className="sub">Sorry about that. Try again, and if it keeps happening, go back to the start.</p>
      <div className="row" style={{ justifyContent: "center" }}><button className="btn primary" onClick={reset}>Try again</button><Link className="btn" href="/scout">Go to Scout</Link></div>
    </div></main>
  );
}
