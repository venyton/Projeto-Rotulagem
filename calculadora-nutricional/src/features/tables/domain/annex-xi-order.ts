import { constituentKey } from "./extra-constituents";

// IN 75/2020, Anexo XI: categorias sem ordem interna preservam a seleção.
const ORDER = [
  "energy", "carbs", "sugarTotal", "sugarAdded", "@lactose", "@galactose", "@tagatose",
  "@poliois totais", "@poliois", "@outros carboidratos", "protein", "fatTotal", "fatSat", "fatTrans",
  "fatMono", "fatPoly", "omega6", "omega3", "cholesterol", "fiber", "sodium",
  "vitaminA", "vitaminD", "vitaminE", "vitaminK", "vitaminC", "thiamin", "riboflavin",
  "niacin", "pantothenicAcid", "vitaminB6", "biotin", "folicAcid", "vitaminB12",
  "calcium", "chloride", "copper", "chromium", "iron", "fluoride", "phosphorus", "iodine",
  "magnesium", "manganese", "molybdenum", "potassium", "selenium", "zinc", "choline",
] as const;

const POLYOLS = new Set(["maltitol", "lactitol", "xilitol", "sorbitol", "manitol", "isomalte", "eritritol"]);

export function extraConstituentPlacement(name: string): { key: string; indentLevel: 0 | 1 | 2 } {
  const key = constituentKey(name);
  if (["lactose", "galactose", "tagatose"].includes(key)) return { key: `@${key}`, indentLevel: 2 };
  if (key === "poliois totais") return { key: "@poliois totais", indentLevel: 1 };
  if (POLYOLS.has(key)) return { key: "@poliois", indentLevel: 2 };
  return { key: "@outros", indentLevel: 0 };
}

export function sortAnnexXiRows<T extends { orderKey: string }>(rows: T[]): T[] {
  const rank = (key: string) => {
    const index = (ORDER as readonly string[]).indexOf(key);
    return index < 0 ? ORDER.length : index;
  };
  return [...rows].sort((a, b) => rank(a.orderKey) - rank(b.orderKey));
}

export function arrangeAnnexXiExtras<T extends { name: string }>(items: T[]) {
  const carbohydrates: Array<{ item: T; indentLevel: 0 | 1 | 2; orderKey: string }> = [];
  const remaining: T[] = [];
  for (const item of items) {
    const placement = extraConstituentPlacement(item.name);
    if (placement.key === "@outros") remaining.push(item);
    else carbohydrates.push({ item, indentLevel: placement.indentLevel, orderKey: placement.key });
  }
  return { carbohydrates: sortAnnexXiRows(carbohydrates), remaining };
}
