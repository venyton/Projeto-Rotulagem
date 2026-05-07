import ExcelJS from "exceljs";
import { access } from "node:fs/promises";
import path from "path";
import { CalculatedNutrients } from "@/features/tables/domain/nutrients";
import {
  calculateVD,
  roundEnergy,
  roundMacro,
  roundSaturatedTrans,
  roundSodium,
  roundSugars,
} from "@/features/tables/domain/anvisa";
import { POPULATION_GROUPS, POPULATION_LABELS, PopGroup, VDR } from "@/features/tables/domain/constants";
import { MICRONUTRIENTS } from "@/features/tables/domain/micronutrients";

export type SheetType =
  | "VERT"
  | "HORIZ"
  | "VERT-QUEB"
  | "HORIZ-QUEB"
  | "LINEAR"
  | "AGREGADO"
  | "SIMPLIF"
  | "B2B"
  | "ADICAO"
  | "100"
  | "SUPLEM"
  | "SUPLEM-POP";

export const ALL_SHEET_TYPES: SheetType[] = [
  "VERT",
  "HORIZ",
  "VERT-QUEB",
  "HORIZ-QUEB",
  "LINEAR",
  "AGREGADO",
  "SIMPLIF",
  "B2B",
  "ADICAO",
  "100",
  "SUPLEM",
  "SUPLEM-POP",
];

export const SUPPLEMENT_SHEET_TYPES: SheetType[] = ["SUPLEM", "SUPLEM-POP"];

export type ExportBody = {
  title?: string;
  per100g: CalculatedNutrients;
  perPortion: CalculatedNutrients;
  portionSize: number;
  householdMeasure: string;
  popGroup: PopGroup;
  isSupplement?: boolean;
  servingsPerPackage?: string;
  selectedNutrients: string[];
  selectedTableTypes: SheetType[];
};

type CellValueMap = Record<string, string>;

interface Metric {
  name: string;
  per100: string;
  portion: string;
  vdPortion: string;
  vd100: string;
}

type NutrientMap = Record<string, Metric>;

type SelectedMicroRow = {
  name: string;
  portion: string;
  vdPortion: string;
};

const TEMPLATE_PATH_CANDIDATES = [
  path.join(process.cwd(), "Dataset", "reference", "table-examples", "modelos_oficiais_tabelas_excel.xlsx"),
  path.join(process.cwd(), "calculadora-nutricional", "Dataset", "reference", "table-examples", "modelos_oficiais_tabelas_excel.xlsx"),
  "/home/paz/Projeto-Rotulagem/calculadora-nutricional/Dataset/reference/table-examples/modelos_oficiais_tabelas_excel.xlsx",
];

function withFallbackVdr(group: PopGroup) {
  return VDR[group] || VDR[POPULATION_GROUPS.ADULTS];
}

function getServingsValue(val: string | undefined) {
  if (!val || val.trim().length === 0) return "---";
  return val;
}

function getPortionLine(size: number, measure: string) {
  const s = size.toString().replace(".", ",");
  const m = measure.trim() || "medida caseira";
  return `Porção: ${s} g (${m})`;
}

function buildNutrientMap(body: ExportBody, vdr: Record<string, number | null | undefined>): NutrientMap {
  const p100 = body.per100g as unknown as Record<string, number>;
  const pPortion = body.perPortion as unknown as Record<string, number>;

  const keys = [
    { key: "energy", name: "Valor energético (kcal)", round: roundEnergy },
    { key: "carbs", name: "Carboidratos totais (g)", round: roundMacro },
    { key: "sugarTotal", name: "Açúcares totais (g)", round: roundSugars },
    { key: "sugarAdded", name: "Açúcares adicionados (g)", round: roundSugars },
    { key: "protein", name: "Proteínas (g)", round: roundMacro },
    { key: "fatTotal", name: "Gorduras totais (g)", round: roundMacro },
    { key: "fatSat", name: "Gorduras saturadas (g)", round: roundSaturatedTrans },
    { key: "fatTrans", name: "Gorduras trans (g)", round: roundSaturatedTrans },
    { key: "fiber", name: "Fibras alimentares (g)", round: roundMacro },
    { key: "sodium", name: "Sódio (mg)", round: roundSodium },
  ];

  const map: Record<string, Metric> = {};

  keys.forEach(({ key, name, round }) => {
    const raw100 = p100[key] ?? 0;
    const rawPortion = pPortion[key] ?? 0;
    const ref = vdr[key];

    map[key] = {
      name,
      per100: round(raw100).replace(".", ","),
      portion: round(rawPortion).replace(".", ","),
      vd100: calculateVD(raw100, ref ?? null),
      vdPortion: calculateVD(rawPortion, ref ?? null),
    };
  });

  return map;
}

