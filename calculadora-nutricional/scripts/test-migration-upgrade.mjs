import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const composeFile = "docker-compose.local.yml";
const baselineMigration = "0_baseline_pre_prisma_migrate";
const reconciliationMigration = "20260825114500_reconcile_historical_schema";
const localDatabaseBaseUrl = "postgresql://calculadora_local:calculadora_local@127.0.0.1:54329";
const databasePrefix = "soizi_migration_test_";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: { ...process.env, ...options.env },
    input: options.input,
    encoding: options.capture ? "utf8" : undefined,
    stdio: options.capture ? ["pipe", "pipe", "pipe"] : [options.input ? "pipe" : "inherit", "inherit", "inherit"],
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = options.capture ? (result.stderr || result.stdout || "").trim() : "";
    throw new Error(`${command} falhou com status ${result.status}.${detail ? ` ${detail}` : ""}`);
  }
  return options.capture ? result.stdout.trim() : "";
}

function assertDisposableDatabaseName(databaseName) {
  if (!new RegExp(`^${databasePrefix}[a-z0-9_]+$`).test(databaseName)) {
    throw new Error(`Nome de banco descartável recusado: ${databaseName}`);
  }
}

function adminSql(sql) {
  return run(
    "docker",
    [
      "compose", "-f", composeFile, "exec", "-T", "postgres", "psql",
      "-U", "calculadora_local", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-qAt",
    ],
    { input: sql, capture: true },
  );
}

function databaseSql(databaseName, sql, capture = false) {
  assertDisposableDatabaseName(databaseName);
  return run(
    "docker",
    [
      "compose", "-f", composeFile, "exec", "-T", "postgres", "psql",
      "-U", "calculadora_local", "-d", databaseName, "-v", "ON_ERROR_STOP=1", "-qAt",
    ],
    { input: sql, capture },
  );
}

function databaseUrl(databaseName) {
  assertDisposableDatabaseName(databaseName);
  return `${localDatabaseBaseUrl}/${databaseName}?schema=public`;
}

function prismaEnv(databaseName) {
  const url = databaseUrl(databaseName);
  return {
    POSTGRES_PRISMA_URL: url,
    POSTGRES_URL_NON_POOLING: url,
    DATABASE_URL: url,
  };
}

function createDatabase(databaseName) {
  assertDisposableDatabaseName(databaseName);
  dropDatabase(databaseName);
  adminSql(`CREATE DATABASE "${databaseName}" OWNER calculadora_local;`);
}

