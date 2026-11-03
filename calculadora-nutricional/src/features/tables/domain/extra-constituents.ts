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
