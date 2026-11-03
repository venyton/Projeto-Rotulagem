import { NextResponse } from "next/server";

import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { authorizePlatformRequest } from "@/features/platform-iam/services/platform-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await authorizePlatformRequest({
    permission: PLATFORM_PERMISSIONS.ACCESS,
    action: "platform.api.access.checked",
    targetType: "ADMIN_API",
    targetId: "/api/admin/access",
  });

  if (!access.allowed) {
    return NextResponse.json(
      { error: access.denialReason === "unauthenticated" ? "unauthenticated" : "forbidden" },
      {
        status: access.denialReason === "unauthenticated" ? 401 : 403,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return NextResponse.json(
    {
      access: "granted",
      source: access.source,
      roles: access.roleKeys,
      permissions: access.permissionKeys,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
