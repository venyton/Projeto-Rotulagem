import { NextResponse } from "next/server";

import { listCommercialCatalog } from "@/features/commercial-catalog/services/catalog-management";
import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { authorizePlatformRequest } from "@/features/platform-iam/services/platform-access";

export async function GET() {
  const access = await authorizePlatformRequest({
    permission: PLATFORM_PERMISSIONS.CATALOG_READ,
    action: "platform.catalog.api.accessed",
    targetType: "ADMIN_ENDPOINT",
    targetId: "/api/admin/catalog",
  });
  const headers = { "Cache-Control": "no-store" };
  if (!access.user) return NextResponse.json({ error: "Não autenticado." }, { status: 401, headers });
  if (!access.allowed) return NextResponse.json({ error: "Acesso negado." }, { status: 403, headers });

  const catalog = await listCommercialCatalog();
  return NextResponse.json(catalog, { headers });
}
