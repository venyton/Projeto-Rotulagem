import { MarketingEventType, PaymentProvider, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/features/billing/services/stripe";
import { syncStripeSubscription } from "@/features/billing/services/subscription-sync";
import { getBillingPlanForCheckout } from "@/features/saas/services/plans";
import type { BillingInterval } from "@/features/saas/domain/plans";
import type { SaaSModuleKey } from "@/features/saas/domain/modules";

function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "month" || value === "quarter" || value === "semester" || value === "year";
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export type PaidSignupCheckout = {
  checkoutSessionId: string;
  customerId: string;
  subscriptionId: string;
  customerEmail: string;
  planCode: string;
  interval: BillingInterval;
  modules: SaaSModuleKey[];
};

export async function validatePaidSignupCheckout(checkoutSessionId: string, email: string): Promise<
  | { checkout: PaidSignupCheckout }
  | { error: string }
> {
  if (!checkoutSessionId) return { error: "Escolha um plano antes de criar a conta." };

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);

  if (session.mode !== "subscription" || session.status !== "complete" || session.payment_status !== "paid") {
    return { error: "Finalize o pagamento antes de criar a conta." };
  }

  const customerEmail = (session.customer_details?.email || session.customer_email || "").trim().toLowerCase();
  if (!customerEmail || customerEmail !== email) {
    return { error: "Use no cadastro o mesmo email informado no pagamento." };
  }

  const planCode = session.metadata?.planCode || "";
  const interval = isBillingInterval(session.metadata?.interval) ? session.metadata.interval : null;
  const plan = planCode ? await getBillingPlanForCheckout(planCode) : null;

  if (!plan || !interval) {
    return { error: "Plano do checkout não encontrado." };
  }

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (!customerId || !subscriptionId) {
    return { error: "Assinatura Stripe não encontrada para este pagamento." };
  }

  return {
    checkout: {
      checkoutSessionId,
      customerId,
      subscriptionId,
      customerEmail,
      planCode: plan.code,
      interval,
      modules: plan.modules,
    },
  };
}

export async function attachPaidCheckoutToAccount(input: {
  checkout: PaidSignupCheckout;
  user: { id: string; email: string };
  organization: { id: string; name: string };
  registration: {
    companyName: string;
    document: string;
    phone: string;
  };
}) {
  const stripe = getStripeClient();

  await prisma.billingCustomer.upsert({
    where: {
      organizationId_provider: {
        organizationId: input.organization.id,
        provider: PaymentProvider.STRIPE,
      },
    },
    create: {
      organizationId: input.organization.id,
      userId: input.user.id,
      provider: PaymentProvider.STRIPE,
      providerCustomerId: input.checkout.customerId,
      email: input.user.email,
      metadata: {
        organizationName: input.organization.name,
        checkoutSessionId: input.checkout.checkoutSessionId,
        document: input.registration.document || null,
        phone: input.registration.phone || null,
      },
    },
    update: {
      userId: input.user.id,
      providerCustomerId: input.checkout.customerId,
      email: input.user.email,
      metadata: {
        organizationName: input.organization.name,
        checkoutSessionId: input.checkout.checkoutSessionId,
        document: input.registration.document || null,
        phone: input.registration.phone || null,
      },
    },
  });

  await stripe.subscriptions.update(input.checkout.subscriptionId, {
    metadata: {
      organizationId: input.organization.id,
      userId: input.user.id,
      planCode: input.checkout.planCode,
      interval: input.checkout.interval,
      signupFlow: "public_paid_signup",
    },
  });

  const subscription = await stripe.subscriptions.retrieve(input.checkout.subscriptionId);
  await syncStripeSubscription(subscription);

  await prisma.marketingEvent.create({
    data: {
      organizationId: input.organization.id,
      userId: input.user.id,
      eventType: MarketingEventType.CHECKOUT_COMPLETED,
      checkoutSessionId: input.checkout.checkoutSessionId,
      providerCustomerId: input.checkout.customerId,
      metadata: toJson({
        planCode: input.checkout.planCode,
        interval: input.checkout.interval,
        registrationCompanyName: input.registration.companyName,
      }),
    },
  }).catch(() => null);
}
