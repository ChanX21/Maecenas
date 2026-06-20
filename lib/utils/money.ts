export function parseUSDC(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatUSDC(value: number): string {
  if (value === 0) return "0";
  return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

export function sumUSDC(values: string[]): string {
  return formatUSDC(values.reduce((total, value) => total + parseUSDC(value), 0));
}
