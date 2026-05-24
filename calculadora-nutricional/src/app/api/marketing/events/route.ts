import { createHash } from "node:crypto";

import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { MarketingEventType, Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossOriginRequest } from "@/lib/security/request-origin";
import { isMarketingEventType, normalizeMarketingText } from "@/features/marketing/domain/events";
import { getCurrentSaaSContext } from "@/features/saas/services/entitlements";

function hashIp(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
  const salt = process.env.ANALYTICS_HASH_SALT || process.env.NEXTAUTH_SECRET || "dev";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

async function findOrCreateKeyword(input: {
  organizationId?: string | null;
  keyword?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
}) {
  if (!input.keyword) return null;

  const existing = await prisma.marketingKeyword.findFirst({
    where: {
      organizationId: input.organizationId ?? null,
      keyword: input.keyword,
      source: input.source,
      medium: input.medium,
      campaign: input.campaign,
    },
    select: { id: true },
  });

  if (existing) return existing;

  return prisma.marketingKeyword.create({
    data: {
      organizationId: input.organizationId ?? null,
      keyword: input.keyword,
      source: input.source,
      medium: input.medium,
      campaign: input.campaign,
    },
    select: { id: true },
  });
}

export async function POST(req: NextRequest) {
  const originError = rejectCrossOriginRequest(req);
  if (originError) return originError;

  const body = await req.json().catch(() => null) as {
    eventType?: unknown;
    route?: unknown;
    source?: unknown;
    medium?: unknown;
    campaign?: unknown;
    keyword?: unknown;
    anonymousId?: unknown;
    checkoutSessionId?: unknown;
    metadata?: unknown;
  } | null;

  const eventType = typeof body?.eventType === "string" && isMarketingEventType(body.eventType)
    ? body.eventType
    : null;

  if (!eventType) {
    return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const context = session?.user?.email ? await getCurrentSaaSContext() : null;
  const source = normalizeMarketingText(body?.source, 80);
  const medium = normalizeMarketingText(body?.medium, 80);
  const campaign = normalizeMarketingText(body?.campaign, 120);
  const keyword = normalizeMarketingText(body?.keyword, 120);

  try {
    const keywordRecord = await findOrCreateKeyword({
      organizationId: context?.organization.id ?? null,
      keyword,
      source,
      medium,
      campaign,
    });

    await prisma.marketingEvent.create({
      data: {
        organizationId: context?.organization.id ?? null,
        organizationMemberId: context?.member.id ?? null,
        userId: context?.user.id ?? null,
        keywordId: keywordRecord?.id ?? null,
        eventType: eventType as MarketingEventType,
        anonymousId: normalizeMarketingText(body?.anonymousId, 80),
        route: normalizeMarketingText(body?.route, 240),
        source,
        medium,
        campaign,
        checkoutSessionId: normalizeMarketingText(body?.checkoutSessionId, 120),
        metadata: {
          ...(typeof body?.metadata === "object" && body.metadata ? body.metadata : {}),
          ipHash: hashIp(req),
          userAgent: req.headers.get("user-agent"),
        } as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2021") {
      return NextResponse.json({ success: true, skipped: "marketing_schema_missing" }, { status: 202 });
    }

    throw error;
  }

  return NextResponse.json({ success: true }, { status: 202 });
}
