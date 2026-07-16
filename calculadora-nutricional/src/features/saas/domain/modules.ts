export const SAAS_MODULES = {
  TABLES: "TABLES",
  CUSTOM_INGREDIENTS: "CUSTOM_INGREDIENTS",
  TECHNICAL_SHEETS: "TECHNICAL_SHEETS",
  OPEN_FOOD_FACTS: "OPEN_FOOD_FACTS",
  ENTERPRISE_LABELS: "ENTERPRISE_LABELS",
  EXPORTS: "EXPORTS",
  AI_IMPORT: "AI_IMPORT",
  API_ACCESS: "API_ACCESS",
  SETTINGS: "SETTINGS",
} as const;

export type SaaSModuleKey = (typeof SAAS_MODULES)[keyof typeof SAAS_MODULES];

export type SaaSModuleDefinition = {
  key: SaaSModuleKey;
  name: string;
  description: string;
  category: "core" | "growth" | "enterprise" | "security";
  surface: "navigation" | "embedded";
  href?: string;
};

export const MODULE_CATALOG: SaaSModuleDefinition[] = [
  {
    key: SAAS_MODULES.TABLES,
    name: "Tabelas nutricionais",
    description: "Criação, edição e cálculo de tabelas ANVISA.",
    category: "core",
    surface: "navigation",
    href: "/dashboard/tables",
  },
  {
    key: SAAS_MODULES.CUSTOM_INGREDIENTS,
    name: "Ingredientes próprios",
    description: "Cadastro manual, planilha e biblioteca privada de ingredientes.",
    category: "core",
    surface: "navigation",
    href: "/dashboard/ingredients",
  },
  {
    key: SAAS_MODULES.TECHNICAL_SHEETS,
    name: "Fichas técnicas",
    description: "Upload, extração, revisão e reaproveitamento de fichas técnicas.",
    category: "growth",
    surface: "navigation",
    href: "/dashboard/ingredients/technical-sheets",
  },
  {
    key: SAAS_MODULES.OPEN_FOOD_FACTS,
    name: "Open Food Facts",
    description: "Busca e importação de produtos dentro da criação de tabelas.",
    category: "growth",
    surface: "embedded",
  },
  {
    key: SAAS_MODULES.ENTERPRISE_LABELS,
    name: "Enterprise internacional",
    description: "Projetos, versões, aprovação e rótulos internacionais.",
    category: "enterprise",
    surface: "navigation",
    href: "/dashboard/enterprise",
  },
  {
    key: SAAS_MODULES.EXPORTS,
    name: "Exportações",
    description: "Geração de Excel, imagem, JSON e pacote completo.",
    category: "core",
    surface: "embedded",
  },
  {
    key: SAAS_MODULES.AI_IMPORT,
    name: "IA de importação",
    description: "Uso de IA para interpretar documentos técnicos.",
    category: "growth",
    surface: "embedded",
  },
  {
    key: SAAS_MODULES.SETTINGS,
    name: "Configurações",
    description: "Gestão de usuários, perfis e acessos do workspace.",
    category: "security",
    surface: "navigation",
    href: "/dashboard/settings",
  },
];

export const DEFAULT_WORKSPACE_MODULES: SaaSModuleKey[] = [
  SAAS_MODULES.TABLES,
  SAAS_MODULES.CUSTOM_INGREDIENTS,
  SAAS_MODULES.TECHNICAL_SHEETS,
  SAAS_MODULES.OPEN_FOOD_FACTS,
  SAAS_MODULES.AI_IMPORT,
  SAAS_MODULES.ENTERPRISE_LABELS,
  SAAS_MODULES.EXPORTS,
  SAAS_MODULES.API_ACCESS,
  SAAS_MODULES.SETTINGS,
];

export const ALL_SAAS_MODULES = [
  SAAS_MODULES.TABLES,
  SAAS_MODULES.CUSTOM_INGREDIENTS,
  SAAS_MODULES.TECHNICAL_SHEETS,
  SAAS_MODULES.OPEN_FOOD_FACTS,
  SAAS_MODULES.ENTERPRISE_LABELS,
  SAAS_MODULES.EXPORTS,
  SAAS_MODULES.AI_IMPORT,
  SAAS_MODULES.API_ACCESS,
  SAAS_MODULES.SETTINGS,
] as const satisfies readonly SaaSModuleKey[];

export function isSaaSModuleKey(value: string): value is SaaSModuleKey {
  return Object.values(SAAS_MODULES).includes(value as SaaSModuleKey);
}

export function getModuleDefinition(moduleKey: SaaSModuleKey) {
  return MODULE_CATALOG.find((module) => module.key === moduleKey);
}
