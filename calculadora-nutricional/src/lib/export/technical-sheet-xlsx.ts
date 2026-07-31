import ExcelJS from "exceljs";

import type { MemorialDocumentData, MemorialSpecificationRow } from "@/lib/export/memorial-pdf";

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
    sheet.eachRow((row) => row.eachCell((cell) => {
        cell.font = { name: "Aptos", size: 10, color: { argb: COLORS.ink } };
        cell.alignment = { vertical: "top", wrapText: true };
    }));
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

function section(sheet: ExcelJS.Worksheet, rowNumber: number, value: string, lastColumn: number) {
    sheet.mergeCells(rowNumber, 1, rowNumber, lastColumn);
    const cell = sheet.getCell(rowNumber, 1);
    cell.value = value;
    cell.font = { name: "Aptos", size: 11, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.darkNavy } };
    cell.alignment = { vertical: "middle" };
    sheet.getRow(rowNumber).height = 23;
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

function specTable(sheet: ExcelJS.Worksheet, rows: MemorialSpecificationRow[]) {
    header(sheet.addRow(["Parâmetro", "Especificação / limite", "Método"]));
    const displayRows = rows.length > 0 ? rows : [{ parameter: "", specification: "", method: "" }];
    displayRows.forEach((row, index) => {
        const added = sheet.addRow([text(row.parameter), text(row.specification), text(row.method)]);
        bodyBorder(added, index % 2 === 1);
    });
}

function valueByLabel(data: MemorialDocumentData, label: string) {
    return data.values.find((value) => value.label === label);
}

function nutritionRows(sheet: ExcelJS.Worksheet, data: MemorialDocumentData) {
    header(sheet.addRow(["Nutriente", "Unidade", "100 g/ml", "Porção", "%VD*"]));
    data.values.forEach((value, index) => {
        const row = sheet.addRow([
            value.label,
            value.unit,
            formatNumber(value.per100),
            formatNumber(value.perPortion),
            value.dailyValuePercent || "-",
        ]);
        bodyBorder(row, index % 2 === 1);
    });
}

function addFooter(sheet: ExcelJS.Worksheet, lastColumn: number) {
    sheet.headerFooter.oddFooter = "&C Soul Easy • exportação técnica &R Página &P de &N";
    sheet.pageSetup = {
        orientation: "portrait",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        horizontalDpi: 300,
        verticalDpi: 300,
        paperSize: 9,
    };
    sheet.pageSetup.printArea = `A1:${String.fromCharCode(64 + lastColumn)}${sheet.rowCount}`;
}

