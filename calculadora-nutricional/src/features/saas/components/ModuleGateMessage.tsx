import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SaaSModuleKey } from "@/features/saas/domain/modules";

export function ModuleGateMessage({ moduleKey: _moduleKey }: { moduleKey: SaaSModuleKey }) {
  void _moduleKey;

  return (
    <div className="container mx-auto px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Recurso indisponível</CardTitle>
          <CardDescription>
            Este recurso não está liberado para esta conta.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
