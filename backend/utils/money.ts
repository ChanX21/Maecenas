export function parseUSDC(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseUSDCMicros(value: string): number {
  const match = value.trim().match(/^(\d+)(?:\.(\d{1,6}))?$/);
  if (!match) throw new Error("USDC amount must be a non-negative decimal with at most 6 places");
  const micros = Number(match[1]) * 1_000_000 + Number((match[2] ?? "").padEnd(6, "0"));
  if (!Number.isSafeInteger(micros)) throw new Error("USDC amount is too large");
  return micros;
}

export function microsToUSDC(value: number): string {
  return formatUSDC(value / 1_000_000);
}

export function formatUSDC(value: number): string {
  if (value === 0) return "0";
  return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

export function sumUSDC(values: string[]): string {
  return microsToUSDC(values.reduce((total, value) => total + parseUSDCMicros(value), 0));
}
