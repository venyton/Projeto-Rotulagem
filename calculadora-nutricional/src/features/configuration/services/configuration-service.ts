import "server-only";

import {
  ConfigurationScope,
  ConfigurationValueType,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isDatabaseId } from "@/lib/validation/identifiers";
import { INGREDIENT_QUANTITY_PRECISION_KEY, isValidIngredientPrecision } from "@/features/configuration/domain/ingredient-precision";
import { decryptSecret, encryptSecret } from "@/lib/security/secret-encryption";
import {
  isDashboardNavigationKey,
  type DashboardNavigationOverride,
} from "@/features/configuration/domain/dashboard-navigation";
import {
  isAdminNavigationKey,
  type AdminNavigationOverride,
} from "@/features/configuration/domain/admin-navigation";

type ValidationRule = {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
  itemsEnum?: string[];
  maxItems?: number;
};

type ScopeInput = {
  scope: ConfigurationScope;
  organizationId?: string;
  userId?: string;
};

type ResolvedConfiguration = {
  key: string;
  value: Prisma.JsonValue;
  source: "DEFAULT" | ConfigurationScope;
  sensitive: boolean;
  valueType: ConfigurationValueType;
};

function asValidationRule(value: Prisma.JsonValue | null): ValidationRule {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, Prisma.JsonValue>;
  return {
    min: typeof record.min === "number" ? record.min : undefined,
    max: typeof record.max === "number" ? record.max : undefined,
    minLength: typeof record.minLength === "number" ? record.minLength : undefined,
    maxLength: typeof record.maxLength === "number" ? record.maxLength : undefined,
    pattern: typeof record.pattern === "string" ? record.pattern : undefined,
    enum: Array.isArray(record.enum) && record.enum.every((item) => typeof item === "string")
      ? record.enum as string[]
      : undefined,
    itemsEnum: Array.isArray(record.itemsEnum) && record.itemsEnum.every((item) => typeof item === "string")
      ? record.itemsEnum as string[]
      : undefined,
    maxItems: typeof record.maxItems === "number" ? record.maxItems : undefined,
  };
}

function isJsonValue(value: unknown): value is Prisma.JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }
  return false;
}

function scopeKeyFor(input: ScopeInput) {
  if (input.scope === ConfigurationScope.GLOBAL) return "GLOBAL";
  if (input.scope === ConfigurationScope.ORGANIZATION && isDatabaseId(input.organizationId)) {
    return `ORGANIZATION:${input.organizationId}`;
  }
  if (input.scope === ConfigurationScope.USER && isDatabaseId(input.userId)) {
    return `USER:${input.userId}`;
  }
  return null;
}

function requiresGlobalConfigurationScope(key: string) {
  return key === "business.billing.environment" || key.startsWith("business.billing.asaas.");
}

function validateConfigurationValue(
  definition: {
    valueType: ConfigurationValueType;
    validation: Prisma.JsonValue | null;
  },
  value: unknown,
) {
  const rules = asValidationRule(definition.validation);
  let valid = false;

  switch (definition.valueType) {
    case ConfigurationValueType.STRING:
      valid = typeof value === "string";
      break;
    case ConfigurationValueType.URL:
      valid = typeof value === "string" && (() => {
        try {
          const url = new URL(value);
          return url.protocol === "https:" || url.protocol === "http:";
        } catch {
          return false;
        }
      })();
      break;
    case ConfigurationValueType.INTEGER:
      valid = typeof value === "number" && Number.isSafeInteger(value);
      break;
    case ConfigurationValueType.DECIMAL:
      valid = typeof value === "number" && Number.isFinite(value);
      break;
    case ConfigurationValueType.BOOLEAN:
      valid = typeof value === "boolean";
      break;
    case ConfigurationValueType.JSON:
      valid = isJsonValue(value);
      break;
  }

  if (!valid) return "O valor não corresponde ao tipo configurado.";
  if (typeof value === "number" && rules.min !== undefined && value < rules.min) return `O valor mínimo é ${rules.min}.`;
  if (typeof value === "number" && rules.max !== undefined && value > rules.max) return `O valor máximo é ${rules.max}.`;
  if (typeof value === "string" && rules.minLength !== undefined && value.length < rules.minLength) return `Informe ao menos ${rules.minLength} caracteres.`;
  if (typeof value === "string" && rules.maxLength !== undefined && value.length > rules.maxLength) return `Informe no máximo ${rules.maxLength} caracteres.`;
  if (typeof value === "string" && rules.pattern && !new RegExp(rules.pattern).test(value)) return "O valor não corresponde ao formato esperado.";
  if (typeof value === "string" && rules.enum && !rules.enum.includes(value)) return "Selecione uma opção válida.";
  if (Array.isArray(value) && rules.maxItems !== undefined && value.length > rules.maxItems) return `Informe no máximo ${rules.maxItems} itens.`;
  if (Array.isArray(value) && rules.itemsEnum && !value.every((item) => typeof item === "string" && rules.itemsEnum?.includes(item))) return "A lista contém uma opção não permitida.";
  return null;
}

