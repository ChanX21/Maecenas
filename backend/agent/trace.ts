import type { TraceEvent } from "@/types";
import { makeId } from "@/utils/ids";

export function traceEvent(
  phase: TraceEvent["phase"],
  title: string,
  detail: string,
  status: TraceEvent["status"] = "completed"
): TraceEvent {
  return {
    id: makeId("evt"),
    phase,
    title,
    detail,
    status,
    createdAt: new Date().toISOString()
  };
}
