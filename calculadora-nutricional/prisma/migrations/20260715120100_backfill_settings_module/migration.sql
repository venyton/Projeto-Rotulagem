INSERT INTO "OrganizationEntitlement" (
    "id",
    "organizationId",
    "moduleKey",
    "enabled",
    "source",
    "createdAt",
    "updatedAt"
)
SELECT
    'entitlement_settings_' || organization."id",
    organization."id",
    'SETTINGS'::"SaaSModuleKey",
    true,
    'SYSTEM_DEFAULT',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Organization" organization
ON CONFLICT ("organizationId", "moduleKey") DO UPDATE SET
    "enabled" = true,
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "OrganizationProfilePermission" (
    "id",
    "organizationProfileId",
    "moduleKey",
    "enabled",
    "createdAt",
    "updatedAt"
)
SELECT
    'permission_settings_' || profile."id",
    profile."id",
    'SETTINGS'::"SaaSModuleKey",
    profile."systemKey" IN ('OWNER', 'ADMIN'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "OrganizationProfile" profile
ON CONFLICT ("organizationProfileId", "moduleKey") DO UPDATE SET
    "enabled" = "OrganizationProfilePermission"."enabled" OR EXCLUDED."enabled",
    "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "OrganizationProfilePermission" permission
SET
    "enabled" = true,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "OrganizationProfile" profile
WHERE profile."id" = permission."organizationProfileId"
  AND profile."systemKey" = 'ADMIN';