function buildSelectedMicroRows(body: ExportBody, vdr: Record<string, number | null | undefined>): SelectedMicroRow[] {
  const pPortion = body.perPortion as unknown as Record<string, number>;

  return MICRONUTRIENTS.filter((m) => body.selectedNutrients.includes(m.name)).map((m) => {
    const rawPortion = pPortion[m.name] ?? 0;
    const ref = vdr[m.name];

    const formatMicro = (val: number) => {
      if (val === 0) return "0";
      if (val < 1) return val.toFixed(1).replace(".", ",");
      return Math.round(val).toString();
    };

    return {
      name: `${m.label} (${m.unit})`,
      portion: formatMicro(rawPortion),
      vdPortion: calculateVD(rawPortion, ref ?? null),
    };
  });
}

function nutrientRows(n: NutrientMap): Metric[] {
  return [
    n.energy,
    n.carbs,
    n.sugarTotal,
    n.sugarAdded,
    n.protein,
    n.fatTotal,
    n.fatSat,
    n.fatTrans,
    n.fiber,
    n.sodium,
  ];
}

function setCell(cells: CellValueMap, ref: string, value: string) {
  cells[ref] = value;
}

function fillVertical(cells: CellValueMap, body: ExportBody, n: NutrientMap, micros: SelectedMicroRow[]) {
  setCell(cells, "C8", `Porções por embalagem: ${getServingsValue(body.servingsPerPackage)}`);
  setCell(cells, "C9", getPortionLine(body.portionSize, body.householdMeasure));
  
  // Official template has 100g in D11, Portion in E11, VD in F11
  setCell(cells, "D11", `100 g`);
  setCell(cells, "E11", `Porção`);
  setCell(cells, "F11", `%VD*`);

  const rows = nutrientRows(n);
  rows.forEach((values, index) => {
    const row = 12 + index;
    setCell(cells, `D${row}`, values.per100);
    setCell(cells, `E${row}`, values.portion);
    setCell(cells, `F${row}`, values.vdPortion);
  });

  micros.forEach((m, i) => {
    const row = 22 + i;
    setCell(cells, `C${row}`, m.name);
    setCell(cells, `E${row}`, m.portion);
    setCell(cells, `F${row}`, m.vdPortion);
  });
}

function fillHorizontal(cells: CellValueMap, body: ExportBody, n: NutrientMap, micros: SelectedMicroRow[]) {
  const rows = nutrientRows(n);
  const left = rows.slice(0, 5);
  const right = rows.slice(5);

  setCell(
    cells,
    "C8",
    `Porções por embalagem: ${getServingsValue(body.servingsPerPackage)} • ${getPortionLine(body.portionSize, body.householdMeasure)}`
  );
  
  // Horizontal has headers at row 8 usually, and nutrients at row 9
  setCell(cells, "E8", `${body.portionSize} g`);
  setCell(cells, "J8", `${body.portionSize} g`);

  left.forEach((values, index) => {
    const row = 9 + index;
    setCell(cells, `D${row}`, values.per100);
    setCell(cells, `E${row}`, values.portion);
    setCell(cells, `F${row}`, values.vdPortion);
  });

  right.forEach((values, index) => {
    const row = 9 + index;
    setCell(cells, `I${row}`, values.per100);
    setCell(cells, `J${row}`, values.portion);
    setCell(cells, `K${row}`, values.vdPortion);
  });
}

