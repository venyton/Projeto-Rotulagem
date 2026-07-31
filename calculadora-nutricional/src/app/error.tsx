"use client";

import { AppErrorState } from "@/components/errors/AppErrorState";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppErrorState reset={reset} />;
}
