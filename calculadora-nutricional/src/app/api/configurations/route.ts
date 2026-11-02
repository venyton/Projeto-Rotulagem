import { NextResponse } from "next/server";

import { getResolvedConfigurations } from "@/features/configuration/services/configuration-service";
import { getCurrentSaaSContext } from "@/features/saas/services/entitlements";

export async function GET(request: Request) {
  const context = await getCurrentSaaSContext();
  if (!context) return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });

  const query = new URL(request.url).searchParams;
  const keys = query.getAll("key").flatMap((value) => value.split(",").map((key) => key.trim()).filter(Boolean));
  const configurations = await getResolvedConfigurations({
    organizationId: context.organization.id,
    userId: context.user.id,
    keys: keys.length ? keys : undefined,
  });
  const data = [...configurations.values()]
    .filter((configuration) => !configuration.sensitive)
    .map((configuration) => ({
      key: configuration.key,
      value: configuration.value,
      source: configuration.source,
      valueType: configuration.valueType,
    }));

  return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
}
