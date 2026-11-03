import assert from "node:assert/strict";
import test from "node:test";
import { emptySheet, productSheetSchema, readProductSheet } from "./product-sheet";
import { createTechnicalSheetPdf, type MemorialDocumentData } from "../../../lib/export/memorial-pdf";

test("valida campos, seções e limita o conteúdo da ficha", () => {
  assert.equal(productSheetSchema.safeParse({ ...emptySheet, fields: { brand: "Marca" } }).success, true);
  assert.equal(productSheetSchema.safeParse({ ...emptySheet, fields: { desconhecido: "valor" } }).success, false);
  assert.equal(productSheetSchema.safeParse({ ...emptySheet, hidden: ["outra"] }).success, false);
  assert.equal(productSheetSchema.safeParse({ ...emptySheet, fields: { brand: "x".repeat(4001) } }).success, false);
  assert.deepEqual(readProductSheet(null), emptySheet);
});

test("PDF inclui apenas seções e legislação selecionadas", () => {
  const sheet = { ...emptySheet, hidden: ["storage" as const], fields: { brand: "Marca de teste", storage: "CONTEUDO OCULTO" }, laws: [{ id: "lei1", section: "microbiological" as const, note: "Observacao" }] };
  const data: MemorialDocumentData = { title: "Produto", description: "", regulatoryCategory: "", foodGroup: "", productSuggestion: "", physicalState: "", populationGroup: "", netContent: "100 g", portionSize: 50, portionUnit: "g", householdMeasure: "uma unidade", servingsPerPackage: "2", totalWeight: 100, generatedAt: new Date(), components: [], values: [], technical: { documentId: "", code: "", revision: "", issueDate: "", brand: "", eanGtin: "", category: "", designation: "", description: "", ingredients: "", recommendedUse: "", physicochemical: { rows: [] }, microbiological: { rows: [], legislation: "" }, contaminants: { rows: [], legislation: "" }, foreignMatter: { rows: [], legislation: "" }, presentation: "", validity: "", storage: "", packaging: "", palletization: "", revisions: [], preparedBy: { name: "", role: "", date: "", signature: "" }, approvedBy: { name: "", role: "", date: "", signature: "" } }, verification: { formulationPercent: 100, formulationStatus: "", energySummedPer100: 0, energyEstimatedPer100: 0, energyDifferencePercent: 0, energyStatus: "" }, productSheet: sheet, productLaws: [{ id: "lei1", number: "NORMA 123", title: "Titulo" }] };
  const pdf = Buffer.from(createTechnicalSheetPdf(data)).toString("latin1");
  assert.ok(pdf.startsWith("%PDF-"));
  assert.ok(pdf.includes("Marca de teste"));
  assert.ok(pdf.includes("NORMA 123"));
  assert.ok(!pdf.includes("CONTEUDO OCULTO"));
});

test("PDF incorpora logomarca JPEG", async () => {
  const sharp = (await import("sharp")).default;
  const logo = (await sharp({ create: { width: 300, height: 90, channels: 3, background: "#ff0000" } }).jpeg().toBuffer()).toString("base64");
  const sheet = { ...emptySheet, logo, hidden: [] };
  const emptyApproval = { name: "", role: "", date: "", signature: "" };
  const technical = { documentId: "", code: "", revision: "", issueDate: "", brand: "", eanGtin: "", category: "", designation: "", description: "", ingredients: "", recommendedUse: "", physicochemical: { rows: [] }, microbiological: { rows: [], legislation: "" }, contaminants: { rows: [], legislation: "" }, foreignMatter: { rows: [], legislation: "" }, presentation: "", validity: "", storage: "", packaging: "", palletization: "", revisions: [], preparedBy: emptyApproval, approvedBy: emptyApproval };
  const data: MemorialDocumentData = { title: "Produto", description: "", regulatoryCategory: "", foodGroup: "", productSuggestion: "", physicalState: "", populationGroup: "", netContent: "100 g", portionSize: 50, portionUnit: "g", householdMeasure: "unidade", servingsPerPackage: "2", totalWeight: 100, generatedAt: new Date(), components: [], values: [], technical, verification: { formulationPercent: 100, formulationStatus: "", energySummedPer100: 0, energyEstimatedPer100: 0, energyDifferencePercent: 0, energyStatus: "" }, productSheet: sheet };
  const pdfBytes = Buffer.from(createTechnicalSheetPdf(data));
  if (process.env.PRODUCT_SHEET_TEST_PDF) await (await import("node:fs/promises")).writeFile(process.env.PRODUCT_SHEET_TEST_PDF, pdfBytes);
  const pdf = pdfBytes.toString("latin1");
  assert.match(pdf, /\/Subtype \/Image/);
  assert.match(pdf, /\/Logo Do/);
});
