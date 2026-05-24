import { MarketingEventType } from "@prisma/client";

export const PUBLIC_MARKETING_EVENTS = [
  MarketingEventType.SIGNUP_STARTED,
  MarketingEventType.SIGNUP_COMPLETED,
  MarketingEventType.CHECKOUT_STARTED,
  MarketingEventType.CHECKOUT_COMPLETED,
  MarketingEventType.CHECKOUT_ABANDONED,
  MarketingEventType.LOGIN,
  MarketingEventType.LEAD_CAPTURED,
] as const;

export function isMarketingEventType(value: string): value is MarketingEventType {
  return Object.values(MarketingEventType).includes(value as MarketingEventType);
}

export function normalizeMarketingText(value: unknown, maxLength = 160) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}
