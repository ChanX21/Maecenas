import { runResearchAgent } from "@/agent/research-agent";
import { completeResearch, failResearch } from "@/db/store";
import type { ResearchStrategy, TraceEvent } from "@/types";

type ResearchJob = {
  runId: string;
  question: string;
  budgetUSDC: string;
  strategy: ResearchStrategy;
  sessionId: string;
  walletAddress?: string;
  searchPaymentId?: string;
  paymentType: "free_sponsored" | "user_paid";
};

const queue: ResearchJob[] = [];
let active = 0;

export const activeEvents = new Map<string, TraceEvent[]>();

export function enqueueResearch(job: ResearchJob): void {
  queue.push(job);
  drain();
}

function drain(): void {
  const concurrency = Math.max(1, Number(process.env.RESEARCH_WORKER_CONCURRENCY ?? 2));
  while (active < concurrency && queue.length) {
    const job = queue.shift()!;
    active += 1;
    void run(job).finally(() => {
      active -= 1;
      drain();
    });
  }
}

async function run(job: ResearchJob): Promise<void> {
  activeEvents.set(job.runId, []);
  try {
    const result = await runResearchAgent({
      ...job,
      onEvent: (event) => {
        const list = activeEvents.get(job.runId);
        if (list) list.push(event);
      }
    });
    completeResearch(job.runId, result.answer, result.receipts);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", event: "research_job_failed", runId: job.runId, error: String(error) }));
    failResearch(job.runId);
  } finally {
    activeEvents.delete(job.runId);
  }
}

export function researchQueueStatus() {
  return { active, queued: queue.length };
}
