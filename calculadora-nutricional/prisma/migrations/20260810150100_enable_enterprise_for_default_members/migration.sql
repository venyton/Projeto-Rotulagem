-- Colaboradores compartilham todos os módulos operacionais do tenant.
-- SETTINGS continua reservado à gestão da organização.
UPDATE "OrganizationProfilePermission" permission
SET
  "enabled" = true,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "OrganizationProfile" profile
WHERE profile."id" = permission."organizationProfileId"
  AND profile."systemKey" = 'MEMBER'
  AND permission."moduleKey" = 'ENTERPRISE_LABELS'::"SaaSModuleKey";