async function findDefinition(key: string) {
  return prisma.configurationDefinition.findUnique({
    where: { key },
    select: {
      id: true,
      key: true,
      category: true,
      label: true,
      description: true,
      valueType: true,
      defaultValue: true,
      validation: true,
      editable: true,
      sensitive: true,
      active: true,
    },
  });
}

function resolvedValue(
  definition: NonNullable<Awaited<ReturnType<typeof findDefinition>>>,
  values: Array<{ scope: ConfigurationScope; value: Prisma.JsonValue }>,
): ResolvedConfiguration {
  const selected = values.find((item) => item.scope === ConfigurationScope.USER)
    ?? values.find((item) => item.scope === ConfigurationScope.ORGANIZATION)
    ?? values.find((item) => item.scope === ConfigurationScope.GLOBAL);
  const rawValue = selected?.value ?? definition.defaultValue;
  const value = definition.sensitive && typeof rawValue === "string" && rawValue
    ? decryptSecret(rawValue)
    : rawValue;
  return {
    key: definition.key,
    value,
    source: selected?.scope ?? "DEFAULT",
    sensitive: definition.sensitive,
    valueType: definition.valueType,
  };
}

export async function getResolvedConfigurations(input: {
  organizationId?: string;
  userId?: string;
  keys?: string[];
}) {
  const definitions = await prisma.configurationDefinition.findMany({
    where: {
      active: true,
      ...(input.keys?.length ? { key: { in: input.keys } } : {}),
    },
    select: {
      id: true,
      key: true,
      category: true,
      label: true,
      description: true,
      valueType: true,
      defaultValue: true,
      validation: true,
      editable: true,
      sensitive: true,
      active: true,
      values: {
        where: {
          OR: [
            { scope: ConfigurationScope.GLOBAL },
            ...(input.organizationId ? [{ scope: ConfigurationScope.ORGANIZATION, organizationId: input.organizationId }] : []),
            ...(input.userId ? [{ scope: ConfigurationScope.USER, userId: input.userId }] : []),
          ],
        },
        select: { scope: true, value: true },
      },
    },
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });

  return new Map(definitions.map((definition) => [
    definition.key,
    resolvedValue(definition, definition.values),
  ]));
}

export async function getDashboardNavigationConfiguration(): Promise<DashboardNavigationOverride[] | null> {
  const configurations = await getResolvedConfigurations({ keys: ["ui.dashboard.navigation"] });
  const value = configurations.get("ui.dashboard.navigation")?.value;
  if (!Array.isArray(value)) return null;

  const overrides = value.flatMap((item): DashboardNavigationOverride[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, Prisma.JsonValue>;
    if (typeof record.key !== "string" || !isDashboardNavigationKey(record.key)) return [];
    return [{
      key: record.key,
      enabled: record.enabled !== false,
      ...(typeof record.label === "string" ? { label: record.label } : {}),
      ...(typeof record.order === "number" ? { order: record.order } : {}),
    }];
  });

  return overrides.length ? overrides : null;
}

export async function getAdminNavigationConfiguration(): Promise<AdminNavigationOverride[] | null> {
  const configurations = await getResolvedConfigurations({ keys: ["ui.admin.navigation"] });
  const value = configurations.get("ui.admin.navigation")?.value;
  if (!Array.isArray(value)) return null;

  const overrides = value.flatMap((item): AdminNavigationOverride[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, Prisma.JsonValue>;
    if (typeof record.key !== "string" || !isAdminNavigationKey(record.key)) return [];
    return [{
      key: record.key,
      enabled: record.enabled !== false,
      ...(typeof record.label === "string" ? { label: record.label } : {}),
      ...(typeof record.order === "number" ? { order: record.order } : {}),
    }];
  });

  return overrides.length ? overrides : null;
}