function fillVerticalQuebrado(cells: CellValueMap, body: ExportBody, n: NutrientMap, micros: SelectedMicroRow[]) {
  const rows = nutrientRows(n);
  const top = rows.slice(0, 5);
  const bottom = rows.slice(5);

  setCell(cells, "C8", `Porções por embalagem: ${getServingsValue(body.servingsPerPackage)}`);
  setCell(cells, "C9", getPortionLine(body.portionSize, body.householdMeasure));

  top.forEach((values, index) => {
    const row = 12 + index;
    setCell(cells, `D${row}`, values.per100);
    setCell(cells, `E${row}`, values.portion);
    setCell(cells, `F${row}`, values.vdPortion);
  });

  bottom.forEach((values, index) => {
    const row = 19 + index;
    setCell(cells, `D${row}`, values.per100);
    setCell(cells, `E${row}`, values.portion);
    setCell(cells, `F${row}`, values.vdPortion);
  });
}

function fillHorizontalQuebrado(cells: CellValueMap, body: ExportBody, n: NutrientMap, micros: SelectedMicroRow[]) {
  const rows = nutrientRows(n);
  const q1 = rows.slice(0, 3);
  const q2 = rows.slice(3, 6);
  const q3 = rows.slice(6, 10);

  setCell(
    cells,
    "C8",
    `Porções por embalagem: ${getServingsValue(body.servingsPerPackage)} • ${getPortionLine(body.portionSize, body.householdMeasure)}`
  );

  q1.forEach((values, index) => {
    const row = 11 + index;
    setCell(cells, `D${row}`, values.per100);
    setCell(cells, `E${row}`, values.portion);
    setCell(cells, `F${row}`, values.vdPortion);
  });

  q2.forEach((values, index) => {
    const row = 11 + index;
    setCell(cells, `H${row}`, values.per100);
    setCell(cells, `I${row}`, values.portion);
    setCell(cells, `J${row}`, values.vdPortion);
  });

  q3.forEach((values, index) => {
    const row = 11 + index;
    setCell(cells, `L${row}`, values.per100);
    setCell(cells, `M${row}`, values.portion);
    setCell(cells, `N${row}`, values.vdPortion);
  });
}

function fillLinear(cells: CellValueMap, body: ExportBody, n: NutrientMap, micros: SelectedMicroRow[]) {
  const rows = nutrientRows(n);
  const text = rows
    .map((v) => `${v.name.split(" (")[0]} ${v.portion} (${v.vdPortion}% VD*)`)
    .join("; ");
  
  const mText = micros.map(m => `${m.name} ${m.portion} (${m.vdPortion}% VD*)`).join("; ");
  const fullText = mText ? `${text}; ${mText}` : text;

  setCell(cells, "C8", `INFORMAÇÃO NUTRICIONAL: Porções por embalagem: ${getServingsValue(body.servingsPerPackage)}. ${getPortionLine(body.portionSize, body.householdMeasure)}. Valor energético ${n.energy.portion} kcal (${n.energy.vdPortion}% VD); ${fullText}. *Percentual de valores diários fornecidos pela porção.`);
}

function fillAgregado(cells: CellValueMap, body: ExportBody, n: NutrientMap, micros: SelectedMicroRow[]) {
  const rows = nutrientRows(n);
  setCell(cells, "C8", `Porções por embalagem: ${getServingsValue(body.servingsPerPackage)}`);
  setCell(cells, "C9", getPortionLine(body.portionSize, body.householdMeasure));

  rows.forEach((values, index) => {
    const row = 12 + index;
    setCell(cells, `D${row}`, values.per100);
    setCell(cells, `E${row}`, values.portion);
    setCell(cells, `F${row}`, values.vdPortion);
  });
}

