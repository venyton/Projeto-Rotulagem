import ExcelJS from "exceljs";

import { MEMORIAL_CORE_NUTRIENTS } from "@/features/tables/domain/memorial";
import type { MemorialDocumentData } from "@/lib/export/memorial-pdf";

const COLORS = {
    navy: "0136A7",
    darkNavy: "082F5B",
    cyan: "04B2F5",
    lime: "78D11C",
    amber: "F4B900",
    paleBlue: "EEF8FD",
    paleNavy: "F1F5FB",
    border: "D9E4EC",
    white: "FFFFFF",
    ink: "17324D",
    muted: "5F7184",
};

const MISSING = "Não informado no cadastro";

function text(value: string) {
    return value.trim() || MISSING;
}

function formatNumber(value: number) {
    if (!Number.isFinite(value) || Math.abs(value) < 0.0000005) return "0";
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 6 }).format(value);
}

function setupSheet(sheet: ExcelJS.Worksheet, widths: number[]) {
    sheet.views = [{ showGridLines: false }];
    sheet.columns = widths.map((width) => ({ width }));
    sheet.properties.defaultRowHeight = 18;
}

function title(sheet: ExcelJS.Worksheet, value: string, lastColumn: number) {
    sheet.mergeCells(1, 1, 1, lastColumn);
    const cell = sheet.getCell(1, 1);
    cell.value = value;
    cell.font = { name: "Aptos Display", size: 18, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    sheet.getRow(1).height = 30;
}

function section(sheet: ExcelJS.Worksheet, value: string, lastColumn: number) {
    sheet.mergeCells(sheet.rowCount + 1, 1, sheet.rowCount + 1, lastColumn);
    const cell = sheet.getCell(sheet.rowCount, 1);
    cell.value = value;
    cell.font = { name: "Aptos", size: 11, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.darkNavy } };
    cell.alignment = { vertical: "middle" };
    sheet.getRow(sheet.rowCount).height = 23;
}

function header(row: ExcelJS.Row) {
    row.font = { name: "Aptos", size: 10, bold: true, color: { argb: COLORS.white } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } };
    row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    row.height = 30;
    row.eachCell((cell) => {
        cell.border = {
            top: { style: "thin", color: { argb: COLORS.border } },
            left: { style: "thin", color: { argb: COLORS.border } },
            bottom: { style: "thin", color: { argb: COLORS.border } },
            right: { style: "thin", color: { argb: COLORS.border } },
        };
    });
}

function bodyBorder(row: ExcelJS.Row, alternate = false) {
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: alternate ? COLORS.paleNavy : COLORS.white } };
    row.alignment = { vertical: "top", wrapText: true };
    row.eachCell((cell) => {
        cell.border = {
            top: { style: "thin", color: { argb: COLORS.border } },
            left: { style: "thin", color: { argb: COLORS.border } },
            bottom: { style: "thin", color: { argb: COLORS.border } },
            right: { style: "thin", color: { argb: COLORS.border } },
        };
    });
}

function keyValueRows(sheet: ExcelJS.Worksheet, rows: Array<[string, string]>) {
    for (const [label, value] of rows) {
        const row = sheet.addRow([label, value]);
        row.getCell(1).font = { name: "Aptos", size: 10, bold: true, color: { argb: COLORS.darkNavy } };
        bodyBorder(row, row.number % 2 === 0);
    }
}

function addFooter(sheet: ExcelJS.Worksheet, lastColumn: number) {
    sheet.headerFooter.oddFooter = "&C Soul Easy • memorial de cálculo &R Página &P de &N";
    sheet.pageSetup = {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
    };
    sheet.pageSetup.printArea = `A1:${String.fromCharCode(64 + lastColumn)}${sheet.rowCount}`;
}

function addNutritionTable(sheet: ExcelJS.Worksheet, data: MemorialDocumentData) {
    header(sheet.addRow(["Nutriente", "Un.", "Receita total", "Por 100 g/ml", "Porção", "%VD*"]));
    data.values.forEach((value, index) => {
        const row = sheet.addRow([
            value.label,
            value.unit,
            formatNumber(value.totalRecipe),
            formatNumber(value.per100),
            formatNumber(value.perPortion),
            value.dailyValuePercent || "-",
        ]);
        bodyBorder(row, index % 2 === 1);
    });
}

