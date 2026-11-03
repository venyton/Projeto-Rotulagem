import type { CalculatedNutrients } from "./nutrients";
import { normalizeMicrogramSymbol } from "./units";

export const EXTRA_CONSTITUENTS = [
  "Lactose", "Galactose", "Creatina", "Polióis totais", "Maltitol", "Lactitol",
  "Xilitol", "Sorbitol", "Manitol", "Isomalte", "Eritritol", "Tagatose",
  "Polidextrose", "Cafeína", "Probióticos",
] as const;

export function constituentKey(name: string) {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  if (normalized === "poliois" || normalized === "poliois totais") return "poliois totais";
  if (normalized === "isomalt" || normalized === "isomalte") return "isomalte";
  return normalized;
}

export function constituentLabel(name: string) {
  return EXTRA_CONSTITUENTS.find((item) => constituentKey(item) === constituentKey(name)) || name.trim();
}

export type HistoricalConstituent = { name: string; amount: string | number; unit: string };

/** Values saved by older editors were amounts per portion, not ingredient data. */
export function reconcileHistoricalConstituents(
  values: HistoricalConstituent[],
  ingredientNutrients: readonly unknown[],
  preparationEnabled: boolean,
) {
  const accepted: HistoricalConstituent[] = [];
  const issues: string[] = [];
  const seen = new Set<string>();
  const ingredientKeys = new Set(ingredientNutrients.flatMap((nutrients) =>
    nutrients && typeof nutrients === "object" && !Array.isArray(nutrients)
      ? Object.keys(nutrients).map(constituentKey) : []));
  const polyols = new Set(["poliois totais", "maltitol", "lactitol", "xilitol", "sorbitol", "manitol", "isomalte", "eritritol"]);
  const massUnits = new Set(["g", "mg", "µg", "mcg", "ug", "μg"]);
  const energyKeys = new Set([...polyols, "tagatose", "polidextrose"]);
  for (const value of values) {
    const raw = String(value.amount ?? "").trim();
    if (!raw) continue;
    const key = constituentKey(typeof value.name === "string" ? value.name : "");
    const numeric = /^\d+(?:[.,]\d+)?$/.test(raw) ? Number(raw.replace(",", ".")) : NaN;
    const unit = typeof value.unit === "string" ? value.unit.trim() || "g" : "g";
    const energyComponent = [...energyKeys].some((item) => key.includes(item));
    const polyol = [...polyols].some((item) => key.includes(item));
    if (!key || !Number.isFinite(numeric) || numeric < 0 || (energyComponent && !massUnits.has(unit.toLowerCase()))) {
      issues.push(`${value.name || "Constituinte"}: valor antigo ou unidade inválida; revise antes de exportar.`);
    } else if (preparationEnabled) {
      issues.push(`${value.name}: revise o valor antigo para a tabela com preparo antes de exportar.`);
    } else if (seen.has(key) || ingredientKeys.has(key) || (polyol && [...ingredientKeys].some((item) => [...polyols].some((part) => item.includes(part))))) {
      issues.push(`${value.name}: há mais de uma fonte para este constituinte; revise antes de exportar.`);
    } else {
      accepted.push({ name: value.name, amount: numeric, unit });
    }
    if (key) seen.add(key);
  }
  const toGrams = (value: HistoricalConstituent) => {
    const unit = value.unit.toLowerCase();
    return Number(value.amount) / (unit === "mg" ? 1_000 : ["µg", "μg", "mcg", "ug"].includes(unit) ? 1_000_000 : 1);
  };
  const totalPolyols = accepted.filter((value) => constituentKey(value.name) === "poliois totais").reduce((sum, value) => sum + toGrams(value), 0);
  const specificPolyols = accepted.filter((value) => {
    const key = constituentKey(value.name);
    return key !== "poliois totais" && [...polyols].some((item) => key.includes(item));
  }).reduce((sum, value) => sum + toGrams(value), 0);
  if (totalPolyols > 0 && Math.abs(totalPolyols - specificPolyols) > 1e-9) {
    issues.push("Polióis antigos: revise os tipos e quantidades para que correspondam ao total antes de exportar.");
  }
  return { accepted, issues };
}

export function includeHistoricalConstituents<T extends { per100g: CalculatedNutrients; perPortion: CalculatedNutrients }>(
  calculation: T,
  values: HistoricalConstituent[],
  portionSize: number,
): T {
  if (!values.length || portionSize <= 0) return calculation;
  const per100g = { ...calculation.per100g, customNutrients: { ...calculation.per100g.customNutrients } };
  const perPortion = { ...calculation.perPortion, customNutrients: { ...calculation.perPortion.customNutrients } };
  for (const value of values) {
    const amount = Number(value.amount);
    perPortion.customNutrients[value.name] = { value: amount, unit: value.unit };
    per100g.customNutrients[value.name] = { value: amount * 100 / portionSize, unit: value.unit };
  }
  return { ...calculation, per100g, perPortion };
}

export function selectedConstituentRows(
  selection: Array<{ name?: string }>,
  per100: Pick<CalculatedNutrients, "customNutrients">,
  portion: Pick<CalculatedNutrients, "customNutrients">,
) {
  const seen = new Set<string>();
  return selection.flatMap(({ name }) => {
    const key = constituentKey(name || "");
    if (!key || seen.has(key)) return [];
    seen.add(key);
    const portionEntries = Object.entries(portion.customNutrients || {}).filter(([label]) => constituentKey(label) === key);
    const per100Entries = Object.entries(per100.customNutrients || {}).filter(([label]) => constituentKey(label) === key);
    const unit = normalizeMicrogramSymbol(portionEntries[0]?.[1].unit || per100Entries[0]?.[1].unit || "");
    const total = (entries: typeof portionEntries) => {
      if (!entries.length) return undefined;
      const units: Record<string, number> = { g: 1_000_000, mg: 1_000, "µg": 1 };
      const unitKey = (value: string) => {
        const normalized = normalizeMicrogramSymbol(value);
        return normalized === "µg" ? normalized : normalized.toLowerCase();
      };
      const targetKey = unitKey(unit);
      const target = units[targetKey];
      if (entries.some(([, data]) => unitKey(data.unit) !== targetKey && (!target || !units[unitKey(data.unit)]))) return undefined;
      return entries.reduce((sum, [, data]) => {
        const source = unitKey(data.unit);
        return sum + (source === targetKey ? data.value : data.value * units[source] / target);
      }, 0);
    };
    return [{ name: constituentLabel(name || ""), unit, per100: total(per100Entries), portion: total(portionEntries) }];
  });
}