function fillSimplificado(cells: CellValueMap, body: ExportBody, n: NutrientMap, micros: SelectedMicroRow[]) {
  const rows = nutrientRows(n).filter(r => !r.name.includes("açúcar") && !r.name.includes("trans"));
  setCell(cells, "C8", `Porções por embalagem: ${getServingsValue(body.servingsPerPackage)}`);
  setCell(cells, "C9", getPortionLine(body.portionSize, body.householdMeasure));

  rows.forEach((values, index) => {
    const row = 12 + index;
    setCell(cells, `D${row}`, values.per100);
    setCell(cells, `E${row}`, values.portion);
    setCell(cells, `F${row}`, values.vdPortion);
  });
}

function fillB2B(cells: CellValueMap, n: NutrientMap, micros: SelectedMicroRow[]) {
  const rows = nutrientRows(n);
  rows.forEach((values, index) => {
    const row = 12 + index;
    setCell(cells, `D${row}`, values.per100);
  });

  micros.forEach((m, i) => {
    const row = 22 + i;
    setCell(cells, `C${row}`, m.name);
    setCell(cells, `D${row}`, m.portion);
  });
}

function fillAdicao(cells: CellValueMap, body: ExportBody, n: NutrientMap, micros: SelectedMicroRow[]) {
  const rows = nutrientRows(n);
  setCell(cells, "C8", `Porções por embalagem: ${getServingsValue(body.servingsPerPackage)}`);
  setCell(cells, "C9", getPortionLine(body.portionSize, body.householdMeasure));

  rows.forEach((values, index) => {
    const row = 12 + index;
    setCell(cells, `D${row}`, values.portion);
    setCell(cells, `E${row}`, values.vdPortion);
  });
}

function fill100(cells: CellValueMap, body: ExportBody, n: NutrientMap, micros: SelectedMicroRow[]) {
  const rows = nutrientRows(n);
  setCell(cells, "C8", `Porções por embalagem: ${getServingsValue(body.servingsPerPackage)}`);
  setCell(cells, "C9", getPortionLine(body.portionSize, body.householdMeasure));

  rows.forEach((values, index) => {
    const row = 12 + index;
    setCell(cells, `D${row}`, values.per100);
    setCell(cells, `E${row}`, values.vd100);
  });
}

function fillSuplemento(cells: CellValueMap, body: ExportBody, n: NutrientMap, micros: SelectedMicroRow[]) {
  const rows = nutrientRows(n);
  setCell(cells, "C8", `Porções por embalagem: ${getServingsValue(body.servingsPerPackage)}`);
  setCell(cells, "C9", getPortionLine(body.portionSize, body.householdMeasure));

  rows.forEach((values, index) => {
    const row = 12 + index;
    setCell(cells, `D${row}`, values.portion);
    setCell(cells, `E${row}`, values.vdPortion);
  });
}

function fillSuplementoPopulacional(
  cells: CellValueMap,
  body: ExportBody,
  selected: NutrientMap,
  adults: NutrientMap,
  microsSelected: SelectedMicroRow[]
) {
  const rowsSelected = nutrientRows(selected);
  const rowsAdults = nutrientRows(adults);

  setCell(cells, "E7", POPULATION_LABELS[body.popGroup] ?? "Grupo populacional 1");
  setCell(cells, "H7", POPULATION_LABELS[POPULATION_GROUPS.ADULTS]);

  setCell(cells, "E8", `Porções por emb.: ${getServingsValue(body.servingsPerPackage)}`);
  setCell(cells, "H8", `Porções por emb.: ${getServingsValue(body.servingsPerPackage)}`);
  setCell(cells, "E9", getPortionLine(body.portionSize, body.householdMeasure));
  setCell(cells, "H9", getPortionLine(body.portionSize, body.householdMeasure));

  rowsSelected.forEach((values, index) => {
    const row = 12 + index;
    setCell(cells, `E${row}`, values.portion);
    setCell(cells, `F${row}`, values.vdPortion);

    const adultsValues = rowsAdults[index];
    setCell(cells, `H${row}`, adultsValues.portion);
    setCell(cells, `I${row}`, adultsValues.vdPortion);
  });
}

async function resolveTemplatePath() {
  for (const candidate of TEMPLATE_PATH_CANDIDATES) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try next candidate
    }
  }
  throw new Error(`Template de Excel não encontrado.`);
}

