"use client";
// Get started: one step at a time. Confirm email -> plan -> (own AI: connect it) -> Find me jobs. (The resume comes from sign-up.)
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Bot, Check, Search, Sparkles } from "lucide-react";
import Topbar from "@/components/Topbar";
import ResumeUpload from "@/components/ResumeUpload";
import ConnectorSetup from "@/components/ConnectorSetup";
import WhatsAppConnect, { WhatsAppPerks, WhatsAppPreview } from "@/components/WhatsApp";
import { api } from "@/lib/api";
import { useMe, useToast } from "@/lib/ui";

type Plan = { code: string; name: string; description: string; price_inr: number | null };

function Step({ n, title, state, children }: { n: number; title: string; state: "done" | "current" | "locked"; children?: React.ReactNode }) {
  return (
    <section className={`step-card ${state}`} aria-current={state === "current" ? "step" : undefined}>
      <span className="step-num">{state === "done" ? <Check size={14} /> : n}</span>
      <div style={{ minWidth: 0 }}>
        <div className="h3" style={{ marginTop: 4 }}>{title}</div>
        {state !== "locked" && children && <div style={{ marginTop: 10 }}>{children}</div>}
      </div>
    </section>
  );
}

export default function Start() {
  const router = useRouter();
  const toast = useToast();
  const { me, reload } = useMe();
  const [profile, setProfile] = useState<any>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [choice, setChoice] = useState("jobsq_ai");
  const [aiOnline, setAiOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [waSkipped, setWaSkipped] = useState(false);
  useEffect(() => { try { setWaSkipped(localStorage.getItem("jq-wa-skip") === "1"); } catch {} }, []);

  const loadProfile = useCallback(() => api("/v1/profile").then(setProfile).catch(() => {}), []);
  useEffect(() => { loadProfile(); api<Plan[]>("/v1/plans").then(setPlans); }, [loadProfile]);
  const reading = profile && profile.chars > 0 && !profile.data?.name && !profile.data?.read_error;
  useEffect(() => { if (!reading) return; const t = setInterval(loadProfile, 3000); return () => clearInterval(t); }, [reading, loadProfile]);

  const verified = !!me?.user.email_verified, hasResume = !!profile?.chars, paid = me?.access.level === "full";
  const ownAI = me?.access.plan === "own_ai";
  const connected = !ownAI || aiOnline;
  const ready = verified && hasResume && paid && connected;
  const waDone = me?.channel?.status === "active" || waSkipped;

  // Everything is set up already: go straight to Scout.
  useEffect(() => { if (me && profile && ready && waDone && profile.data?.name) router.replace("/scout"); }, [me, profile, ready, waDone, router]);

  async function startPlan() {
    setBusy(true);
    try { await api("/v1/dev/activate-plan", { body: { plan_code: choice, days: 30 } }); await reload(); loadProfile(); toast({ ok: true, text: "Your plan is active (test mode)." }); }
    catch (e: any) { toast({ ok: false, text: e.message }); } finally { setBusy(false); }
  }
  async function findJobs() {
    setBusy(true);
    try { await api("/v1/scout/runs", { method: "POST" }); router.push("/scout"); }
    catch (e: any) { toast({ ok: false, text: e.message }); setBusy(false); }
  }

  if (!me || !profile) return <div className="page muted">Loading…</div>;
  const state = (done: boolean, before: boolean): "done" | "current" | "locked" => (done ? "done" : before ? "current" : "locked");
  let n = 0;
  return (
    <>
      <Topbar title={`Welcome${me.user.name ? ", " + me.user.name.split(" ")[0] : ""}`} sub="A few steps, then JobsQ finds jobs for you." />
      <div className="page" style={{ maxWidth: 820 }}>
        <div className="steps-v">
          <Step n={++n} title="Confirm your email" state={state(verified, true)}>
            <p className="sub" style={{ margin: "0 0 8px" }}>We sent you a link. Open it to confirm your email.</p>
            <div className="row">
              <button className="btn sm" onClick={() => api("/v1/auth/resend-verification", { method: "POST" }).then(() => toast({ ok: true, text: "We sent a new link." }), (e) => toast({ ok: false, text: e.message }))}>Send the link again</button>
              {me.dev_mode && <Link className="caption" href="/dev-inbox">Open the dev inbox (emails aren't sent yet)</Link>}
            </div>
          </Step>

          {/* The resume is added while signing up. This step only appears for an account that has none. */}
          {!hasResume && <Step n={++n} title="Add your resume" state={state(false, verified)}>
            <ResumeUpload onSaved={(r) => { toast({ ok: true, text: r.message }); loadProfile(); reload(); }} />
          </Step>}

          <Step n={++n} title="Choose your plan" state={state(paid, verified && hasResume)}>
            <div className="plan-pick" role="radiogroup" aria-label="Plan">
              {plans.map((p) => (
                <button key={p.code} role="radio" aria-checked={choice === p.code} className={`plan-card ${choice === p.code ? "on" : ""}`} onClick={() => setChoice(p.code)}>
                  <div className="row" style={{ gap: 8 }}>{p.code === "own_ai" ? <Bot size={16} /> : <Sparkles size={16} />}<b>{p.name}</b></div>
                  <p className="caption" style={{ margin: "6px 0 0" }}>{p.description}</p>
                </button>))}
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn primary" onClick={startPlan} disabled={busy}>Start {plans.find((p) => p.code === choice)?.name || "plan"}</button>
              <span className="caption">Payments aren't built yet: this starts the plan for 30 days in test mode.</span>
            </div>
          </Step>

          {ownAI && <Step n={++n} title="Connect your AI" state={state(aiOnline, paid)}>
            <ConnectorSetup onOnline={() => setAiOnline(true)} />
          </Step>}

          <Step n={++n} title="Use JobsQ on WhatsApp too (optional)" state={state(me.channel?.status === "active", paid)}>
            <div className="wa-show">
              <div className="stack" style={{ gap: 12 }}>
                <p className="sub" style={{ margin: 0 }}>Everything you do here also works in WhatsApp. Find jobs, get your tailored resume and referral messages, right in your chat.</p>
                <WhatsAppPerks />
                <div className="row">
                  <WhatsAppConnect />
                  {!waSkipped && me.channel?.status !== "active" && <button className="btn ghost sm" onClick={() => { setWaSkipped(true); try { localStorage.setItem("jq-wa-skip", "1"); } catch {} }}>Maybe later</button>}
                </div>
              </div>
              <WhatsAppPreview compact />
            </div>
          </Step>

          <Step n={++n} title="Find jobs" state={ready ? "current" : "locked"}>
            {reading ? <p className="caption" style={{ margin: 0 }}><span className="pulse" /> Reading your resume… about a minute. Then you're ready.</p>
              : profile.data?.read_error ? <div className="stack" style={{ gap: 8 }}><div className="note err">{profile.data.read_error}</div>
                  <div><button className="btn sm" onClick={() => api("/v1/resume/reread", { method: "POST" }).then(loadProfile, (e) => toast({ ok: false, text: e.message }))}>Try reading it again</button></div></div>
              : <div className="stack" style={{ gap: 10 }}>
                  <p className="sub" style={{ margin: 0 }}>We'll search job sites and pick the jobs that fit your resume best.</p>
                  <div><button className="btn primary xl glow" onClick={findJobs} disabled={busy}><Search size={18} />Find me jobs</button></div>
                </div>}
          </Step>
        </div>
      </div>
    </>
  );
}
