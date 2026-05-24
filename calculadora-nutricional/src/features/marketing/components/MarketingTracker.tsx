'use client'

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

const MARKETING_EVENTS = {
  SIGNUP_STARTED: "SIGNUP_STARTED",
  CHECKOUT_COMPLETED: "CHECKOUT_COMPLETED",
  CHECKOUT_ABANDONED: "CHECKOUT_ABANDONED",
  LOGIN: "LOGIN",
} as const;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

function getAnonymousId() {
  const key = "soizi_anonymous_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const id = crypto.randomUUID();
  window.localStorage.setItem(key, id);
  return id;
}

export function MarketingTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MARKETING_TRACKING_ENABLED === "false") return;
    if (!pathname) return;

    const checkoutStatus = searchParams.get("checkout");
    const eventType = pathname.startsWith("/register")
      ? MARKETING_EVENTS.SIGNUP_STARTED
      : pathname.startsWith("/login")
        ? MARKETING_EVENTS.LOGIN
        : pathname.startsWith("/dashboard/billing") && checkoutStatus === "success"
          ? MARKETING_EVENTS.CHECKOUT_COMPLETED
          : pathname.startsWith("/dashboard/billing") && checkoutStatus === "cancel"
            ? MARKETING_EVENTS.CHECKOUT_ABANDONED
            : null;

    if (!eventType) return;

    const payload = {
      eventType,
      anonymousId: getAnonymousId(),
      route: pathname,
      source: searchParams.get("utm_source"),
      medium: searchParams.get("utm_medium"),
      campaign: searchParams.get("utm_campaign"),
      keyword: searchParams.get("utm_term"),
      checkoutSessionId: searchParams.get("session_id"),
      metadata: {
        ref: document.referrer || null,
      },
    };

    window.gtag?.("event", eventType.toLowerCase(), {
      page_path: pathname,
      campaign: payload.campaign,
      source: payload.source,
      medium: payload.medium,
      checkout_session_id: payload.checkoutSessionId,
    });
    window.fbq?.("trackCustom", eventType, {
      page_path: pathname,
      campaign: payload.campaign,
      source: payload.source,
      medium: payload.medium,
      checkout_session_id: payload.checkoutSessionId,
    });

    const beaconSent = navigator.sendBeacon?.(
      "/api/marketing/events",
      new Blob([JSON.stringify(payload)], { type: "application/json" }),
    );

    if (!beaconSent) {
      fetch("/api/marketing/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => null);
    }
  }, [pathname, searchParams]);

  return (
    <>
      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', { send_page_view: true });
            `}
          </Script>
        </>
      )}
      {metaPixelId && (
        <Script id="meta-pixel-init" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  );
}