export function sanitizeSelectedTableTypes(selected: SheetType[] | undefined, isSupplement: boolean | undefined): SheetType[] {
  const safe = (selected ?? []).filter((item): item is SheetType => ALL_SHEET_TYPES.includes(item));
  if (isSupplement) {
    const supplementOnly = safe.filter((item) => SUPPLEMENT_SHEET_TYPES.includes(item));
    return supplementOnly.length > 0 ? supplementOnly : SUPPLEMENT_SHEET_TYPES;
  }
  const nonSupplement = safe.filter((item) => !SUPPLEMENT_SHEET_TYPES.includes(item));
  const defaultNonSupplement = ALL_SHEET_TYPES.filter((item) => !SUPPLEMENT_SHEET_TYPES.includes(item));
  return nonSupplement.length > 0 ? nonSupplement : defaultNonSupplement;
}

export async function generateExcelBuffer(body: ExportBody): Promise<Uint8Array> {
  const selectedTables = sanitizeSelectedTableTypes(body.selectedTableTypes, body.isSupplement);

  const vdr = withFallbackVdr(body.popGroup);
  const nutrients = buildNutrientMap(body, vdr);
  const nutrientsAdults = buildNutrientMap(body, withFallbackVdr(POPULATION_GROUPS.ADULTS));
  const selectedMicros = buildSelectedMicroRows(body, vdr);

  const cellsBySheet: Partial<Record<SheetType, CellValueMap>> = {};
  const setSheetCells = (sheet: SheetType, fill: (cells: CellValueMap) => void) => {
    const cells: CellValueMap = {};
    fill(cells);
    cellsBySheet[sheet] = cells;
  };

  setSheetCells("VERT", (cells) => fillVertical(cells, body, nutrients, selectedMicros));
  setSheetCells("HORIZ", (cells) => fillHorizontal(cells, body, nutrients, selectedMicros));
  setSheetCells("VERT-QUEB", (cells) => fillVerticalQuebrado(cells, body, nutrients, selectedMicros));
  setSheetCells("HORIZ-QUEB", (cells) => fillHorizontalQuebrado(cells, body, nutrients, selectedMicros));
  setSheetCells("LINEAR", (cells) => fillLinear(cells, body, nutrients, selectedMicros));
  setSheetCells("AGREGADO", (cells) => fillAgregado(cells, body, nutrients, selectedMicros));
  setSheetCells("SIMPLIF", (cells) => fillSimplificado(cells, body, nutrients, selectedMicros));
  setSheetCells("B2B", (cells) => fillB2B(cells, nutrients, selectedMicros));
  setSheetCells("ADICAO", (cells) => fillAdicao(cells, body, nutrients, selectedMicros));
  setSheetCells("100", (cells) => fill100(cells, body, nutrients, selectedMicros));
  setSheetCells("SUPLEM", (cells) => fillSuplemento(cells, body, nutrients, selectedMicros));
  setSheetCells("SUPLEM-POP", (cells) =>
    fillSuplementoPopulacional(cells, body, nutrients, nutrientsAdults, selectedMicros)
  );

  const templatePath = await resolveTemplatePath();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  for (const [sheetName, cellValues] of Object.entries(cellsBySheet)) {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) continue;

    for (const [ref, value] of Object.entries(cellValues)) {
      const cell = sheet.getCell(ref);
      cell.value = value;
    }
  }

  workbook.eachSheet((sheet) => {
    const name = sheet.name as SheetType;
    if (ALL_SHEET_TYPES.includes(name)) {
      const isSelected = selectedTables.includes(name);
      sheet.state = isSelected ? "visible" : "hidden";
    }
  });

  const firstVisible = workbook.worksheets.find((s) => s.state === "visible");
  if (firstVisible) {
    workbook.views = [
      {
        x: 0,
        y: 0,
        width: 10000,
        height: 20000,
        firstSheet: 0,
        activeTab: firstVisible.id - 1,
        visibility: "visible",
      },
    ];
  }

  const result = await workbook.xlsx.writeBuffer();
  return new Uint8Array(result);
}
