export const runtime = "edge";

import { NextResponse } from "next/server";
import { circleGatewayPaymentUrl } from "@/lib/arc-explorer";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = circleGatewayPaymentUrl(id);
  if (!url) return NextResponse.json({ error: "Invalid Circle payment ID." }, { status: 400 });

  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json().catch(() => ({ error: "Invalid response from Circle." }));

  return NextResponse.json(body, { status: response.status });
}
