import { NextResponse } from "next/server";

import { getConfigurationDefinitionsForAdmin } from "@/features/configuration/services/configuration-service";
import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { authorizePlatformRequest } from "@/features/platform-iam/services/platform-access";

export async function GET(request: Request) {
  const access = await authorizePlatformRequest({
    permission: PLATFORM_PERMISSIONS.CONFIGURATION_READ,
    action: "platform.configurations.list.viewed",
    targetType: "CONFIGURATION",
    targetId: "/admin/settings",
  });
  if (!access.allowed) return NextResponse.json({ error: "Acesso administrativo não autorizado." }, { status: 403 });

  try {
    const definitions = await getConfigurationDefinitionsForAdmin();
    const category = new URL(request.url).searchParams.get("category");
    const data = category ? definitions.filter((definition) => definition.category === category) : definitions;
    return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar as configurações." }, { status: 500 });
  }
}
