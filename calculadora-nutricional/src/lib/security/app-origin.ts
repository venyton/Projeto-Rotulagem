const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

function parseOrigin(value: string | undefined) {
  if (!value) return null;

  const candidate = value.includes("://") ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (!HTTP_PROTOCOLS.has(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getTrustedAppOrigins() {
  const origins = [
    parseOrigin(process.env.APP_URL),
    parseOrigin(process.env.NEXTAUTH_URL),
    parseOrigin(process.env.VERCEL_URL),
  ].filter((value): value is string => Boolean(value));

  if (process.env.NODE_ENV !== "production") {
    origins.push(`http://localhost:${process.env.PORT || "3000"}`);
    origins.push(`http://127.0.0.1:${process.env.PORT || "3000"}`);
  }

  return new Set(origins);
}

export function getCanonicalAppOrigin() {
  const configured =
    parseOrigin(process.env.APP_URL) ||
    parseOrigin(process.env.NEXTAUTH_URL) ||
    parseOrigin(process.env.VERCEL_URL);

  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") {
    return `http://localhost:${process.env.PORT || "3000"}`;
  }

  return null;
}
