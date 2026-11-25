import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthCard({ title, sub, children, foot, wide }: { title: string; sub?: string; children: ReactNode; foot?: ReactNode; wide?: boolean }) {
  return (
    <main className="auth">
      <div style={{ width: "100%", maxWidth: wide ? 640 : 400 }}>
        <Link href="/" className="brand" style={{ justifyContent: "center", textDecoration: "none" }}><span className="logo">Q</span>JobsQ</Link>
        <div className={`auth-card ${wide ? "wide" : ""}`}>
          <h1 className="h1" style={{ marginBottom: 4 }}>{title}</h1>
          {sub && <p className="sub" style={{ margin: "0 0 8px" }}>{sub}</p>}
          {children}
        </div>
        {foot && <p className="caption" style={{ textAlign: "center", marginTop: 14 }}>{foot}</p>}
      </div>
    </main>
  );
}
