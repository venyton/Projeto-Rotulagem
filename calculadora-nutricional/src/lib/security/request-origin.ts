import { NextRequest, NextResponse } from "next/server";
import { getTrustedAppOrigins } from "@/lib/security/app-origin";

export function rejectCrossOriginRequest(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) {
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  }

  const trustedOrigins = getTrustedAppOrigins();
  if (trustedOrigins.has(origin)) return null;

  return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
}
