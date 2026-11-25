// A job's steps, in the order the user follows them.
export const STEPS = [
  { key: "resume", label: "Tailor your resume" },
  { key: "applied", label: "Apply" },
  { key: "research", label: "Find people who can refer you" },
  { key: "linkedin", label: "LinkedIn messages" },
  { key: "email", label: "Referral emails" },
  { key: "prep", label: "Interview prep" },
] as const;

export const STATUS_TONE: Record<string, string> = { saved: "amber", applied: "blue", interviewing: "violet", offer: "green", rejected: "red", archived: "" };
export const STATUS_LABEL: Record<string, string> = { saved: "To apply", applied: "Applied", interviewing: "Interviewing", offer: "Offer", rejected: "Rejected", archived: "Archived" };
export const STATUSES = ["saved", "applied", "interviewing", "offer", "rejected", "archived"];

export type Next = {
  title: string;
  text: string;
  // what the main button does: run an agent, mark applied, mark that the company replied, or nothing
  action: { kind: "agent"; agent: string; label: string } | { kind: "applied"; label: string } | { kind: "replied"; label: string } | null;
  also?: { kind: "agent"; agent: string; label: string };
};

// The one thing to do next on a job. Shown as the big button in its thread and on its card.
export function nextStep(status: string, done: Record<string, boolean>): Next {
  if (!done.resume) return { title: "Tailor your resume for this job", text: "A one-page resume that matches this job, from your real experience only.", action: { kind: "agent", agent: "resume", label: "Tailor my resume" } };
  if (status === "saved" && !done.applied) return { title: "Apply with your tailored resume", text: "Open the job, apply with the PDF above, then come back and press “I've applied”.", action: { kind: "applied", label: "I've applied" } };
  if (!done.research) return { title: "Find people who can refer you", text: "We check who you already know there, and find people at the company to ask for a referral.", action: { kind: "agent", agent: "research", label: "Find referrals" } };
  if (!done.linkedin) return { title: "Message them on LinkedIn", text: "Short, personal notes for each person. You send them yourself.", action: { kind: "agent", agent: "linkedin", label: "Write LinkedIn messages" }, also: !done.email ? { kind: "agent", agent: "email", label: "Write emails" } : undefined };
  if (!done.email) return { title: "Email them", text: "Referral emails you can open in Gmail, ready to send.", action: { kind: "agent", agent: "email", label: "Write referral emails" } };
  if (!done.prep && (status === "saved" || status === "applied")) return { title: "Waiting to hear back", text: "When the company replies or shortlists you, tell us and we'll prepare you for the interview.", action: { kind: "replied", label: "I got a reply" } };
  if (!done.prep) return { title: "Prepare for the interview", text: "Real interview questions for this company, and a plan.", action: { kind: "agent", agent: "prep", label: "Prepare me" } };
  return { title: "You're ready. Good luck!", text: "Ask anything below, or update the status when you hear back.", action: null };
}

export const nextLabel = (status: string, done: Record<string, boolean>) => {
  const n = nextStep(status, done);
  return n.action ? n.title : "All steps done";
};
