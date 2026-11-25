"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Briefcase, ChevronsLeft, ChevronsRight, LogOut, MessageCircle, Moon, Radar, Settings, Sun } from "lucide-react";
import { api } from "@/lib/api";
import { MeProvider, ToastHost, getTheme, setTheme, useMe } from "@/lib/ui";

const NAV = [
  { href: "/scout", label: "Scout", icon: Radar },
  { href: "/applications", label: "Applications", icon: Briefcase },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const { me } = useMe();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    try { setCollapsed(localStorage.getItem("jq-side") === "1"); } catch {}
    setDark(document.documentElement.dataset.theme === "dark");
    api<any[]>("/v1/applications").then((a) => setCount(a.length)).catch(() => {});
  }, [path]);
  const toggle = () => { const v = !collapsed; setCollapsed(v); try { localStorage.setItem("jq-side", v ? "1" : "0"); } catch {} };
  const flipTheme = () => { const next = dark ? "light" : "dark"; setTheme(next); setDark(!dark); };
  const signOut = async () => { await api("/v1/auth/logout", { method: "POST" }).catch(() => {}); router.push("/login"); };

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`} aria-label="Main">
      <Link href="/start" className="brand" style={{ textDecoration: "none" }}><span className="logo">Q</span><span className="hide-c">JobsQ</span></Link>
      <nav className="nav">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={path.startsWith(href) ? "active" : ""} title={label}>
            <Icon size={17} aria-hidden="true" /><span className="hide-c">{label}</span>
            {href === "/applications" && count ? <span className="count hide-c">{count}</span> : null}
          </Link>
        ))}
      </nav>
      {me && me.access.level === "full" && me.channel?.status !== "active" && !collapsed && <Link href="/settings#whatsapp" className="side-wa"><MessageCircle size={16} /><span>Use JobsQ on <b>WhatsApp</b> too</span></Link>}
      <div className="side-foot">
        {me && <div className="hide-c" style={{ padding: "6px 10px 8px" }}>
          <div style={{ fontWeight: 600, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{me.user.name}</div>
          <div className="caption" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{me.access.level === "full" ? `${me.access.plan_name} plan` : "No active plan"}</div>
        </div>}
        <button className="side-btn" onClick={flipTheme} title={dark ? "Light mode" : "Dark mode"}>
          {dark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}<span className="hide-c">{dark ? "Light mode" : "Dark mode"}</span>
        </button>
        <button className="side-btn" onClick={toggle} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <ChevronsRight size={17} aria-hidden="true" /> : <ChevronsLeft size={17} aria-hidden="true" />}<span className="hide-c">Collapse</span>
        </button>
        <button className="side-btn" onClick={signOut} title="Sign out"><LogOut size={17} aria-hidden="true" /><span className="hide-c">Sign out</span></button>
      </div>
    </aside>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const onSignedOut = useCallback(() => router.push("/login"), [router]);
  useEffect(() => { if (getTheme() === "system") setTheme("system"); }, []);
  return (
    <MeProvider onSignedOut={onSignedOut}>
      <ToastHost>
        <div className="canvas">
          <div className="frame">
            <Sidebar />
            <main className="workspace">{children}</main>
          </div>
        </div>
      </ToastHost>
    </MeProvider>
  );
}