function dropDatabase(databaseName) {
  assertDisposableDatabaseName(databaseName);
  adminSql(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '${databaseName}' AND pid <> pg_backend_pid();
    DROP DATABASE IF EXISTS "${databaseName}";
  `);
}

function prisma(databaseName, args, schemaPath = "./prisma/schema.prisma") {
  run("npx", ["prisma", ...args, `--schema=${schemaPath}`], { env: prismaEnv(databaseName) });
}

function assertNoSchemaDiff(databaseName) {
  run(
    "npx",
    [
      "prisma", "migrate", "diff",
      "--from-url", databaseUrl(databaseName),
      "--to-schema-datamodel", "./prisma/schema.prisma",
      "--exit-code",
    ],
    { env: prismaEnv(databaseName) },
  );
}

function createPreReconciliationPrismaDirectory() {
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), "soizi-prisma-upgrade-"));
  const prismaDirectory = resolve(temporaryRoot, "prisma");
  const migrationDirectory = resolve(prismaDirectory, "migrations");
  mkdirSync(migrationDirectory, { recursive: true });
  cpSync(resolve(projectRoot, "prisma/schema.prisma"), resolve(prismaDirectory, "schema.prisma"));

  for (const entry of readdirSync(resolve(projectRoot, "prisma/migrations"), { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name >= reconciliationMigration) continue;
    cpSync(
      resolve(projectRoot, "prisma/migrations", entry.name),
      resolve(migrationDirectory, entry.name),
      { recursive: true },
    );
  }

  return {
    temporaryRoot,
    schemaPath: resolve(prismaDirectory, "schema.prisma"),
  };
}

function testCleanInstall(databaseName) {
  createDatabase(databaseName);
  prisma(databaseName, ["migrate", "deploy"]);
  prisma(databaseName, ["migrate", "status"]);
  assertNoSchemaDiff(databaseName);

  const evidence = JSON.parse(databaseSql(databaseName, `
    SELECT json_build_object(
      'tables', (SELECT count(*) FROM pg_tables WHERE schemaname = 'public'),
      'externalIdentityTable', (SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ExternalIdentity'),
      'enums', (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e'),
      'migrations', (SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL),
      'invalidForeignKeys', (SELECT count(*) FROM pg_constraint WHERE contype = 'f' AND NOT convalidated),
      'platformRoles', (SELECT count(*) FROM "PlatformRole"),
      'platformPermissions', (SELECT count(*) FROM "PlatformPermission"),
      'platformRolePermissions', (SELECT count(*) FROM "PlatformRolePermission"),
      'featureDefinitions', (SELECT count(*) FROM "FeatureDefinition"),
      'asaasProviderEnum', (
        SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'PaymentProvider' AND e.enumlabel = 'ASAAS'
      ),
      'checkoutCycleTables', (
        SELECT count(*) FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN ('BillingCheckoutAttempt', 'BillingCharge')
      ),
      'webhookInboxColumns', (
        SELECT count(*) FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'BillingWebhookEvent'
          AND column_name IN (
            'organizationId', 'payloadHash', 'eventDate', 'processingAttempts',
            'processingLeaseId', 'processingLeaseExpiresAt', 'lastErrorCode'
          )
      ),
      'commercialBenefitTables', (
        SELECT count(*) FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN ('CommercialCoupon', 'CommercialCouponPlan', 'CouponRedemption', 'CommercialGrant', 'CommercialGrantFeature')
      ),
      'usageTables', (
        SELECT count(*) FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN ('UsageEvent', 'UsageAggregate')
      ),
      'privilegedSessionColumns', (
        SELECT count(*) FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'PrivilegedSession'
          AND column_name IN (
            'requestedByUserId', 'approvedByUserId', 'platformPermissionId',
            'status', 'sessionBindingHash', 'mfaVerifiedAt', 'expiresAt',
            'correlationId', 'requestedDurationMinutes'
          )
      ),
      'organizationUpdateHigh', (
        SELECT count(*) FROM "PlatformPermission"
        WHERE "key" = 'platform.organizations.update' AND "riskLevel" = 'HIGH'
      ),
      'supportAccessGrant', (
        SELECT count(*) FROM "PlatformRolePermission" rp
        JOIN "PlatformRole" r ON r."id" = rp."platformRoleId"
        JOIN "PlatformPermission" p ON p."id" = rp."platformPermissionId"
        WHERE r."key" = 'SUPPORT_AGENT' AND p."key" = 'platform.support.access_request'
      ),
      'catalogImmutabilityTriggers', (
        SELECT count(*) FROM pg_trigger
        WHERE tgname IN (
          'PlanVersion_immutable_after_publish',
          'PlanVersionFeature_immutable_after_publish',
          'BillingPrice_immutable_after_publish'
        ) AND NOT tgisinternal
      )
    )::text;
  `, true));

  if (
    evidence.tables !== 57 ||
    evidence.externalIdentityTable !== 1 ||
    evidence.enums !== 32 ||
    evidence.migrations !== 36 ||
    evidence.invalidForeignKeys !== 0 ||
    evidence.platformRoles !== 9 ||
    evidence.platformPermissions !== 24 ||
    evidence.platformRolePermissions !== 83 ||
    evidence.featureDefinitions !== 11 ||
    evidence.asaasProviderEnum !== 1 ||
    evidence.checkoutCycleTables !== 2 ||
    evidence.webhookInboxColumns !== 7 ||
    evidence.commercialBenefitTables !== 5 ||
    evidence.usageTables !== 2 ||
    evidence.privilegedSessionColumns !== 9 ||
    evidence.organizationUpdateHigh !== 1 ||
    evidence.supportAccessGrant !== 1 ||
    evidence.catalogImmutabilityTriggers !== 3
  ) {
    throw new Error(`Instalação limpa divergente: ${JSON.stringify(evidence)}`);
  }

  return evidence;
}

function testSeededUpgrade(databaseName) {
  const { temporaryRoot, schemaPath } = createPreReconciliationPrismaDirectory();
  try {
    createDatabase(databaseName);
    databaseSql(
      databaseName,
      readFileSync(resolve(projectRoot, "prisma/migrations", baselineMigration, "migration.sql"), "utf8"),
    );
    prisma(databaseName, ["migrate", "resolve", "--applied", baselineMigration], schemaPath);

    databaseSql(databaseName, `
      INSERT INTO "User" ("id", "email", "password", "name", "updatedAt")
        VALUES ('legacy-user', 'legacy@example.test', 'not-a-real-hash', 'Legacy User', CURRENT_TIMESTAMP);
      INSERT INTO "Ingredient" ("id", "name", "energy", "carbs", "protein", "fatTotal", "fatSat", "fatTrans", "fiber", "sodium")
        VALUES ('legacy-ingredient', 'Legacy Ingredient', 100, 10, 5, 2, 1, 0, 3, 20);
      INSERT INTO "CustomIngredient" ("id", "userId", "name", "energy", "carbs", "protein", "fatTotal", "fatSat", "fatTrans", "fiber", "sodium", "sugarTotal")
        VALUES ('legacy-custom', 'legacy-user', 'Legacy Custom', 100, 10, 5, 2, 1, 0, 3, 20, 4);
      INSERT INTO "GeneratedTable" ("id", "userId", "title", "portion", "uom", "householdMeasure", "popGroup", "updatedAt")
        VALUES ('legacy-table', 'legacy-user', 'Legacy Table', 100, 'g', '1 porção', 'adult', CURRENT_TIMESTAMP);
      INSERT INTO "TableItem" ("id", "tableId", "name", "quantity", "energy", "carbs", "protein", "fatTotal", "fatSat", "fatTrans", "fiber", "sodium")
        VALUES ('legacy-item', 'legacy-table', 'Legacy Item', 100, 100, 10, 5, 2, 1, 0, 3, 20);
    `);

    prisma(databaseName, ["migrate", "deploy"], schemaPath);

    databaseSql(databaseName, `
      INSERT INTO "OrganizationEntitlement" ("id", "organizationId", "moduleKey", "enabled", "usageLimit", "source", "updatedAt")
      SELECT 'legacy-entitlement', "id", 'TABLES', true, 321, 'MIGRATION_TEST', CURRENT_TIMESTAMP
      FROM "Organization" WHERE "ownerId" = 'legacy-user' ORDER BY "createdAt", "id" LIMIT 1;

      INSERT INTO "Plan" ("id", "code", "name", "monthlyPriceCents", "updatedAt")
        VALUES ('legacy-plan', 'LEGACY_TEST', 'Legacy Plan', 1234, CURRENT_TIMESTAMP);
      INSERT INTO "PlanModule" ("id", "planId", "moduleKey", "usageLimit")
        VALUES ('legacy-plan-module', 'legacy-plan', 'TABLES', 321);
      INSERT INTO "BillingCustomer" ("id", "organizationId", "userId", "providerCustomerId", "email", "updatedAt")
      SELECT 'legacy-billing-customer', "id", 'legacy-user', 'legacy-provider-customer', 'legacy@example.test', CURRENT_TIMESTAMP
      FROM "Organization" WHERE "ownerId" = 'legacy-user' ORDER BY "createdAt", "id" LIMIT 1;
      INSERT INTO "Subscription" ("id", "organizationId", "planId", "providerSubscriptionId", "status", "updatedAt")
      SELECT 'legacy-subscription', "id", 'legacy-plan', 'legacy-provider-subscription', 'ACTIVE', CURRENT_TIMESTAMP
      FROM "Organization" WHERE "ownerId" = 'legacy-user' ORDER BY "createdAt", "id" LIMIT 1;
      INSERT INTO "BillingWebhookEvent" ("id", "providerEventId", "type", "payload", "updatedAt")
        VALUES ('legacy-webhook', 'legacy-event-id', 'legacy.test', '{"safe":true}'::jsonb, CURRENT_TIMESTAMP);
      INSERT INTO "MarketingKeyword" ("id", "organizationId", "keyword", "source", "updatedAt")
      SELECT 'legacy-keyword', "id", 'legacy', 'migration-test', CURRENT_TIMESTAMP
      FROM "Organization" WHERE "ownerId" = 'legacy-user' ORDER BY "createdAt", "id" LIMIT 1;
      INSERT INTO "MarketingEvent" ("id", "organizationId", "userId", "keywordId", "eventType", "moduleKey")
      SELECT 'legacy-marketing-event', "id", 'legacy-user', 'legacy-keyword', 'MODULE_USED', 'TABLES'
      FROM "Organization" WHERE "ownerId" = 'legacy-user' ORDER BY "createdAt", "id" LIMIT 1;
    `);

    prisma(databaseName, ["migrate", "deploy"]);
    prisma(databaseName, ["migrate", "status"]);
    databaseSql(databaseName, `
      INSERT INTO "ExternalIdentity" ("id", "provider", "providerAccountId", "userId")
        VALUES ('legacy-external-identity', 'google', 'verified-provider-subject', 'legacy-user');
    `);
    assertNoSchemaDiff(databaseName);

    databaseSql(databaseName, `
      DO $$
      BEGIN
        BEGIN
          UPDATE "PlanVersion" SET "versionNumber" = 2 WHERE "planId" = 'legacy-plan';
          RAISE EXCEPTION 'plan version immutability trigger did not reject';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM = 'plan version immutability trigger did not reject' THEN RAISE; END IF;
        END;

        BEGIN
          UPDATE "PlanVersionFeature" SET "enabled" = false
          WHERE "planVersionId" = 'pv_legacy_' || md5('legacy-plan');
          RAISE EXCEPTION 'plan feature immutability trigger did not reject';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM = 'plan feature immutability trigger did not reject' THEN RAISE; END IF;
        END;

        BEGIN
          UPDATE "BillingPrice" SET "amountMinor" = 999
          WHERE "planVersionId" = 'pv_legacy_' || md5('legacy-plan');
          RAISE EXCEPTION 'billing price immutability trigger did not reject';
        EXCEPTION WHEN OTHERS THEN
          IF SQLERRM = 'billing price immutability trigger did not reject' THEN RAISE; END IF;
        END;
      END $$;

      INSERT INTO "Organization" ("id", "ownerId", "name", "slug", "updatedAt")
        VALUES ('policy-v2-organization', 'legacy-user', 'Policy V2', 'policy-v2', CURRENT_TIMESTAMP);
    `);

    const evidence = JSON.parse(databaseSql(databaseName, `
      SELECT json_build_object(
        'users', (SELECT count(*) FROM "User" WHERE "id" = 'legacy-user'),
        'externalIdentities', (SELECT count(*) FROM "ExternalIdentity" WHERE "id" = 'legacy-external-identity' AND "userId" = 'legacy-user'),
        'tables', (SELECT count(*) FROM "GeneratedTable" WHERE "id" = 'legacy-table'),
        'items', (SELECT count(*) FROM "TableItem" WHERE "id" = 'legacy-item'),
        'customIngredients', (SELECT count(*) FROM "CustomIngredient" WHERE "id" = 'legacy-custom'),
        'unscopedResources', (
          (SELECT count(*) FROM "GeneratedTable" WHERE "id" = 'legacy-table' AND "organizationId" IS NULL) +
          (SELECT count(*) FROM "CustomIngredient" WHERE "id" = 'legacy-custom' AND "organizationId" IS NULL)
        ),
        'memberships', (SELECT count(*) FROM "OrganizationMember" WHERE "userId" = 'legacy-user'),
        'entitlements', (SELECT count(*) FROM "OrganizationEntitlement" WHERE "id" = 'legacy-entitlement' AND "usageLimit" = 321),
        'plans', (SELECT count(*) FROM "Plan" WHERE "id" = 'legacy-plan' AND "monthlyPriceCents" = 1234),
        'billingCustomers', (SELECT count(*) FROM "BillingCustomer" WHERE "id" = 'legacy-billing-customer'),
        'billingCustomerBackfill', (
          SELECT count(*) FROM "BillingCustomer"
          WHERE "id" = 'legacy-billing-customer'
            AND "status" = 'ACTIVE'
            AND "providerCustomerId" = 'legacy-provider-customer'
            AND "lastSyncedAt" IS NOT NULL
        ),
        'subscriptions', (SELECT count(*) FROM "Subscription" WHERE "id" = 'legacy-subscription' AND "status" = 'ACTIVE'),
        'webhooks', (SELECT count(*) FROM "BillingWebhookEvent" WHERE "id" = 'legacy-webhook'),
        'marketingEvents', (SELECT count(*) FROM "MarketingEvent" WHERE "id" = 'legacy-marketing-event'),
        'invalidForeignKeys', (SELECT count(*) FROM pg_constraint WHERE contype = 'f' AND NOT convalidated),
        'migrations', (SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL),
        'platformRoles', (SELECT count(*) FROM "PlatformRole"),
        'platformPermissions', (SELECT count(*) FROM "PlatformPermission"),
        'platformRolePermissions', (SELECT count(*) FROM "PlatformRolePermission"),
        'featureDefinitions', (SELECT count(*) FROM "FeatureDefinition"),
        'asaasProviderEnum', (
          SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'PaymentProvider' AND e.enumlabel = 'ASAAS'
        ),
        'checkoutCycleTables', (
          SELECT count(*) FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename IN ('BillingCheckoutAttempt', 'BillingCharge')
        ),
        'webhookInboxColumns', (
          SELECT count(*) FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'BillingWebhookEvent'
            AND column_name IN (
              'organizationId', 'payloadHash', 'eventDate', 'processingAttempts',
              'processingLeaseId', 'processingLeaseExpiresAt', 'lastErrorCode'
            )
        ),
        'commercialBenefitTables', (
          SELECT count(*) FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename IN ('CommercialCoupon', 'CommercialCouponPlan', 'CouponRedemption', 'CommercialGrant', 'CommercialGrantFeature')
        ),
        'usageTables', (
          SELECT count(*) FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename IN ('UsageEvent', 'UsageAggregate')
        ),
        'privilegedSessionColumns', (
          SELECT count(*) FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'PrivilegedSession'
            AND column_name IN (
              'requestedByUserId', 'approvedByUserId', 'platformPermissionId',
              'status', 'sessionBindingHash', 'mfaVerifiedAt', 'expiresAt',
              'correlationId', 'requestedDurationMinutes'
            )
        ),
        'organizationUpdateHigh', (
          SELECT count(*) FROM "PlatformPermission"
          WHERE "key" = 'platform.organizations.update' AND "riskLevel" = 'HIGH'
        ),
        'supportAccessGrant', (
          SELECT count(*) FROM "PlatformRolePermission" rp
          JOIN "PlatformRole" r ON r."id" = rp."platformRoleId"
          JOIN "PlatformPermission" p ON p."id" = rp."platformPermissionId"
          WHERE r."key" = 'SUPPORT_AGENT' AND p."key" = 'platform.support.access_request'
        ),
        'planVersions', (SELECT count(*) FROM "PlanVersion" WHERE "planId" = 'legacy-plan' AND "versionNumber" = 1 AND "status" = 'PUBLISHED'),
        'planVersionFeatures', (
          SELECT count(*) FROM "PlanVersionFeature"
          WHERE "planVersionId" = 'pv_legacy_' || md5('legacy-plan') AND "enabled" = true AND "limitValue" = 321
        ),
        'billingPrices', (
          SELECT count(*) FROM "BillingPrice"
          WHERE "planVersionId" = 'pv_legacy_' || md5('legacy-plan') AND "amountMinor" = 1234 AND "billingInterval" = 'MONTHLY'
        ),
        'subscriptionPlanVersions', (
          SELECT count(*) FROM "Subscription"
          WHERE "id" = 'legacy-subscription' AND "planVersionId" = 'pv_legacy_' || md5('legacy-plan')
        ),
        'legacyPolicyVersion', (
          SELECT count(*) FROM "Organization"
          WHERE "ownerId" = 'legacy-user' AND "id" <> 'policy-v2-organization' AND "entitlementPolicyVersion" = 1
        ),
        'newPolicyVersion', (
          SELECT count(*) FROM "Organization"
          WHERE "id" = 'policy-v2-organization' AND "entitlementPolicyVersion" = 2
        ),
        'catalogImmutabilityTriggers', (
          SELECT count(*) FROM pg_trigger
          WHERE tgname IN (
            'PlanVersion_immutable_after_publish',
            'PlanVersionFeature_immutable_after_publish',
            'BillingPrice_immutable_after_publish'
          ) AND NOT tgisinternal
        )
      )::text;
    `, true));

    const expectedOne = [
      "users", "externalIdentities", "tables", "items", "customIngredients", "memberships", "entitlements",
      "plans", "billingCustomers", "billingCustomerBackfill", "subscriptions", "webhooks", "marketingEvents",
      "planVersions", "planVersionFeatures", "billingPrices", "subscriptionPlanVersions",
      "legacyPolicyVersion", "newPolicyVersion",
    ];
    if (
      expectedOne.some((key) => evidence[key] !== 1) ||
      evidence.unscopedResources !== 0 ||
      evidence.invalidForeignKeys !== 0 ||
      evidence.migrations !== 36 ||
      evidence.platformRoles !== 9 ||
      evidence.platformPermissions !== 24 ||
      evidence.platformRolePermissions !== 83 ||
      evidence.featureDefinitions !== 11 ||
      evidence.asaasProviderEnum !== 1 ||
      evidence.checkoutCycleTables !== 2 ||
      evidence.webhookInboxColumns !== 7 ||
      evidence.commercialBenefitTables !== 5 ||
      evidence.usageTables !== 2 ||
      evidence.privilegedSessionColumns !== 9 ||
      evidence.organizationUpdateHigh !== 1 ||
      evidence.supportAccessGrant !== 1 ||
      evidence.catalogImmutabilityTriggers !== 3
    ) {
      throw new Error(`Upgrade representativo divergente: ${JSON.stringify(evidence)}`);
    }

    return evidence;
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

const suffix = `${process.pid}_${Date.now().toString(36)}`.toLowerCase();
const cleanDatabase = `${databasePrefix}clean_${suffix}`;
const upgradeDatabase = `${databasePrefix}upgrade_${suffix}`;

try {
  const cleanInstall = testCleanInstall(cleanDatabase);
  const seededUpgrade = testSeededUpgrade(upgradeDatabase);
  console.log(JSON.stringify({ cleanInstall, seededUpgrade }, null, 2));
  console.log("Migration installation and seeded upgrade checks passed.");
} finally {
  for (const databaseName of [cleanDatabase, upgradeDatabase]) {
    try {
      dropDatabase(databaseName);
    } catch (error) {
      console.error(`Falha ao remover ${basename(databaseName)}:`, error instanceof Error ? error.message : error);
    }
  }
}
