INSERT INTO "PlatformRolePermission" ("platformRoleId", "platformPermissionId")
SELECT role_row."id", permission_row."id"
FROM "PlatformRole" role_row
JOIN "PlatformPermission" permission_row
  ON permission_row."key" IN (
    'platform.security.operators.read',
    'platform.security.operators.manage'
  )
WHERE role_row."key" = 'PLATFORM_ADMIN'
ON CONFLICT ("platformRoleId", "platformPermissionId") DO NOTHING;
