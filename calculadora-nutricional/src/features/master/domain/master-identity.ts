function configuredMasterEmails() {
  return (process.env.INTERNAL_MASTER_EMAILS || process.env.MASTER_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isInternalMasterEmail(email?: string | null) {
  if (!email) return false;
  return configuredMasterEmails().includes(email.trim().toLowerCase());
}
