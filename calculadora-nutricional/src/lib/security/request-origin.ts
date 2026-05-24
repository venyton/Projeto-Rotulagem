import { NextRequest, NextResponse } from "next/server";

export function rejectCrossOriginRequest(req: NextRequest) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  if (!origin || !host) return null;

  try {
    const originUrl = new URL(origin);
    if (originUrl.host === host) return null;
  } catch {
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  }

  return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
}
