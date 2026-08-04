import { ArrowUpRight, Bot, CircleDollarSign, FileCheck2 } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const requestExample = `curl ${apiBase}/api/research \\
  -H 'Content-Type: application/json' \\
  -d '{
    "sessionId": "agent_demo_001",
    "clientRequestId": "request_demo_001",
    "question": "Which evidence best explains stablecoin adoption?",
    "strategy": "balanced",
    "budgetUSDC": "0.0050"
  }'`;

const steps = [
  {
    icon: Bot,
    title: "Commission",
    endpoint: "POST /api/research",
    copy: "Send a question, evidence budget, research posture, and stable request ID."
  },
  {
    icon: CircleDollarSign,
    title: "Fund when required",
    endpoint: "HTTP 402",
    copy: "Sponsored quota needs no wallet. Paid runs use wallet authentication and the x402 payment endpoints."
  },
  {
    icon: FileCheck2,
    title: "Collect the brief",
    endpoint: "GET /api/research/runs/:id",
    copy: "Poll processing runs, then fetch the cited answer and its funding receipts."
  }
];

export default function AgentsPage() {
  return (
    <main className="home-grid min-h-[calc(100vh-65px)] px-4 py-14 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Agent interface"
        title="Maecenas is callable."
        copy="Research agents can commission evidence-grounded work over HTTP, fund selected sources, and retrieve an auditable cited brief."
      />

      <section className="mx-auto mt-10 grid max-w-6xl gap-4 md:grid-cols-3">
        {steps.map(({ icon: Icon, title, endpoint, copy }) => (
          <article key={title} className="roman-panel p-5 sm:p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 text-gold">
              <Icon size={18} />
            </span>
            <h2 className="mt-5 font-display text-2xl text-cream">{title}</h2>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-gold">{endpoint}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{copy}</p>
          </article>
        ))}
      </section>

      <section className="roman-panel mx-auto mt-5 max-w-6xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-marble/10 px-5 py-4 sm:px-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">First request</p>
            <p className="mt-1 text-sm text-cream">No SDK required.</p>
          </div>
          <a
            href={`${apiBase}/api/health`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-gold hover:text-cream"
          >
            API health <ArrowUpRight size={12} />
          </a>
        </div>
        <pre className="m-3 overflow-x-auto rounded-lg border border-marble/10 bg-marble/[0.06] p-4 font-mono text-[11px] leading-5 text-cream sm:m-6 sm:p-5 sm:text-xs sm:leading-6">
          <code>{requestExample}</code>
        </pre>
        <div className="border-t border-marble/10 px-5 py-4 text-xs leading-5 text-muted sm:px-6">
          A <code className="text-cream">202</code> response includes a <code className="text-cream">pollUrl</code>. Completed responses include an <code className="text-cream">answerId</code> for <code className="text-cream">GET /api/answers/:id</code>.
        </div>
      </section>
    </main>
  );
}
