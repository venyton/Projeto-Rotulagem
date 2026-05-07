import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import ExcelJS from "exceljs";
import { access, readFile } from "node:fs/promises";
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

type SheetType =
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

const ALL_SHEET_TYPES: SheetType[] = [
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

const SUPPLEMENT_SHEET_TYPES: SheetType[] = ["SUPLEM", "SUPLEM-POP"];
const DEFAULT_VD_SUGAR_ADDED = 50;
const DEFAULT_VD_FAT_TRANS = 2;

type ExportBody = {
  title?: string;
  per100g: CalculatedNutrients;
  perPortion: CalculatedNutrients;
  portionSize: number;
  householdMeasure: string;
  popGroup: PopGroup;
  isSupplement?: boolean;
  servingsPerPackage?: string;
  selectedNutrients?: string[];
  selectedTableTypes?: SheetType[];
};

type Metric = {
  per100: string;
  portion: string;
  vd100: string;
  vdPortion: string;
};

type NutrientMap = {
  energy: Metric;
  carbs: Metric;
  sugarTotal: Metric;
  sugarAdded: Metric;
  protein: Metric;
  fatTotal: Metric;
  fatSat: Metric;
  fatTrans: Metric;
  fiber: Metric;
  sodium: Metric;
};

type SelectedMicroRow = {
  label: string;
  per100: string;
  portion: string;
  vd100: string;
  vdPortion: string;
};

type CellValueMap = Record<string, string>;

const TEMPLATE_PATH_CANDIDATES = [
  path.join(process.cwd(), "Dataset", "reference", "table-examples", "modelos_oficiais_tabelas_excel.xlsx"),
  path.join(
    process.cwd(),
    "calculadora-nutricional",
    "Dataset",
    "reference",
    "table-examples",
    "modelos_oficiais_tabelas_excel.xlsx"
  ),
];

function withFallbackVdr(popGroup: PopGroup) {
  return VDR[popGroup] ?? VDR[POPULATION_GROUPS.ADULTS];
}

function getServingsValue(servingsPerPackage?: string) {
  const text = servingsPerPackage?.trim();
  return text || "Cerca de ...";
}

function getPortionLine(portionSize: number, householdMeasure: string) {
  const measure = householdMeasure?.trim() || "medida caseira";
  return `Porção: ${portionSize} g (${measure})`;
}

function getVdReference(vdr: ReturnType<typeof withFallbackVdr>, key: keyof CalculatedNutrients) {
  if (key === "sugarAdded") return DEFAULT_VD_SUGAR_ADDED;
  if (key === "fatTrans") return DEFAULT_VD_FAT_TRANS;
  const vdrValues = vdr as Record<string, number | null | undefined>;
  return vdrValues[key] ?? null;
}

function formatMicro(val: number): string {
  if (val === 0) return "0";
  if (val < 1) return val.toFixed(1).replace(".", ",");
  return Math.round(val).toString();
}

function buildNutrientMap(body: ExportBody, vdr: ReturnType<typeof withFallbackVdr>): NutrientMap {
  const per100 = (body.per100g ?? {}) as Partial<Record<keyof CalculatedNutrients, unknown>>;
  const perPortion = (body.perPortion ?? {}) as Partial<Record<keyof CalculatedNutrients, unknown>>;
  const safeNumber = (value: unknown) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };
  const valueByKey = (key: keyof CalculatedNutrients) => ({
    per100: safeNumber(per100[key]),
    perPortion: safeNumber(perPortion[key]),
  });
  const getVD = (val: number, ref: number | null | undefined) => calculateVD(val, ref ?? null);

  const metric = (
    per100Raw: number,
    portionRaw: number,
    format: (val: number) => string,
    ref: number | null | undefined,
    hasVD = true
  ): Metric => ({
    per100: format(per100Raw),
    portion: format(portionRaw),
    vd100: hasVD ? getVD(per100Raw, ref) : "-",
    vdPortion: hasVD ? getVD(portionRaw, ref) : "-",
  });

  return {
    energy: metric(valueByKey("energy").per100, valueByKey("energy").perPortion, roundEnergy, vdr.energy),
    carbs: metric(valueByKey("carbs").per100, valueByKey("carbs").perPortion, roundMacro, vdr.carbs),
    sugarTotal: metric(
      valueByKey("sugarTotal").per100,
      valueByKey("sugarTotal").perPortion,
      roundSugars,
      null,
      false
    ),
    sugarAdded: metric(
      valueByKey("sugarAdded").per100,
      valueByKey("sugarAdded").perPortion,
      roundSugars,
      getVdReference(vdr, "sugarAdded")
    ),
    protein: metric(valueByKey("protein").per100, valueByKey("protein").perPortion, roundMacro, vdr.protein),
    fatTotal: metric(valueByKey("fatTotal").per100, valueByKey("fatTotal").perPortion, roundMacro, vdr.fatTotal),
    fatSat: metric(
      valueByKey("fatSat").per100,
      valueByKey("fatSat").perPortion,
      roundSaturatedTrans,
      vdr.fatSat
    ),
    fatTrans: metric(
      valueByKey("fatTrans").per100,
      valueByKey("fatTrans").perPortion,
      roundSaturatedTrans,
      getVdReference(vdr, "fatTrans")
    ),
    fiber: metric(valueByKey("fiber").per100, valueByKey("fiber").perPortion, roundMacro, vdr.fiber),
    sodium: metric(valueByKey("sodium").per100, valueByKey("sodium").perPortion, roundSodium, vdr.sodium),
  };
}

