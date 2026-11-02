-- Registro operacional único para a tela administrativa consolidada.
-- Segredos de infraestrutura e credenciais Asaas continuam fora deste catálogo.

CREATE TYPE "ConfigurationScope" AS ENUM ('GLOBAL', 'ORGANIZATION', 'USER');
CREATE TYPE "ConfigurationValueType" AS ENUM ('STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'JSON', 'URL');

CREATE TABLE "ConfigurationDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "valueType" "ConfigurationValueType" NOT NULL,
    "defaultValue" JSONB NOT NULL,
    "validation" JSONB,
    "editable" BOOLEAN NOT NULL DEFAULT true,
    "sensitive" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConfigurationDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConfigurationValue" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "scope" "ConfigurationScope" NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "value" JSONB NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConfigurationValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConfigurationDefinition_key_key" ON "ConfigurationDefinition"("key");
CREATE INDEX "ConfigurationDefinition_category_active_idx" ON "ConfigurationDefinition"("category", "active");
CREATE INDEX "ConfigurationDefinition_active_key_idx" ON "ConfigurationDefinition"("active", "key");
CREATE UNIQUE INDEX "ConfigurationValue_definitionId_scopeKey_key" ON "ConfigurationValue"("definitionId", "scopeKey");
CREATE INDEX "ConfigurationValue_scope_organizationId_idx" ON "ConfigurationValue"("scope", "organizationId");
CREATE INDEX "ConfigurationValue_scope_userId_idx" ON "ConfigurationValue"("scope", "userId");
CREATE INDEX "ConfigurationValue_updatedAt_idx" ON "ConfigurationValue"("updatedAt");

ALTER TABLE "ConfigurationValue" ADD CONSTRAINT "ConfigurationValue_definitionId_fkey"
  FOREIGN KEY ("definitionId") REFERENCES "ConfigurationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConfigurationValue" ADD CONSTRAINT "ConfigurationValue_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConfigurationValue" ADD CONSTRAINT "ConfigurationValue_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConfigurationValue" ADD CONSTRAINT "ConfigurationValue_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ConfigurationDefinition" ("id", "key", "category", "label", "description", "valueType", "defaultValue", "validation", "editable", "sensitive", "active", "updatedAt") VALUES
  ('config_ui_admin_navigation', 'ui.admin.navigation', 'VISUAL', 'Navegação da gestão', 'Itens visíveis e ordem da navegação administrativa. Rotas e permissões continuam contratos seguros do servidor.', 'JSON', '[{"key":"dashboard","enabled":true,"label":"Visão geral","order":10},{"key":"organizations","enabled":true,"label":"Organizações","order":20},{"key":"billing","enabled":true,"label":"Billing Asaas","order":30},{"key":"catalog","enabled":true,"label":"Catálogo comercial","order":40},{"key":"coupons","enabled":true,"label":"Cupons","order":50},{"key":"grants","enabled":true,"label":"Grants e overrides","order":60},{"key":"metrics","enabled":true,"label":"Métricas e consumo","order":70},{"key":"audit","enabled":true,"label":"Auditoria","order":80},{"key":"privileged-sessions","enabled":true,"label":"Sessões privilegiadas","order":90},{"key":"operators","enabled":true,"label":"Operadores","order":100},{"key":"settings","enabled":true,"label":"Configurações","order":110}]', '{"maxItems":20}', true, false, true, CURRENT_TIMESTAMP),
  ('config_ui_interface_scale', 'ui.interface.scale', 'VISUAL', 'Escala da interface', 'Preferência de densidade visual persistida por usuário.', 'STRING', '"standard"', '{"enum":["compact","standard","comfortable","large"]}', true, false, true, CURRENT_TIMESTAMP),
  ('config_ui_branding_product_name', 'ui.branding.product_name', 'VISUAL', 'Nome do produto', 'Nome exibido nas superfícies autenticadas.', 'STRING', '"SoIZI"', '{"minLength":2,"maxLength":80}', true, false, true, CURRENT_TIMESTAMP),
  ('config_ui_dashboard_workspace_label', 'ui.dashboard.workspace_label', 'VISUAL', 'Nome da área de trabalho', 'Rótulo da área de navegação do workspace.', 'STRING', '"Workspace"', '{"minLength":2,"maxLength":40}', true, false, true, CURRENT_TIMESTAMP),
  ('config_access_admin_reauth_minutes', 'access.admin.reauth_minutes', 'ACESSO', 'Reautenticação administrativa', 'Janela de validade da autenticação forte administrativa.', 'INTEGER', '15', '{"min":5,"max":120}', true, false, true, CURRENT_TIMESTAMP),
  ('config_access_auth_password_reset_expiry_hours', 'access.auth.password_reset_expiry_hours', 'ACESSO', 'Validade de recuperação de senha', 'Tempo durante o qual um link de recuperação permanece válido.', 'INTEGER', '1', '{"min":1,"max":72}', true, false, true, CURRENT_TIMESTAMP),
  ('config_access_api_token_expiration_days', 'access.api_token.expiration_days', 'ACESSO', 'Validades de tokens de API', 'Lista de validades permitidas para credenciais de integrações.', 'JSON', '[30,90,365]', '{"maxItems":10}', true, false, true, CURRENT_TIMESTAMP),
  ('config_operation_api_tables_default_limit', 'operation.api.tables.default_limit', 'OPERAÇÃO', 'Itens padrão da API de tabelas', 'Quantidade padrão retornada pela listagem de tabelas da API externa.', 'INTEGER', '50', '{"min":1,"max":1000}', true, false, true, CURRENT_TIMESTAMP),
  ('config_operation_api_tables_max_limit', 'operation.api.tables.max_limit', 'OPERAÇÃO', 'Limite máximo da API de tabelas', 'Maior quantidade de tabelas que uma chamada pode solicitar.', 'INTEGER', '100', '{"min":1,"max":1000}', true, false, true, CURRENT_TIMESTAMP),
  ('config_operation_export_complete_max_bytes', 'operation.export.complete.max_bytes', 'OPERAÇÃO', 'Payload máximo de exportação completa', 'Tamanho máximo aceito no pacote de exportação completa.', 'INTEGER', '26214400', '{"min":1048576,"max":104857600}', true, false, true, CURRENT_TIMESTAMP),
  ('config_operation_export_excel_max_bytes', 'operation.export.excel.max_bytes', 'OPERAÇÃO', 'Payload máximo de exportação Excel', 'Tamanho máximo aceito para a geração de Excel.', 'INTEGER', '2097152', '{"min":262144,"max":52428800}', true, false, true, CURRENT_TIMESTAMP),
  ('config_operation_export_internal_timeout_ms', 'operation.export.internal_timeout_ms', 'OPERAÇÃO', 'Timeout de exportação interna', 'Tempo máximo para a chamada interna que gera o Excel.', 'INTEGER', '60000', '{"min":5000,"max":300000}', true, false, true, CURRENT_TIMESTAMP),
  ('config_operation_ingredients_search_max_results', 'operation.ingredients.search_max_results', 'OPERAÇÃO', 'Resultados máximos de ingredientes', 'Quantidade máxima de itens exibidos na busca de ingredientes.', 'INTEGER', '30', '{"min":1,"max":200}', true, false, true, CURRENT_TIMESTAMP),
  ('config_operation_external_user_agent', 'operation.external.user_agent', 'OPERAÇÃO', 'Identificação de chamadas externas', 'User-Agent usado nas chamadas a fontes externas.', 'STRING', '"SoIZI Nutrition Platform/1.0"', '{"minLength":2,"maxLength":160}', true, false, true, CURRENT_TIMESTAMP),
  ('config_business_export_default_vd_sugar_added', 'business.export.default_vd_sugar_added', 'NEGÓCIO', 'VD açúcares adicionados', 'Valor diário padrão usado nas exportações nutricionais.', 'DECIMAL', '50', '{"min":0,"max":100}', true, false, true, CURRENT_TIMESTAMP),
  ('config_business_export_default_vd_fat_trans', 'business.export.default_vd_fat_trans', 'NEGÓCIO', 'VD gorduras trans', 'Valor diário padrão usado nas exportações nutricionais.', 'DECIMAL', '2', '{"min":0,"max":100}', true, false, true, CURRENT_TIMESTAMP),
  ('config_business_billing_provider', 'business.billing.provider', 'NEGÓCIO', 'Provedor de pagamentos', 'Contrato informativo do provedor habilitado. Credenciais permanecem em ambiente seguro.', 'STRING', '"asaas"', '{"enum":["asaas"]}', false, false, true, CURRENT_TIMESTAMP),
  ('config_business_billing_environment', 'business.billing.environment', 'NEGÓCIO', 'Ambiente de pagamentos', 'Ambiente efetivo das chamadas Asaas.', 'STRING', '"sandbox"', '{"enum":["sandbox","production"]}', false, false, true, CURRENT_TIMESTAMP),
  ('config_user_password_min_length', 'user.password.min_length', 'USUÁRIOS', 'Tamanho mínimo de senha', 'Tamanho mínimo aplicável a novas senhas.', 'INTEGER', '12', '{"min":8,"max":128}', true, false, true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PlatformPermission" ("id", "key", "name", "description", "riskLevel", "updatedAt") VALUES
  ('platform_permission_configuration_read', 'platform.configuration.read', 'Ler configurações', 'Consultar o registro administrativo de configurações.', 'LOW', CURRENT_TIMESTAMP),
  ('platform_permission_configuration_manage', 'platform.configuration.manage', 'Gerenciar configurações', 'Alterar configurações administrativas não secretas.', 'MEDIUM', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PlatformRolePermission" ("platformRoleId", "platformPermissionId")
SELECT role_row."id", permission_row."id"
FROM "PlatformRole" role_row
CROSS JOIN "PlatformPermission" permission_row
WHERE role_row."key" IN ('PLATFORM_OWNER', 'PLATFORM_ADMIN', 'OPS_ADMIN')
  AND permission_row."key" IN ('platform.configuration.read', 'platform.configuration.manage')
ON CONFLICT ("platformRoleId", "platformPermissionId") DO NOTHING;
