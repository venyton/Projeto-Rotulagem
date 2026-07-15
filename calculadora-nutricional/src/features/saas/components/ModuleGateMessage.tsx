import { LockKeyhole } from "lucide-react";

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import type { SaaSModuleKey } from "@/features/saas/domain/modules";

export function ModuleGateMessage({ moduleKey: _moduleKey }: { moduleKey: SaaSModuleKey }) {
  void _moduleKey;

  return (
    <div className="app-page">
      <Empty className="bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon"><LockKeyhole aria-hidden="true" /></EmptyMedia>
          <EmptyTitle>Recurso indisponível</EmptyTitle>
          <EmptyDescription>Este recurso não está liberado para esta conta.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
