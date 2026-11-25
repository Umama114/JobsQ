import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth"><div className="auth-card" style={{ textAlign: "center" }}>
      <h1 className="h1">Page not found</h1>
      <p className="sub">This page doesn't exist, or it moved.</p>
      <Link className="btn primary" href="/scout">Go to JobsQ</Link>
    </div></main>
  );
}
