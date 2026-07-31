import { NextRequest, NextResponse } from "next/server";

import { authenticateApiRequest } from "@/features/api-access/services/api-token-auth";
import { prisma } from "@/lib/prisma";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import {
  consumeRequestRateLimit,
  getRequestRateLimit,
  rateLimitResponse,
} from "@/lib/security/request-rate-limit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-store",
  "Vary": "Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const apiContext = await authenticateApiRequest(request, [SAAS_MODULES.TABLES]);
  if (!apiContext) {
    return NextResponse.json(
      { error: "Token inválido, expirado ou sem acesso ao módulo." },
      { status: 401, headers: CORS_HEADERS },
    );
  }

  const requestLimit = await consumeRequestRateLimit(
    "api.tables",
    apiContext.tokenId,
    getRequestRateLimit("apiTables"),
  );
  if (!requestLimit.allowed) {
    return rateLimitResponse(
      requestLimit,
      { error: "Limite temporário da API atingido." },
      CORS_HEADERS,
    );
  }

  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") || 50);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
  const tables = await prisma.generatedTable.findMany({
    where: { userId: apiContext.userId },
    take: limit,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      portion: true,
      uom: true,
      householdMeasure: true,
      popGroup: true,
      packageContent: true,
      servingsPerPackage: true,
      createdAt: true,
      updatedAt: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          name: true,
          quantity: true,
          energy: true,
          carbs: true,
          protein: true,
          fatTotal: true,
          fatSat: true,
          fatTrans: true,
          fiber: true,
          sodium: true,
          sugarTotal: true,
          sugarAdded: true,
        },
      },
    },
  });

  return NextResponse.json(
    { data: tables, meta: { count: tables.length, limit } },
    { headers: CORS_HEADERS },
  );
}