export async function getConfigurationNumber(
  key: string,
  fallback: number,
  scope?: { organizationId?: string; userId?: string },
) {
  try {
    const configuration = (await getResolvedConfigurations({ keys: [key], ...scope })).get(key);
    return configuration?.valueType === ConfigurationValueType.INTEGER || configuration?.valueType === ConfigurationValueType.DECIMAL
      ? typeof configuration.value === "number" && Number.isFinite(configuration.value) ? configuration.value : fallback
      : fallback;
  } catch {
    return fallback;
  }
}

export async function getConfigurationString(
  key: string,
  fallback: string,
  scope?: { organizationId?: string; userId?: string },
) {
  try {
    const configuration = (await getResolvedConfigurations({ keys: [key], ...scope })).get(key);
    return configuration?.valueType === ConfigurationValueType.STRING || configuration?.valueType === ConfigurationValueType.URL
      ? typeof configuration.value === "string" && configuration.value.trim() ? configuration.value : fallback
      : fallback;
  } catch {
    return fallback;
  }
}

export async function getConfigurationJson<T extends Prisma.JsonValue>(
  key: string,
  fallback: T,
  scope?: { organizationId?: string; userId?: string },
) {
  try {
    const configuration = (await getResolvedConfigurations({ keys: [key], ...scope })).get(key);
    return configuration?.valueType === ConfigurationValueType.JSON ? configuration.value as T : fallback;
  } catch {
    return fallback;
  }
}

