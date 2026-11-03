export function verifiedOAuthEmail(profile: unknown, fallbackEmail: unknown) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return null;

  const claims = profile as Record<string, unknown>;
  if (claims.email_verified !== true) return null;

  const email = claims.email ?? fallbackEmail;
  return typeof email === "string" ? email : null;
}
