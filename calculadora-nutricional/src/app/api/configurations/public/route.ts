import { NextResponse } from "next/server";

import { getResolvedConfigurations } from "@/features/configuration/services/configuration-service";

const PUBLIC_CONFIGURATION_KEYS = new Set(["user.password.min_length"]);

export async function GET(request: Request) {
  const requestedKeys = new URL(request.url).searchParams.getAll("key")
    .flatMap((value) => value.split(",").map((key) => key.trim()).filter((key) => PUBLIC_CONFIGURATION_KEYS.has(key)));
  const configurations = await getResolvedConfigurations({ keys: requestedKeys.length ? requestedKeys : [...PUBLIC_CONFIGURATION_KEYS] });
  const data = [...configurations.values()]
    .filter((configuration) => !configuration.sensitive)
    .map((configuration) => ({ key: configuration.key, value: configuration.value, valueType: configuration.valueType }));

  return NextResponse.json({ data }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}
