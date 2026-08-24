export type RegulatoryCategory =
  | "general-food"
  | "supplement"
  | "special-purpose"
  | "infant-formula"
  | "enteral-formula"
  | "metabolic-formula"
  | "lactose-restriction"
  | "hyposodium-salt";

const NO_DAILY_VALUE_CATEGORIES = new Set<RegulatoryCategory>([
  "infant-formula",
  "enteral-formula",
  "metabolic-formula",
]);

export function shouldShowDailyValue(category: RegulatoryCategory) {
  return !NO_DAILY_VALUE_CATEGORIES.has(category);
}

export function calculateServingsPerPackage(portionSize: number, packageContent: number) {
  const epsilon = 1e-6;
  if (portionSize <= 0 || packageContent <= 0) return "-";

  const servings = packageContent / portionSize;
  if (!Number.isFinite(servings) || servings <= epsilon) return "-";

  const rounded = Math.round(servings);
  const isInteger = Math.abs(servings - rounded) <= epsilon;
  if (isInteger) return rounded >= 3 ? String(rounded) : "-";
  return servings > 2 + epsilon ? `Cerca de ${rounded}` : "-";
}

export function isRegulatoryCategory(value: unknown): value is RegulatoryCategory {
  return typeof value === "string" && [
    "general-food",
    "supplement",
    "special-purpose",
    "infant-formula",
    "enteral-formula",
    "metabolic-formula",
    "lactose-restriction",
    "hyposodium-salt",
  ].includes(value);
}

export function getComplianceProfileRules(profile: ComplianceProfile) {
  return {
    excludedFromRdc429: profile === "bottled-water",
    fopForbiddenByCategory: profile === "annex-xvi",
    requiresIodizedSaltStatement: profile === "iodized-salt",
    requiresFlourStatement: profile === "flour",
  };
}

export function getAvailableExportSheetTypes(isSupplement: boolean, portionSize: number): ExportSheetType[] {
  const isExactHundredPortion = Math.abs(portionSize - 100) < 0.001;
  return EXPORT_SHEET_TYPES.filter((sheet) => {
    const supplementSheet = sheet === "SUPLEM" || sheet === "SUPLEM-POP";
    if (isSupplement) return supplementSheet;
    if (supplementSheet) return false;
    return sheet !== "100" || isExactHundredPortion;
  });
}

export function getRegulatoryComplianceWarnings(input: {
  enabled: boolean;
  complianceProfile: ComplianceProfile;
  fopReferenceMode: FopReferenceMode;
  category: RegulatoryCategory;
  servingsDeclarationMode: ServingsDeclarationMode;
  manualServings: string;
}) {
  if (!input.enabled) return [];
  const rules = getComplianceProfileRules(input.complianceProfile);
  const warnings: string[] = [];
  if (rules.excludedFromRdc429) warnings.push("Produto marcado como água envasada: tabela/lupa da RDC 429/IN 75 não se aplica.");
  if (rules.fopForbiddenByCategory) warnings.push("Categoria marcada como vedada no Anexo XVI: não exibir lupa frontal.");
  if (input.fopReferenceMode === "prepared") warnings.push("Lupa está sendo calculada por alimento pronto para consumo (Art. 19, parágrafo único, RDC 429/2020).");
  if (!shouldShowDailyValue(input.category)) warnings.push("Categoria selecionada dispensa %VD: a tabela não deve declarar percentual de valores diários.");
  if (input.category === "supplement") {
    warnings.push("Suplemento: a porção deve corresponder à quantidade diária recomendada para o grupo populacional indicado.");
    warnings.push("Validar constituintes, limites mínimos/máximos, alegações e rotulagem complementar na IN 28/2018 e atualizações.");
  }
  if (input.category === "lactose-restriction") warnings.push("Restrição de lactose: declarar lactose e galactose na tabela.");
  if (input.category === "hyposodium-salt") warnings.push("Sal hipossódico: declarar potássio na tabela.");
  if (input.category === "infant-formula") warnings.push("Fórmula infantil: declarar vitaminas/minerais e DHA, ARA, taurina, L-carnitina, nucleotídeos, FOS, GOS e outros nutrientes quando adicionados.");
  if (input.category === "enteral-formula") warnings.push("Nutrição enteral: declarar monoinsaturadas, poli-insaturadas, ômega 6, ômega 3, colesterol, vitaminas, minerais e nutrientes adicionados.");
  if (input.category === "metabolic-formula") warnings.push("Fórmula dietoterápica: declarar substâncias associadas ao erro inato do metabolismo indicado.");
  if (input.servingsDeclarationMode === "manual" && input.manualServings.trim().length === 0) warnings.push("Declaração manual de porções por embalagem está vazia.");
  if (rules.requiresIodizedSaltStatement) warnings.push("Validar frase obrigatória de sal iodado próxima à tabela.");
  if (rules.requiresFlourStatement) warnings.push("Validar frase obrigatória de enriquecimento da farinha próxima à tabela.");
  return warnings;
}
import { EXPORT_SHEET_TYPES, type ExportSheetType } from "./export-sheet-types";

export type { ExportSheetType } from "./export-sheet-types";
export type ComplianceProfile = "general" | "bottled-water" | "iodized-salt" | "flour" | "annex-xvi";
export type FopReferenceMode = "as-sold" | "prepared";
export type ServingsDeclarationMode = "auto" | "manual";
