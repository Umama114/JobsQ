import Link from "next/link";
import { FileText, GraduationCap, MessageCircle, Radar, Users } from "lucide-react";
import { WhatsAppPerks, WhatsAppPreview } from "@/components/WhatsApp";

const STEPS = [
  { icon: Radar, name: "Find jobs", text: "We search job sites and pick the jobs that fit your resume." },
  { icon: FileText, name: "Tailor your resume", text: "A one-page resume for each job, from your real experience only." },
  { icon: Users, name: "Get referred", text: "We find people at the company (people you already know first) and write your LinkedIn messages and emails." },
  { icon: GraduationCap, name: "Ace the interview", text: "When a company replies, we prepare you with real questions for that company." },
];

export default function Home() {
  return (
    <main className="auth" style={{ alignItems: "flex-start", paddingTop: 40 }}>
      <div style={{ maxWidth: 880, width: "100%" }} className="stack">
        <div className="brand" style={{ justifyContent: "center" }}><span className="logo">Q</span>JobsQ</div>
        <div className="auth-card" style={{ maxWidth: "none" }}>
          <h1 className="h1">Your job search, done with you, step by step</h1>
          <p className="sub">JobsQ's AI agents find jobs, tailor your resume and help you get referred. You approve every step and send everything yourself.</p>
          <div className="grid-2" style={{ margin: "18px 0", gap: 12 }}>
            {STEPS.map(({ icon: Icon, name, text }, i) => (
              <div key={name} className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
                <span className="tag teal" style={{ height: 28, width: 28, justifyContent: "center", padding: 0, flex: "none" }}><Icon size={15} /></span>
                <span><b>{i + 1}. {name}</b><br /><span className="sub">{text}</span></span></div>
            ))}
          </div>
          <div className="row"><Link className="btn primary lg" href="/register" style={{ width: "auto", marginTop: 0 }}>Create an account</Link><Link className="btn lg" href="/login">Sign in</Link></div>
        </div>

        <div className="auth-card" style={{ maxWidth: "none" }}>
          <div className="wa-show">
            <div className="stack" style={{ gap: 12 }}>
              <span className="tag green" style={{ alignSelf: "flex-start" }}><MessageCircle size={12} />Also on WhatsApp</span>
              <h2 className="h1" style={{ fontSize: 20, margin: 0 }}>Your job search, right in your chat</h2>
              <p className="sub" style={{ margin: 0 }}>Included with your plan. No app to install: connect your WhatsApp in one tap and do everything from your phone.</p>
              <WhatsAppPerks />
            </div>
            <WhatsAppPreview />
          </div>
        </div>
      </div>
    </main>
  );
}
