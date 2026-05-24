import { NextRequest, NextResponse } from "next/server";
import { BillingWebhookStatus, MarketingEventType, PaymentProvider, Prisma } from "@prisma/client";
import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/features/billing/services/stripe";
import { syncStripeSubscription } from "@/features/billing/services/subscription-sync";

export const runtime = "nodejs";

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata?.organizationId;
  const userId = session.metadata?.userId;

  if (organizationId) {
    await prisma.marketingEvent.create({
      data: {
        organizationId,
        userId: userId || null,
        eventType: MarketingEventType.CHECKOUT_COMPLETED,
        checkoutSessionId: session.id,
        providerCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
        metadata: toJson(session.metadata || {}),
      },
    });
  }

  if (organizationId && typeof session.subscription === "string") {
    const subscription = await getStripeClient().subscriptions.retrieve(session.subscription);
    await syncStripeSubscription(subscription);
  }
}

async function processStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncStripeSubscription(event.data.object as Stripe.Subscription);
      break;
    default:
      break;
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook Stripe não configurado." }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  const savedEvent = await prisma.billingWebhookEvent.upsert({
    where: { providerEventId: event.id },
    create: {
      provider: PaymentProvider.STRIPE,
      providerEventId: event.id,
      type: event.type,
      status: BillingWebhookStatus.RECEIVED,
      payload: toJson(event),
    },
    update: {},
  });

  if (savedEvent.status === BillingWebhookStatus.PROCESSED) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await processStripeEvent(event);

    await prisma.billingWebhookEvent.update({
      where: { providerEventId: event.id },
      data: {
        status: BillingWebhookStatus.PROCESSED,
        processedAt: new Date(),
        errorMessage: null,
      },
    });
  } catch (error) {
    await prisma.billingWebhookEvent.update({
      where: { providerEventId: event.id },
      data: {
        status: BillingWebhookStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });

    return NextResponse.json({ error: "Falha ao processar webhook." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
