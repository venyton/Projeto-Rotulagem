-- Forward-fix: PostgreSQL truncou o nome automático acima de 63 bytes. Um nome
-- curto explícito mantém Prisma e banco convergentes em instalação e upgrade.
ALTER INDEX IF EXISTS "BillingWebhookEvent_status_processingLeaseExpiresAt_createdAt_i"
  RENAME TO "BillingWebhookEvent_status_lease_created_idx";