export async function createMemorialXlsx(data: MemorialDocumentData) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Soul Easy";
    workbook.title = "Memorial de Cálculo Nutricional";
    workbook.subject = "Memorial de cálculo e rastreabilidade nutricional";
    workbook.created = data.generatedAt;

    const sheet = workbook.addWorksheet("Memorial de Cálculo");
    setupSheet(sheet, [14, 28, 22, 24, 20, 20, 22]);
    title(sheet, "SO IZI  |  MEMORIAL DE CÁLCULO NUTRICIONAL", 7);

    section(sheet, "01 • IDENTIFICAÇÃO DO PRODUTO", 7);
    keyValueRows(sheet, [
        ["Produto", text(data.title)],
        ["Código", text(data.technical.code)],
        ["Revisão", text(data.technical.revision)],
        ["Data de emissão", text(data.technical.issueDate)],
        ["Identificação do documento", text(data.technical.documentId)],
        ["Versão da formulação", text(data.calculationVersion || "")],
        ["Categoria regulatória", text(data.regulatoryCategory)],
        ["Grupo populacional", text(data.populationGroup)],
        ["Base de cálculo", `100 ${data.portionUnit || "g"} e porção`],
    ]);

    section(sheet, "02 • PARÂMETROS UTILIZADOS", 7);
    keyValueRows(sheet, [
        ["Porção declarada", `${formatNumber(data.portionSize)} ${data.portionUnit || "g"}`],
        ["Medida caseira", text(data.householdMeasure)],
        ["Conteúdo da embalagem", text(data.netContent)],
        ["Porções por embalagem", text(data.servingsPerPackage)],
        ["Massa total considerada", `${formatNumber(data.totalWeight)} ${data.portionUnit || "g"}`],
        ["Data de geração", data.generatedAt.toLocaleString("pt-BR")],
        ["Responsável pela geração", text(data.preparedBy || "")],
    ]);

    section(sheet, "03 • COMPOSIÇÃO DA FORMULAÇÃO E CONTRIBUIÇÃO NUTRICIONAL", 7);
    header(sheet.addRow(["Nº", "Ingrediente", "Quantidade", "Qtd. na formulação (%)", "Função", "Fonte na formulação", ""]));
    data.components.forEach((component, index) => {
        const row = sheet.addRow([
            index + 1,
            component.name,
            `${formatNumber(component.quantity)} g`,
            `${formatNumber(component.percentage)}%`,
            text(component.function),
            component.source,
            "",
            "",
        ]);
        bodyBorder(row, index % 2 === 1);
    });

    section(sheet, "04 • CONTRIBUIÇÃO DETALHADA POR COMPONENTE", 7);
    for (const component of data.components) {
        const componentRow = sheet.addRow([component.name, `Fonte: ${component.source}`, `Quantidade: ${formatNumber(component.quantity)} g`, `Percentual: ${formatNumber(component.percentage)}%`]);
        componentRow.font = { name: "Aptos", size: 10, bold: true, color: { argb: COLORS.darkNavy } };
        componentRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paleBlue } };
        header(sheet.addRow(["Nutriente", "Un.", "Composição / 100 g", "Contribuição / 100 g", "Contribuição / porção", "", ""]));
        component.composition.forEach((item, index) => {
            const row = sheet.addRow([
                item.label,
                item.unit,
                formatNumber(item.value),
                formatNumber(component.contributionPer100[index]?.value || 0),
                formatNumber(component.contributionPerPortion[index]?.value || 0),
                "",
                "",
            ]);
            bodyBorder(row, index % 2 === 1);
        });
    }

    section(sheet, "05 • CONTRIBUIÇÃO DE VITAMINAS E MINERAIS", 7);
    header(sheet.addRow(["Nutriente", "Un.", "Fonte na formulação", "Teor da fonte / 100 g", "Qtd. da fonte / formulação", "Contribuição / 100 g", "Contribuição / porção"]));
    const coreLabels = new Set(MEMORIAL_CORE_NUTRIENTS.map((item) => item.label));
    const microRows = data.components.flatMap((component) => component.composition.flatMap((item, index) => {
        if (coreLabels.has(item.label)) return [];
        return [[
            item.label,
            item.unit,
            component.name,
            formatNumber(item.value),
            `${formatNumber(component.percentage)}%`,
            formatNumber(component.contributionPer100[index]?.value || 0),
            formatNumber(component.contributionPerPortion[index]?.value || 0),
        ]];
    }));
    (microRows.length > 0 ? microRows : [[MISSING, "-", MISSING, "0", "0%", "0", "0"]]).forEach((values, index) => bodyBorder(sheet.addRow(values), index % 2 === 1));

    section(sheet, "06 • RESULTADOS NUTRICIONAIS TOTAIS", 7);
    addNutritionTable(sheet, data);

    section(sheet, "07 • OBSERVAÇÕES E CRITÉRIOS DE EMISSÃO", 7);
    keyValueRows(sheet, [
        ["Formulação consolidada", `${formatNumber(data.verification.formulationPercent)}% — ${data.verification.formulationStatus}`],
        ["Energia somada dos componentes / 100 g", `${formatNumber(data.verification.energySummedPer100)} kcal`],
        ["Energia estimada pela composição / 100 g", `${formatNumber(data.verification.energyEstimatedPer100)} kcal`],
        ["Diferença entre energias", `${formatNumber(data.verification.energyDifferencePercent)}% — ${data.verification.energyStatus}`],
        ["Arredondamento", "O cálculo bruto é preservado; a apresentação regulatória é aplicada na tabela nutricional final."],
        ["Exportação", "PDF e XLSX com layout fixo, cabeçalho, páginas numeradas e rodapé Soul Easy."],
    ]);
    addFooter(sheet, 7);

    const result = await workbook.xlsx.writeBuffer();
    return new Uint8Array(result);
}
