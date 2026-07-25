import { Netra, NetraInstruments, SpanType, type SpanOptions } from "netra-sdk";

type NetraSpan = ReturnType<typeof Netra.startSpan>;

export async function initNetra() {
  if (!process.env.NETRA_API_KEY && !process.env.NETRA_OTLP_ENDPOINT) return;
  await Netra.init({
    appName: process.env.NETRA_APP_NAME ?? "maecenas-scholar",
    environment: process.env.NETRA_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    headers: process.env.NETRA_API_KEY ? `x-api-key=${process.env.NETRA_API_KEY}` : undefined,
    traceContent: process.env.NETRA_TRACE_CONTENT !== "false",
    debugMode: process.env.NETRA_DEBUG === "true",
    disableBatch: process.env.NETRA_DISABLE_BATCH === "true",
    enableRootSpan: true,
    instruments: new Set([NetraInstruments.OPENAI, NetraInstruments.HTTP])
  });
}

export async function shutdownNetra() {
  if (Netra.isInitialized()) await Netra.shutdown();
}

export function setNetraResearchContext(input: {
  sessionId?: string;
  walletAddress?: string;
  paymentType?: string;
}) {
  if (!Netra.isInitialized()) return;
  if (input.sessionId) Netra.setSessionId(input.sessionId);
  if (input.walletAddress) Netra.setUserId(input.walletAddress);
  if (input.paymentType) Netra.setCustomAttributes("payment_type", input.paymentType);
}

export async function withNetraSpan<T>(
  name: string,
  options: SpanOptions,
  fn: (span: NetraSpan | undefined) => Promise<T>
): Promise<T> {
  if (!Netra.isInitialized()) return fn(undefined);
  const span = Netra.startSpan(name, options);
  try {
    const result = await span.withActive(() => fn(span));
    span.setSuccess();
    return result;
  } catch (error) {
    span.setError(error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    span.end();
  }
}

export { SpanType };
