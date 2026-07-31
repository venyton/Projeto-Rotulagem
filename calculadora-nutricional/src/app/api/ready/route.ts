import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/observability/logger";
import { consumeRequestRateLimit, getClientAddress, getRequestRateLimit, rateLimitResponse } from "@/lib/security/request-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestLimit = await consumeRequestRateLimit(
    "readiness",
    getClientAddress({ headers: request.headers }),
    getRequestRateLimit("readiness"),
  );
  if (!requestLimit.allowed) {
    return rateLimitResponse(requestLimit, { status: "rate_limited" });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", checks: { database: "ok" } },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logEvent("error", "readiness.database_unavailable", {
      error: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      { status: "unavailable", checks: { database: "unavailable" } },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