export async function getConfigurationDefinitionsForAdmin() {
  const definitions = await prisma.configurationDefinition.findMany({
    where: { active: true },
    select: {
      id: true,
      key: true,
      category: true,
      label: true,
      description: true,
      valueType: true,
      defaultValue: true,
      validation: true,
      editable: true,
      sensitive: true,
      values: {
        select: {
          scope: true,
          scopeKey: true,
          organizationId: true,
          userId: true,
          value: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      },
    },
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });

  return definitions.map((definition) => ({
    ...definition,
    values: definition.values.map((value) => ({
      ...value,
      value: definition.sensitive ? null : value.value,
    })),
  }));
}

export async function setConfigurationValue(input: {
  key: string;
  value: unknown;
  scope: ScopeInput;
  updatedById: string;
  privilegedSessionId?: string | null;
}) {
  const definition = await findDefinition(input.key);
  if (!definition || !definition.active) return { ok: false as const, code: "NOT_FOUND", message: "Configuração não encontrada." };
  if (!definition.editable) return { ok: false as const, code: "READ_ONLY", message: "Esta configuração é somente leitura." };
  const scopeKey = scopeKeyFor(input.scope);
  if (!scopeKey) return { ok: false as const, code: "INVALID_SCOPE", message: "Escopo de configuração inválido." };
  if (input.key === INGREDIENT_QUANTITY_PRECISION_KEY && input.scope.scope === ConfigurationScope.USER) return { ok: false as const, code: "INVALID_SCOPE", message: "Esta configuração aceita apenas escopo global ou de organização." };
  if (input.key === INGREDIENT_QUANTITY_PRECISION_KEY && !isValidIngredientPrecision(input.value)) return { ok: false as const, code: "INVALID_VALUE", message: "Informe entre 0 e 15 casas decimais." };
  if (requiresGlobalConfigurationScope(input.key) && input.scope.scope !== ConfigurationScope.GLOBAL) {
    return { ok: false as const, code: "INVALID_SCOPE", message: "A configuração global de billing só pode ser alterada no escopo global." };
  }
  const validationError = validateConfigurationValue(definition, input.value);
  if (validationError) return { ok: false as const, code: "INVALID_VALUE", message: validationError };

  const asaasIntegrationKey = "business.billing.asaas.integration_enabled";
  const asaasCheckoutKey = "business.billing.asaas.checkout_enabled";
  if (input.key === asaasCheckoutKey && input.value === true) {
    const integration = (await getResolvedConfigurations({ keys: [asaasIntegrationKey] })).get(asaasIntegrationKey)?.value;
    if (integration !== true) {
      return { ok: false as const, code: "INVALID_VALUE", message: "Ative a integração Asaas antes de habilitar o checkout." };
    }
  }
  if (input.key === asaasIntegrationKey && input.value === false) {
    const checkout = (await getResolvedConfigurations({ keys: [asaasCheckoutKey] })).get(asaasCheckoutKey)?.value;
    if (checkout === true) {
      return { ok: false as const, code: "INVALID_VALUE", message: "Desative o checkout antes de pausar a integração Asaas." };
    }
  }

  if (input.scope.scope === ConfigurationScope.ORGANIZATION) {
    const organization = await prisma.organization.findUnique({ where: { id: input.scope.organizationId }, select: { id: true } });
    if (!organization) return { ok: false as const, code: "NOT_FOUND", message: "Organização não encontrada." };
  }
  if (input.scope.scope === ConfigurationScope.USER) {
    const user = await prisma.user.findUnique({ where: { id: input.scope.userId }, select: { id: true } });
    if (!user) return { ok: false as const, code: "NOT_FOUND", message: "Usuário não encontrado." };
  }

  const persistedValue = definition.sensitive
    ? encryptSecret(String(input.value))
    : input.value;
  const persisted = await prisma.$transaction(async (tx) => {
  const existing = await tx.configurationValue.findUnique({
    where: { definitionId_scopeKey: { definitionId: definition.id, scopeKey } },
    select: { id: true, value: true },
  });
  const result = await tx.configurationValue.upsert({
    where: { definitionId_scopeKey: { definitionId: definition.id, scopeKey } },
    create: {
      definitionId: definition.id,
      scope: input.scope.scope,
      scopeKey,
      organizationId: input.scope.organizationId ?? null,
      userId: input.scope.userId ?? null,
      value: persistedValue as Prisma.InputJsonValue,
      updatedById: input.updatedById,
    },
    update: {
      value: persistedValue as Prisma.InputJsonValue,
      updatedById: input.updatedById,
      organizationId: input.scope.organizationId ?? null,
      userId: input.scope.userId ?? null,
    },
    select: { id: true, scope: true, scopeKey: true },
  });

  await tx.securityAuditLog.create({
    data: {
      userId: input.updatedById,
      privilegedSessionId: input.privilegedSessionId ?? null,
      action: existing ? "configuration.updated" : "configuration.created",
      riskLevel: requiresGlobalConfigurationScope(input.key) ? "HIGH" : "INFO",
      metadata: {
        key: definition.key,
        category: definition.category,
        scope: result.scope,
        scopeKey: result.scopeKey,
        ...(input.key === INGREDIENT_QUANTITY_PRECISION_KEY ? { previousValue: existing?.value ?? null, newValue: input.value } : {}),
      } as Prisma.InputJsonValue,
    },
  });
  return result;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  return { ok: true as const, data: persisted };
}

export async function resetConfigurationValue(input: {
  key: string;
  scope: ScopeInput;
  updatedById: string;
  privilegedSessionId?: string | null;
}) {
  const definition = await findDefinition(input.key);
  if (!definition || !definition.active) return { ok: false as const, code: "NOT_FOUND", message: "Configuração não encontrada." };
  if (!definition.editable) return { ok: false as const, code: "READ_ONLY", message: "Esta configuração é somente leitura." };
  const scopeKey = scopeKeyFor(input.scope);
  if (!scopeKey) return { ok: false as const, code: "INVALID_SCOPE", message: "Escopo de configuração inválido." };
  if (input.key === INGREDIENT_QUANTITY_PRECISION_KEY && input.scope.scope === ConfigurationScope.USER) return { ok: false as const, code: "INVALID_SCOPE", message: "Esta configuração aceita apenas escopo global ou de organização." };
  if (requiresGlobalConfigurationScope(input.key) && input.scope.scope !== ConfigurationScope.GLOBAL) {
    return { ok: false as const, code: "INVALID_SCOPE", message: "A configuração global de billing só pode ser alterada no escopo global." };
  }

  const deleted = await prisma.$transaction(async (tx) => {
  const existing = await tx.configurationValue.findUnique({ where: { definitionId_scopeKey: { definitionId: definition.id, scopeKey } }, select: { value: true } });
  const result = await tx.configurationValue.deleteMany({
    where: { definitionId: definition.id, scopeKey },
  });
  if (result.count > 0) {
    await tx.securityAuditLog.create({
      data: {
        userId: input.updatedById,
        privilegedSessionId: input.privilegedSessionId ?? null,
        action: "configuration.reset",
        riskLevel: requiresGlobalConfigurationScope(input.key) ? "HIGH" : "INFO",
        metadata: { key: definition.key, category: definition.category, scope: input.scope.scope, scopeKey, ...(input.key === INGREDIENT_QUANTITY_PRECISION_KEY ? { previousValue: existing?.value ?? null } : {}) } as Prisma.InputJsonValue,
      },
    });
  }
  return result;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return { ok: true as const, data: { deleted: deleted.count > 0 } };
}

export function configurationValueForClient(value: Prisma.JsonValue) {
  return value;
}