function buildSelectedMicroRows(body: ExportBody, vdr: ReturnType<typeof withFallbackVdr>): SelectedMicroRow[] {
  const selected = new Set(Array.isArray(body.selectedNutrients) ? body.selectedNutrients : []);
  const per100Values = (body.per100g ?? {}) as unknown as Record<string, number>;
  const portionValues = (body.perPortion ?? {}) as unknown as Record<string, number>;
  const vdrValues = vdr as Record<string, number | null | undefined>;

  return MICRONUTRIENTS.filter((micro) => selected.has(micro.name)).map((micro) => {
    const per100Raw = per100Values[micro.name] ?? 0;
    const portionRaw = portionValues[micro.name] ?? 0;
    const ref = vdrValues[micro.name];

    return {
      label: `${micro.label} (${micro.unit})`,
      per100: formatMicro(per100Raw),
      portion: formatMicro(portionRaw),
      vd100: calculateVD(per100Raw, ref ?? null),
      vdPortion: calculateVD(portionRaw, ref ?? null),
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

function setMicrosMetadata(cells: CellValueMap, micros: SelectedMicroRow[]) {
  // Mantemos o template oficial intacto sem gravar metadados técnicos em células auxiliares.
  void cells;
  void micros;
}

function fillVertical(cells: CellValueMap, body: ExportBody, n: NutrientMap, micros: SelectedMicroRow[]) {
  const rows = nutrientRows(n);
  setCell(cells, "C8", `Porções por embalagem: ${getServingsValue(body.servingsPerPackage)}`);
  setCell(cells, "C9", getPortionLine(body.portionSize, body.householdMeasure));
  setCell(cells, "E11", `${body.portionSize} g`);

  rows.forEach((values, index) => {
    const row = 12 + index;
    setCell(cells, `D${row}`, values.per100);
    setCell(cells, `E${row}`, values.portion);
    setCell(cells, `F${row}`, values.vdPortion);
  });

  setMicrosMetadata(cells, micros);
}

function fillHorizontal(cells: CellValueMap, body: ExportBody, n: NutrientMap, micros: SelectedMicroRow[]) {
  const rows = nutrientRows(n);
  setCell(cells, "C10", `Porções por emb.: ${getServingsValue(body.servingsPerPackage)}`);
  setCell(cells, "C11", "");
  setCell(cells, "C12", `Porção: ${body.portionSize} g`);
  setCell(cells, "C13", `(${body.householdMeasure?.trim() || "medida caseira"})`);
  setCell(cells, "G8", `${body.portionSize} g`);

  rows.forEach((values, index) => {
    const row = 9 + index;
    setCell(cells, `F${row}`, values.per100);
    setCell(cells, `G${row}`, values.portion);
    setCell(cells, `H${row}`, values.vdPortion);
  });

  setMicrosMetadata(cells, micros);
}

function fillVerticalQuebrado(cells: CellValueMap, body: ExportBody, n: NutrientMap, micros: SelectedMicroRow[]) {
  const rows = nutrientRows(n);
  const left = rows.slice(0, 5);
  const right = rows.slice(5);

  setCell(
    cells,
    "C8",
    `Porções por embalagem: ${getServingsValue(body.servingsPerPackage)} ● ${getPortionLine(body.portionSize, body.householdMeasure)}`
  );
  setCell(cells, "E10", `${body.portionSize} g`);
  setCell(cells, "J10", `${body.portionSize} g`);

  left.forEach((values, index) => {
    const row = 11 + index;
    setCell(cells, `D${row}`, values.per100);
    setCell(cells, `E${row}`, values.portion);
    setCell(cells, `F${row}`, values.vdPortion);
  });

  right.forEach((values, index) => {
    const row = 11 + index;
    setCell(cells, `I${row}`, values.per100);
    setCell(cells, `J${row}`, values.portion);
    setCell(cells, `K${row}`, values.vdPortion);
  });

  setMicrosMetadata(cells, micros);
}

function fillHorizontalQuebrado(cells: CellValueMap, body: ExportBody, n: NutrientMap, micros: SelectedMicroRow[]) {
  const rows = nutrientRows(n);
  const left = rows.slice(0, 5);
  const right = rows.slice(5);

  setCell(cells, "C10", `Porções por emb.: ${getServingsValue(body.servingsPerPackage)}`);
  setCell(cells, "C11", `Porção: ${body.portionSize} g`);
  setCell(cells, "C12", `(${body.householdMeasure?.trim() || "medida caseira"})`);
  setCell(cells, "G8", `${body.portionSize} g`);
  setCell(cells, "L8", `${body.portionSize} g`);

  left.forEach((values, index) => {
    const row = 9 + index;
    setCell(cells, `F${row}`, values.per100);
    setCell(cells, `G${row}`, values.portion);
    setCell(cells, `H${row}`, values.vdPortion);
  });

  right.forEach((values, index) => {
    const row = 9 + index;
    setCell(cells, `K${row}`, values.per100);
    setCell(cells, `L${row}`, values.portion);
    setCell(cells, `M${row}`, values.vdPortion);
  });

  setMicrosMetadata(cells, micros);
}

function fillLinear(cells: CellValueMap, body: ExportBody, n: NutrientMap, micros: SelectedMicroRow[]) {
  setCell(
    cells,
    "C8",
    `Porções por embalagem: ${getServingsValue(body.servingsPerPackage)} ● ${getPortionLine(body.portionSize, body.householdMeasure)}`
  );

  const microsPhrase =
    micros.length > 0
      ? ` ● Micronutrientes selecionados: ${micros
          .map((m) => `${m.label} ${m.portion} (${m.vdPortion}% VD*)`)
          .join("; ")}.`
      : "";

  const text =
    `Por 100 g ou ml (${body.portionSize} g, % VD*): Valor energético ${n.energy.per100} kcal (${n.energy.portion} kcal, ${n.energy.vdPortion}% VD*) ● ` +
    `Carboidratos ${n.carbs.per100} g (${n.carbs.portion} g, ${n.carbs.vdPortion}% VD*), dos quais Açúcares totais ${n.sugarTotal.per100} g (${n.sugarTotal.portion} g), ` +
    `Açúcares adicionados ${n.sugarAdded.per100} g (${n.sugarAdded.portion} g, ${n.sugarAdded.vdPortion}% VD*) ● Proteínas ${n.protein.per100} g (${n.protein.portion} g, ${n.protein.vdPortion}% VD*) ● ` +
    `Gorduras totais ${n.fatTotal.per100} g (${n.fatTotal.portion} g, ${n.fatTotal.vdPortion}% VD*), das quais Gorduras saturadas ${n.fatSat.per100} g (${n.fatSat.portion} g, ${n.fatSat.vdPortion}% VD*), ` +
    `Gorduras trans ${n.fatTrans.per100} g (${n.fatTrans.portion} g, ${n.fatTrans.vdPortion}% VD*) ● Fibras alimentares ${n.fiber.per100} g (${n.fiber.portion} g, ${n.fiber.vdPortion}% VD*) ● ` +
    `Sódio ${n.sodium.per100} mg (${n.sodium.portion} mg, ${n.sodium.vdPortion}% VD*).` +
    microsPhrase;

  setCell(cells, "C10", text);
}

function fillAgregado(cells: CellValueMap, body: ExportBody, n: NutrientMap, micros: SelectedMicroRow[]) {
  const rows = nutrientRows(n);
  const title = body.title?.trim() || "Produto";

  setCell(cells, "E7", title);
  setCell(cells, "I7", `${title} (comparativo)`);
  setCell(cells, "E8", `Porções por emb.: ${getServingsValue(body.servingsPerPackage)}`);
  setCell(cells, "I8", `Porções por emb.: ${getServingsValue(body.servingsPerPackage)}`);
  setCell(cells, "E9", getPortionLine(body.portionSize, body.householdMeasure));
  setCell(cells, "I9", getPortionLine(body.portionSize, body.householdMeasure));
  setCell(cells, "F11", `${body.portionSize} g`);
  setCell(cells, "J11", `${body.portionSize} g`);

  rows.forEach((values, index) => {
    const row = 12 + index;
    setCell(cells, `E${row}`, values.per100);
    setCell(cells, `F${row}`, values.portion);
    setCell(cells, `G${row}`, values.vdPortion);

    setCell(cells, `I${row}`, values.per100);
    setCell(cells, `J${row}`, values.portion);
    setCell(cells, `K${row}`, values.vdPortion);
  });

  setMicrosMetadata(cells, micros);
}

function fillSimplificado(cells: CellValueMap, body: ExportBody, n: NutrientMap, micros: SelectedMicroRow[]) {
  setCell(cells, "C8", `Porções por embalagem: ${getServingsValue(body.servingsPerPackage)}`);
  setCell(cells, "C9", getPortionLine(body.portionSize, body.householdMeasure));
  setCell(cells, "E11", `${body.portionSize} g`);

  setCell(cells, "D12", n.carbs.per100);
  setCell(cells, "E12", n.carbs.portion);
  setCell(cells, "F12", n.carbs.vdPortion);

  setMicrosMetadata(cells, micros);
}

function fillB2B(cells: CellValueMap, n: NutrientMap, micros: SelectedMicroRow[]) {
  const rows = nutrientRows(n);
  rows.forEach((values, index) => {
    const row = 10 + index;
    setCell(cells, `D${row}`, values.per100);
  });
  setMicrosMetadata(cells, micros);
}

function fillAdicao(cells: CellValueMap, body: ExportBody, n: NutrientMap, micros: SelectedMicroRow[]) {
  const rows = nutrientRows(n);

  setCell(cells, "C8", `Porções por embalagem: ${getServingsValue(body.servingsPerPackage)}`);
  setCell(cells, "C9", getPortionLine(body.portionSize, body.householdMeasure));
  setCell(cells, "E11", `${body.portionSize} g`);

  rows.forEach((values, index) => {
    const row = 12 + index;
    setCell(cells, `D${row}`, values.per100);
    setCell(cells, `E${row}`, values.portion);
    setCell(cells, `F${row}`, values.vdPortion);
  });

  setMicrosMetadata(cells, micros);
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

  setMicrosMetadata(cells, micros);
}

function fillSuplemento(cells: CellValueMap, body: ExportBody, n: NutrientMap, micros: SelectedMicroRow[]) {
  const rows = nutrientRows(n);

  setCell(cells, "C8", `Porções por embalagem: ${getServingsValue(body.servingsPerPackage)}`);
  setCell(cells, "C9", getPortionLine(body.portionSize, body.householdMeasure));
  setCell(cells, "D11", `${body.portionSize} g`);

  rows.forEach((values, index) => {
    const row = 12 + index;
    setCell(cells, `D${row}`, values.portion);
    setCell(cells, `E${row}`, values.vdPortion);
  });

  setMicrosMetadata(cells, micros);
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
  setCell(cells, "E11", `${body.portionSize} g`);
  setCell(cells, "H11", `${body.portionSize} g`);

  rowsSelected.forEach((values, index) => {
    const row = 12 + index;
    setCell(cells, `E${row}`, values.portion);
    setCell(cells, `F${row}`, values.vdPortion);

    const adultsValues = rowsAdults[index];
    setCell(cells, `H${row}`, adultsValues.portion);
    setCell(cells, `I${row}`, adultsValues.vdPortion);
  });

  setMicrosMetadata(cells, microsSelected);
}

function isSheetType(value: string): value is SheetType {
  return (ALL_SHEET_TYPES as string[]).includes(value);
}

function sanitizeSelectedTableTypes(selected: SheetType[] | undefined, isSupplement: boolean | undefined): SheetType[] {
  const safe = (selected ?? []).filter((item): item is SheetType => ALL_SHEET_TYPES.includes(item));

  if (isSupplement) {
    const supplementOnly = safe.filter((item) => SUPPLEMENT_SHEET_TYPES.includes(item));
    return supplementOnly.length > 0 ? supplementOnly : SUPPLEMENT_SHEET_TYPES;
  }

  const nonSupplement = safe.filter((item) => !SUPPLEMENT_SHEET_TYPES.includes(item));
  const defaultNonSupplement = ALL_SHEET_TYPES.filter((item) => !SUPPLEMENT_SHEET_TYPES.includes(item));
  return nonSupplement.length > 0 ? nonSupplement : defaultNonSupplement;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ExportBody>;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const exportBody: ExportBody = {
      title: typeof body.title === "string" ? body.title : "",
      per100g: (body.per100g ?? {}) as CalculatedNutrients,
      perPortion: (body.perPortion ?? {}) as CalculatedNutrients,
      portionSize: Number.isFinite(Number(body.portionSize)) ? Number(body.portionSize) : 0,
      householdMeasure:
        typeof body.householdMeasure === "string" && body.householdMeasure.trim().length > 0
          ? body.householdMeasure
          : "medida caseira",
      popGroup: (body.popGroup as PopGroup) ?? POPULATION_GROUPS.ADULTS,
      isSupplement: Boolean(body.isSupplement),
      servingsPerPackage: typeof body.servingsPerPackage === "string" ? body.servingsPerPackage : undefined,
      selectedNutrients: Array.isArray(body.selectedNutrients) ? body.selectedNutrients : [],
      selectedTableTypes: Array.isArray(body.selectedTableTypes) ? (body.selectedTableTypes as SheetType[]) : [],
    };

    const selectedTables = sanitizeSelectedTableTypes(exportBody.selectedTableTypes, exportBody.isSupplement);

    const vdr = withFallbackVdr(exportBody.popGroup);
    const nutrients = buildNutrientMap(exportBody, vdr);
    const nutrientsAdults = buildNutrientMap(exportBody, withFallbackVdr(POPULATION_GROUPS.ADULTS));
    const selectedMicros = buildSelectedMicroRows(exportBody, vdr);

    const cellsBySheet: Partial<Record<SheetType, CellValueMap>> = {};
    const setSheetCells = (sheet: SheetType, fill: (cells: CellValueMap) => void) => {
      const cells: CellValueMap = {};
      fill(cells);
      cellsBySheet[sheet] = cells;
    };

    setSheetCells("VERT", (cells) => fillVertical(cells, exportBody, nutrients, selectedMicros));
    setSheetCells("HORIZ", (cells) => fillHorizontal(cells, exportBody, nutrients, selectedMicros));
    setSheetCells("VERT-QUEB", (cells) => fillVerticalQuebrado(cells, exportBody, nutrients, selectedMicros));
    setSheetCells("HORIZ-QUEB", (cells) => fillHorizontalQuebrado(cells, exportBody, nutrients, selectedMicros));
    setSheetCells("LINEAR", (cells) => fillLinear(cells, exportBody, nutrients, selectedMicros));
    setSheetCells("AGREGADO", (cells) => fillAgregado(cells, exportBody, nutrients, selectedMicros));
    setSheetCells("SIMPLIF", (cells) => fillSimplificado(cells, exportBody, nutrients, selectedMicros));
    setSheetCells("B2B", (cells) => fillB2B(cells, nutrients, selectedMicros));
    setSheetCells("ADICAO", (cells) => fillAdicao(cells, exportBody, nutrients, selectedMicros));
    setSheetCells("100", (cells) => fill100(cells, exportBody, nutrients, selectedMicros));
    setSheetCells("SUPLEM", (cells) => fillSuplemento(cells, exportBody, nutrients, selectedMicros));
    setSheetCells("SUPLEM-POP", (cells) =>
      fillSuplementoPopulacional(cells, exportBody, nutrients, nutrientsAdults, selectedMicros)
    );

    const templatePath = await resolveTemplatePath();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    // Apply cell values to each sheet
    for (const [sheetName, cellValues] of Object.entries(cellsBySheet)) {
      const sheet = workbook.getWorksheet(sheetName);
      if (!sheet) continue;

      for (const [ref, value] of Object.entries(cellValues)) {
        const cell = sheet.getCell(ref);
        cell.value = value;
      }
    }

    // Hide unselected sheets
    workbook.eachSheet((sheet) => {
      const name = sheet.name as SheetType;
      if (ALL_SHEET_TYPES.includes(name)) {
        const isSelected = selectedTables.includes(name);
        sheet.state = isSelected ? "visible" : "hidden";
      }
    });

    // Set the first visible sheet as active
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

    const safeTitle =
      (exportBody.title || "nutricional")
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_-]/g, "") || "nutricional";

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="tabela-${safeTitle}.xlsx"`,
      },
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to generate Excel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
  throw new Error(
    `Template de Excel não encontrado. Caminhos verificados: ${TEMPLATE_PATH_CANDIDATES.join(" | ")}`
  );
}
