"use client";

import { AppErrorState } from "@/components/errors/AppErrorState";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <AppErrorState
      title="Não foi possível carregar o workspace"
      description="Sua sessão foi preservada. Tente novamente; se o problema continuar, volte ao início e entre outra vez."
      reset={reset}
    />
  );
}
