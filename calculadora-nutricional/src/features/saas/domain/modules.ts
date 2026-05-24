export const SAAS_MODULES = {
  TABLES: "TABLES",
  CUSTOM_INGREDIENTS: "CUSTOM_INGREDIENTS",
  TECHNICAL_SHEETS: "TECHNICAL_SHEETS",
  OPEN_FOOD_FACTS: "OPEN_FOOD_FACTS",
  ENTERPRISE_LABELS: "ENTERPRISE_LABELS",
  EXPORTS: "EXPORTS",
  AI_IMPORT: "AI_IMPORT",
  MARKETING_ANALYTICS: "MARKETING_ANALYTICS",
  API_ACCESS: "API_ACCESS",
  BILLING: "BILLING",
} as const;

export type SaaSModuleKey = (typeof SAAS_MODULES)[keyof typeof SAAS_MODULES];

export type SaaSModuleDefinition = {
  key: SaaSModuleKey;
  name: string;
  description: string;
  category: "core" | "growth" | "enterprise" | "security";
};

export const MODULE_CATALOG: SaaSModuleDefinition[] = [
  {
    key: SAAS_MODULES.TABLES,
    name: "Tabelas nutricionais",
    description: "Criação, edição e cálculo de tabelas ANVISA.",
    category: "core",
  },
  {
    key: SAAS_MODULES.CUSTOM_INGREDIENTS,
    name: "Ingredientes próprios",
    description: "Cadastro manual, planilha e biblioteca privada de ingredientes.",
    category: "core",
  },
  {
    key: SAAS_MODULES.TECHNICAL_SHEETS,
    name: "Fichas técnicas",
    description: "Upload, extração, revisão e reaproveitamento de fichas técnicas.",
    category: "growth",
  },
  {
    key: SAAS_MODULES.OPEN_FOOD_FACTS,
    name: "Open Food Facts",
    description: "Busca e importação assistida por base externa.",
    category: "growth",
  },
  {
    key: SAAS_MODULES.ENTERPRISE_LABELS,
    name: "Enterprise internacional",
    description: "Projetos, versões, aprovação e rótulos internacionais.",
    category: "enterprise",
  },
  {
    key: SAAS_MODULES.EXPORTS,
    name: "Exportações",
    description: "Geração de Excel, imagem, JSON e pacote completo.",
    category: "core",
  },
  {
    key: SAAS_MODULES.AI_IMPORT,
    name: "IA de importação",
    description: "Uso de IA para interpretar documentos técnicos.",
    category: "growth",
  },
  {
    key: SAAS_MODULES.MARKETING_ANALYTICS,
    name: "KPIs e marketing",
    description: "Funil, palavras-chave, origem de tráfego e conversão.",
    category: "growth",
  },
  {
    key: SAAS_MODULES.API_ACCESS,
    name: "API externa",
    description: "Base para tokens, automações e integrações B2B.",
    category: "enterprise",
  },
];

export const DEFAULT_WORKSPACE_MODULES: SaaSModuleKey[] = [
  SAAS_MODULES.TABLES,
  SAAS_MODULES.CUSTOM_INGREDIENTS,
  SAAS_MODULES.TECHNICAL_SHEETS,
  SAAS_MODULES.AI_IMPORT,
  SAAS_MODULES.ENTERPRISE_LABELS,
  SAAS_MODULES.EXPORTS,
];

export function isSaaSModuleKey(value: string): value is SaaSModuleKey {
  return Object.values(SAAS_MODULES).includes(value as SaaSModuleKey);
}

export function getModuleDefinition(moduleKey: SaaSModuleKey) {
  return MODULE_CATALOG.find((module) => module.key === moduleKey);
}
