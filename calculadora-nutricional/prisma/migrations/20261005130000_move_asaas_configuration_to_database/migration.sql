-- Credenciais e parâmetros Asaas são administrados pelo registro global.
-- Valores marcados como sensíveis são cifrados pela aplicação antes de persistir.

UPDATE "ConfigurationDefinition"
SET "editable" = true,
    "description" = 'Ambiente Asaas ativo. O host é derivado deste valor e não aceita URL livre.',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'business.billing.environment';

INSERT INTO "ConfigurationDefinition"
  ("id", "key", "category", "label", "description", "valueType", "defaultValue", "validation", "editable", "sensitive", "active", "updatedAt")
VALUES
  ('config_business_billing_asaas_production_enabled', 'business.billing.asaas.production_enabled', 'ASAAS', 'Permitir chamadas em Produção', 'Gate adicional. A aplicação também precisa estar em runtime NODE_ENV=production.', 'BOOLEAN', 'false', NULL, true, false, true, CURRENT_TIMESTAMP),
  ('config_business_billing_asaas_sandbox_api_key', 'business.billing.asaas.sandbox_api_key', 'ASAAS', 'Chave de API Sandbox', 'Chave confidencial iniciada por $aact_hmlg_. É cifrada no banco e nunca exibida novamente.', 'STRING', '""', '{"minLength":20,"maxLength":512,"pattern":"^\\$aact_hmlg_.+$"}', true, true, true, CURRENT_TIMESTAMP),
  ('config_business_billing_asaas_production_api_key', 'business.billing.asaas.production_api_key', 'ASAAS', 'Chave de API Produção', 'Chave confidencial iniciada por $aact_prod_. A Produção permanece bloqueada sem o gate explícito.', 'STRING', '""', '{"minLength":20,"maxLength":512,"pattern":"^\\$aact_prod_.+$"}', true, true, true, CURRENT_TIMESTAMP),
  ('config_business_billing_asaas_webhook_name', 'business.billing.asaas.webhook.name', 'ASAAS', 'Nome do webhook', 'Nome identificável da integração na conta Asaas.', 'STRING', '"SoIZI Billing Webhook"', '{"minLength":3,"maxLength":100}', true, false, true, CURRENT_TIMESTAMP),
  ('config_business_billing_asaas_webhook_url', 'business.billing.asaas.webhook.url', 'ASAAS', 'URL de recebimento', 'URL pública HTTPS da aplicação, terminando em /api/webhooks/asaas.', 'URL', '""', '{"maxLength":2048}', true, false, true, CURRENT_TIMESTAMP),
  ('config_business_billing_asaas_webhook_email', 'business.billing.asaas.webhook.email', 'ASAAS', 'E-mail para alertas', 'Endereço para notificações operacionais de falha do webhook.', 'STRING', '""', '{"maxLength":254}', true, false, true, CURRENT_TIMESTAMP),
  ('config_business_billing_asaas_webhook_enabled', 'business.billing.asaas.webhook.enabled', 'ASAAS', 'Webhook ativo', 'Ativa ou desativa o envio de eventos pelo Asaas.', 'BOOLEAN', 'true', NULL, true, false, true, CURRENT_TIMESTAMP),
  ('config_business_billing_asaas_webhook_interrupted', 'business.billing.asaas.webhook.interrupted', 'ASAAS', 'Fila interrompida', 'Quando ativo, o Asaas interrompe a fila e deixa de entregar eventos até a reativação.', 'BOOLEAN', 'false', NULL, true, false, true, CURRENT_TIMESTAMP),
  ('config_business_billing_asaas_webhook_api_version', 'business.billing.asaas.webhook.api_version', 'ASAAS', 'Versão da API do webhook', 'Versão oficial usada na criação. Mantida em 3 para o contrato atual.', 'INTEGER', '3', '{"min":3,"max":3}', false, false, true, CURRENT_TIMESTAMP),
  ('config_business_billing_asaas_webhook_send_type', 'business.billing.asaas.webhook.send_type', 'ASAAS', 'Ordem de entrega', 'Envio sequencial preserva a ordem dos eventos recebidos.', 'STRING', '"SEQUENTIALLY"', '{"enum":["SEQUENTIALLY","NON_SEQUENTIALLY"]}', true, false, true, CURRENT_TIMESTAMP),
  ('config_business_billing_asaas_webhook_events', 'business.billing.asaas.webhook.events', 'ASAAS', 'Eventos monitorados', 'Eventos Asaas reconhecidos pelo processador de billing da aplicação.', 'JSON', '["CHECKOUT_CREATED","CHECKOUT_CANCELED","CHECKOUT_EXPIRED","CHECKOUT_PAID","SUBSCRIPTION_CREATED","SUBSCRIPTION_UPDATED","SUBSCRIPTION_INACTIVATED","SUBSCRIPTION_DELETED","PAYMENT_CREATED","PAYMENT_UPDATED","PAYMENT_CONFIRMED","PAYMENT_RECEIVED","PAYMENT_OVERDUE","PAYMENT_CREDIT_CARD_CAPTURE_REFUSED","PAYMENT_REFUNDED","PAYMENT_CHARGEBACK_REQUESTED"]', '{"maxItems":16,"itemsEnum":["CHECKOUT_CREATED","CHECKOUT_CANCELED","CHECKOUT_EXPIRED","CHECKOUT_PAID","SUBSCRIPTION_CREATED","SUBSCRIPTION_UPDATED","SUBSCRIPTION_INACTIVATED","SUBSCRIPTION_DELETED","PAYMENT_CREATED","PAYMENT_UPDATED","PAYMENT_CONFIRMED","PAYMENT_RECEIVED","PAYMENT_OVERDUE","PAYMENT_CREDIT_CARD_CAPTURE_REFUSED","PAYMENT_REFUNDED","PAYMENT_CHARGEBACK_REQUESTED"]}', true, false, true, CURRENT_TIMESTAMP),
  ('config_business_billing_asaas_webhook_sandbox_id', 'business.billing.asaas.webhook.sandbox_id', 'ASAAS', 'ID do webhook Sandbox', 'Preenchido pelo servidor após sincronizar a configuração Sandbox.', 'STRING', '""', NULL, false, false, true, CURRENT_TIMESTAMP),
  ('config_business_billing_asaas_webhook_production_id', 'business.billing.asaas.webhook.production_id', 'ASAAS', 'ID do webhook Produção', 'Preenchido pelo servidor após sincronizar a configuração de Produção.', 'STRING', '""', NULL, false, false, true, CURRENT_TIMESTAMP),
  ('config_business_billing_asaas_webhook_sandbox_auth_token', 'business.billing.asaas.webhook.sandbox_auth_token', 'ASAAS', 'Token do webhook Sandbox', 'Token confidencial de 32 a 255 caracteres, sem espaços e diferente da chave de API.', 'STRING', '""', '{"minLength":32,"maxLength":255,"pattern":"^\\S+$"}', true, true, true, CURRENT_TIMESTAMP),
  ('config_business_billing_asaas_webhook_production_auth_token', 'business.billing.asaas.webhook.production_auth_token', 'ASAAS', 'Token do webhook Produção', 'Token confidencial de 32 a 255 caracteres, sem espaços e diferente da chave de API.', 'STRING', '""', '{"minLength":32,"maxLength":255,"pattern":"^\\S+$"}', true, true, true, CURRENT_TIMESTAMP),
  ('config_business_billing_asaas_integration_enabled', 'business.billing.asaas.integration_enabled', 'ASAAS', 'Ativar integração Asaas', 'Permite chamadas da aplicação à API Asaas após a configuração das credenciais.', 'BOOLEAN', 'false', NULL, true, false, true, CURRENT_TIMESTAMP),
  ('config_business_billing_asaas_checkout_enabled', 'business.billing.asaas.checkout_enabled', 'ASAAS', 'Ativar checkout', 'Permite iniciar e cancelar checkouts hospedados após a integração Asaas ser ativada.', 'BOOLEAN', 'false', NULL, true, false, true, CURRENT_TIMESTAMP),
  ('config_business_billing_asaas_webhook_processing_enabled', 'business.billing.asaas.webhook_processing_enabled', 'ASAAS', 'Processar eventos automaticamente', 'Ativa o processamento assíncrono dos eventos persistidos na inbox.', 'BOOLEAN', 'false', NULL, true, false, true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PlatformPermission" ("id", "key", "name", "description", "riskLevel", "updatedAt") VALUES
  ('platform_permission_billing_configuration_manage', 'platform.billing.configuration.manage', 'Configurar integração financeira', 'Gerenciar credenciais Asaas, webhooks e ativação do billing.', 'HIGH', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PlatformRolePermission" ("platformRoleId", "platformPermissionId")
SELECT role_row."id", permission_row."id"
FROM "PlatformRole" role_row
CROSS JOIN "PlatformPermission" permission_row
WHERE role_row."key" IN ('PLATFORM_OWNER', 'BILLING_ADMIN')
  AND permission_row."key" = 'platform.billing.configuration.manage'
ON CONFLICT ("platformRoleId", "platformPermissionId") DO NOTHING;
