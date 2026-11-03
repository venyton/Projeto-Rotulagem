import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { createMemorialPdf, type MemorialDocumentData } from "./memorial-pdf";
import { createMemorialXlsx } from "./memorial-xlsx";

const data = {
  title: "Produto teste", description: "Descrição do produto", regulatoryCategory: "Alimento",
  foodGroup: "Alimentos", productSuggestion: "", physicalState: "Sólido", populationGroup: "Adultos",
  portionSize: 50, portionUnit: "g", householdMeasure: "1 unidade", netContent: "", servingsPerPackage: "",
  totalWeight: 100, generatedAt: new Date("2026-01-01T12:00:00Z"), calculationVersion: "1.0",
  values: [{ label: "Proteínas", unit: "g", totalRecipe: 10, per100: 10, perPortion: 5 }],
  components: [{ name: "Ingrediente", quantity: 100, percentage: 100, function: "", source: "Laudo", composition: [{ label: "Proteínas", unit: "g", value: 10 }], contributionPer100: [{ label: "Proteínas", unit: "g", value: 10 }], contributionPerPortion: [{ label: "Proteínas", unit: "g", value: 5 }] }],
  technical: {}, verification: {},
} as MemorialDocumentData;

test("memorial PDF e planilha apresentam valores sem fórmulas", async () => {
  const pdf = createMemorialPdf(data);
  assert.equal(Buffer.from(pdf).subarray(0, 5).toString(), "%PDF-");
  const bytes = await createMemorialXlsx(data);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(bytes) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const values: string[] = [];
  workbook.eachSheet((sheet) => sheet.eachRow((row) => row.eachCell((cell) => {
    assert.notEqual(cell.type, ExcelJS.ValueType.Formula);
    values.push(String(cell.value ?? ""));
  })));
  assert.ok(values.includes("Laudo"));
  assert.ok(values.includes("Descrição do produto"));
  assert.ok(values.includes("5"));
});
