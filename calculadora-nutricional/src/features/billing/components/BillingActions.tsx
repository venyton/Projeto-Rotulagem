'use client'

import { useState } from "react";
import { CreditCard, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getBillingIntervalLabel, type BillingInterval } from "@/features/saas/domain/plans";

export function CheckoutButton({
  planCode,
  interval,
  label,
  className,
}: {
  planCode: string;
  interval: BillingInterval;
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    setLoading(true);
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planCode, interval }),
    });
    const data = await response.json().catch(() => null) as { url?: string; error?: string } | null;
    setLoading(false);

    if (!response.ok || !data?.url) {
      toast.error(data?.error || "Não foi possível iniciar o pagamento.");
      return;
    }

    window.gtag?.("event", "checkout_started", { plan_code: planCode, interval });
    window.fbq?.("trackCustom", "CHECKOUT_STARTED", { plan_code: planCode, interval });
    window.location.href = data.url;
  }

  return (
    <Button type="button" className={className ?? "w-full gap-2"} onClick={startCheckout} disabled={loading}>
      <CreditCard className="h-4 w-4" />
      {loading ? "Abrindo..." : label ?? `Assinar ${getBillingIntervalLabel(interval).toLowerCase()}`}
    </Button>
  );
}

export function BillingPortalButton() {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    const response = await fetch("/api/billing/portal", { method: "POST" });
    const data = await response.json().catch(() => null) as { url?: string; error?: string } | null;
    setLoading(false);

    if (!response.ok || !data?.url) {
      toast.error(data?.error || "Portal de cobrança indisponível.");
      return;
    }

    window.location.href = data.url;
  }

  return (
    <Button type="button" variant="outline" className="gap-2" onClick={openPortal} disabled={loading}>
      <ExternalLink className="h-4 w-4" />
      {loading ? "Abrindo..." : "Portal do cliente"}
    </Button>
  );
}