export async function createTechnicalSheetXlsx(data: MemorialDocumentData) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Soul Easy";
    workbook.title = "Ficha Técnica de Produto Acabado";
    workbook.subject = "Ficha técnica e informação nutricional consolidada";
    workbook.created = data.generatedAt;

    const sheet = workbook.addWorksheet("Ficha Técnica");
    setupSheet(sheet, [34, 22, 22, 22, 22]);
    title(sheet, "SO IZI  |  FICHA TÉCNICA DE PRODUTO ACABADO", 5);
    let row = 3;
    section(sheet, row++, "01 • IDENTIFICAÇÃO DO PRODUTO", 5);
    keyValueRows(sheet, [
        ["Título do produto", text(data.title)],
        ["Código", text(data.technical.code)],
        ["Revisão", text(data.technical.revision)],
        ["Data", text(data.technical.issueDate)],
        ["Identificação do documento", text(data.technical.documentId)],
        ["Marca", text(data.technical.brand)],
        ["EAN / GTIN", text(data.technical.eanGtin)],
        ["Categoria do produto", text(data.technical.category)],
    ]);
    row = sheet.rowCount + 2;

    section(sheet, row++, "02 • INFORMAÇÕES DO PRODUTO", 5);
    keyValueRows(sheet, [
        ["Peso líquido / conteúdo", text(data.netContent)],
        ["Designação", text(data.technical.designation)],
        ["Descrição", text(data.technical.description)],
        ["Ingredientes", text(data.technical.ingredients)],
        ["Uso recomendado", text(data.technical.recommendedUse)],
    ]);
    row = sheet.rowCount + 2;

    section(sheet, row++, "03 • CARACTERÍSTICAS FÍSICO-QUÍMICAS", 5);
    sheet.mergeCells(row, 1, row, 5);
    sheet.getCell(row, 1).value = "Parâmetro, especificação e método";
    sheet.getCell(row, 1).font = { italic: true, color: { argb: COLORS.muted } };
    row++;
    specTable(sheet, data.technical.physicochemical.rows);
    row = sheet.rowCount + 2;

    section(sheet, row++, "04 • CARACTERÍSTICAS MICROBIOLÓGICAS", 5);
    sheet.mergeCells(row, 1, row, 5);
    sheet.getCell(row, 1).value = text(data.technical.microbiological.legislation);
    sheet.getCell(row, 1).font = { italic: true, color: { argb: COLORS.muted } };
    row++;
    specTable(sheet, data.technical.microbiological.rows);
    row = sheet.rowCount + 2;

    section(sheet, row++, "05 • CONTAMINANTES", 5);
    sheet.mergeCells(row, 1, row, 5);
    sheet.getCell(row, 1).value = text(data.technical.contaminants.legislation);
    sheet.getCell(row, 1).font = { italic: true, color: { argb: COLORS.muted } };
    row++;
    specTable(sheet, data.technical.contaminants.rows);
    row = sheet.rowCount + 2;

    section(sheet, row++, "06 • MATÉRIAS ESTRANHAS", 5);
    sheet.mergeCells(row, 1, row, 5);
    sheet.getCell(row, 1).value = text(data.technical.foreignMatter.legislation);
    sheet.getCell(row, 1).font = { italic: true, color: { argb: COLORS.muted } };
    row++;
    specTable(sheet, data.technical.foreignMatter.rows);
    row = sheet.rowCount + 2;

    section(sheet, row++, "07 • INFORMAÇÃO NUTRICIONAL", 5);
    keyValueRows(sheet, [
        ["Porções por embalagem", text(data.servingsPerPackage)],
        ["Porção", `${formatNumber(data.portionSize)} ${data.portionUnit || "g"}`],
        ["Medida caseira", text(data.householdMeasure)],
    ]);
    nutritionRows(sheet, data);
    sheet.addRow(["* Percentual de valores diários fornecidos pela porção."]);
    row = sheet.rowCount + 2;

    section(sheet, row++, "08 • APRESENTAÇÃO E LOGÍSTICA", 5);
    keyValueRows(sheet, [
        ["Apresentação", text(data.technical.presentation)],
        ["Validade", text(data.technical.validity)],
        ["Armazenamento", text(data.technical.storage)],
        ["Tipo de embalagem", text(data.technical.packaging)],
        ["Características de paletização", text(data.technical.palletization)],
    ]);
    row = sheet.rowCount + 2;

    section(sheet, row++, "09 • HISTÓRICO DE REVISÕES", 5);
    header(sheet.addRow(["Revisão", "Data", "Descrição", "Responsável", ""]));
    const revisions = data.technical.revisions.length > 0
        ? data.technical.revisions
        : [{ revision: "", date: "", description: "", responsible: "" }];
    revisions.forEach((revision, index) => {
        const revisionRow = sheet.addRow([
            text(revision.revision),
            text(revision.date),
            text(revision.description),
            text(revision.responsible),
            "",
        ]);
        bodyBorder(revisionRow, index % 2 === 1);
    });
    row = sheet.rowCount + 2;

    section(sheet, row++, "10 • ELABORADO E APROVADO POR", 5);
    keyValueRows(sheet, [
        ["Elaborado por — nome", text(data.technical.preparedBy.name)],
        ["Elaborado por — cargo", text(data.technical.preparedBy.role)],
        ["Elaborado por — data", text(data.technical.preparedBy.date)],
        ["Elaborado por — assinatura", text(data.technical.preparedBy.signature)],
        ["Aprovado por — nome", text(data.technical.approvedBy.name)],
        ["Aprovado por — cargo", text(data.technical.approvedBy.role)],
        ["Aprovado por — data", text(data.technical.approvedBy.date)],
        ["Aprovado por — assinatura", text(data.technical.approvedBy.signature)],
    ]);
    addFooter(sheet, 5);

    const system = workbook.addWorksheet("Dados do Sistema");
    setupSheet(system, [34, 24, 24, 14]);
    title(system, "DADOS DO SISTEMA  |  VALORES CONSOLIDADOS", 4);
    const systemHeader = system.addRow(["CAMPO", "100 g / DADO", "PORÇÃO", "%VD"]);
    header(systemHeader);
    const rows = [
        ["Título do produto", data.title, "", ""],
        ["Código", data.technical.code, "", ""],
        ["Peso líquido / conteúdo", data.netContent, "", ""],
        ["Marca", data.technical.brand, "", ""],
        ["EAN / GTIN", data.technical.eanGtin, "", ""],
        ["Categoria do produto", data.technical.category, "", ""],
        ["Designação", data.technical.designation, "", ""],
        ["Descrição", data.technical.description, "", ""],
        ["Ingredientes", data.technical.ingredients, "", ""],
        ["Uso recomendado", data.technical.recommendedUse, "", ""],
        ...[
            "Valor energético",
            "Carboidratos",
            "Açúcares totais",
            "Açúcares adicionados",
            "Proteínas",
            "Gorduras totais",
            "Gorduras saturadas",
            "Gorduras trans",
            "Fibras alimentares",
            "Sódio",
        ].map((label) => {
            const value = valueByLabel(data, label);
            return [label, value ? formatNumber(value.per100) : "0", value ? formatNumber(value.perPortion) : "0", value?.dailyValuePercent || "-"];
        }),
    ];
    rows.forEach((values, index) => bodyBorder(system.addRow(values), index % 2 === 1));
    addFooter(system, 4);

    const result = await workbook.xlsx.writeBuffer();
    return new Uint8Array(result);
}
