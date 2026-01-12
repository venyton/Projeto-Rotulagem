import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { CalculatedNutrients } from "@/lib/nutrients";
import { roundEnergy, roundMacro, roundSodium, roundSugars, roundSaturatedTrans, calculateVD } from "@/lib/anvisa";
import { VDR, POPULATION_GROUPS } from "@/lib/constants";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        // body includes: title, per100g, perPortion, portionSize, householdMeasure, popGroup, isSupplement
        const { title, isSupplement } = body;

        const workbook = new ExcelJS.Workbook();

        // 1. Suplemento (Conditional, First)
        if (isSupplement) {
            const sheet = workbook.addWorksheet("Suplemento");
            generateSupplement(sheet, body);
        }

        // 2. Vertical
        const sheetVert = workbook.addWorksheet("Vertical");
        generateVertical(sheetVert, body);

        // 3. Vertical Quebrado
        const sheetVertBroken = workbook.addWorksheet("Vertical Quebrado");
        generateVerticalBroken(sheetVertBroken, body);

        // 4. Horizontal
        const sheetHoriz = workbook.addWorksheet("Horizontal");
        generateHorizontal(sheetHoriz, body);

        // 5. Linear
        const sheetLinear = workbook.addWorksheet("Linear");
        generateLinear(sheetLinear, body);

        // 6. 100g (Standard vertical but ensure 100g is clear)
        const sheet100g = workbook.addWorksheet("100g");
        generateVertical(sheet100g, body); // Reusing Vertical as it is the standard 100g+Portion table

        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="tabela-${(title || 'nutricional').replace(/\s/g, '_')}.xlsx"`
            }
        });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to generate Excel" }, { status: 500 });
    }
}

// --- Layout Generators ---

// Common Styles
const FONT_ARIAL = { name: 'Arial', size: 10 };
const FONT_BOLD = { name: 'Arial', size: 10, bold: true };
const FONT_TITLE = { name: 'Arial', size: 12, bold: true };
const BORDER_THICK = { style: 'medium' as const, color: { argb: 'FF000000' } };
const BORDER_THIN = { style: 'thin' as const, color: { argb: 'FF000000' } };

// Helpers
function getHelpers(popGroup: any) {
    const vdrObj = (VDR as any)[popGroup] || VDR[POPULATION_GROUPS.ADULTS];
    const getVD = (val: number, ref: number | null) => calculateVD(val, ref);
    return { vdrObj, getVD };
}

// --- 1. Vertical (Standard - RDC 429/2020 Model) ---
function generateVertical(sheet: ExcelJS.Worksheet, data: any) {
    const { per100g, perPortion, portionSize, householdMeasure, popGroup } = data;
    const { vdrObj, getVD } = getHelpers(popGroup);

    sheet.columns = [{ width: 35 }, { width: 12 }, { width: 12 }, { width: 8 }];
    let r = 1;

    // Title: INFORMAÇÃO NUTRICIONAL
    sheet.mergeCells(`A${r}:D${r}`);
    const t = sheet.getCell(`A${r}`);
    t.value = "INFORMAÇÃO NUTRICIONAL";
    t.font = FONT_TITLE;
    t.alignment = { horizontal: 'center', vertical: 'middle' };
    t.border = { top: BORDER_THICK, bottom: BORDER_THICK, left: BORDER_THICK, right: BORDER_THICK };
    r++;

    // Porções por embalagem
    sheet.mergeCells(`A${r}:D${r}`);
    const serv = sheet.getCell(`A${r}`);
    serv.value = "Porções por embalagem: Cerca de ...";
    serv.font = FONT_ARIAL;
    serv.alignment = { horizontal: 'left', vertical: 'middle' };
    serv.border = { left: BORDER_THICK, right: BORDER_THICK };
    r++;

    // Portion Row
    sheet.mergeCells(`A${r}:D${r}`);
    const p = sheet.getCell(`A${r}`);
    p.value = `Porção: ${portionSize} g (${householdMeasure})`;
    p.font = FONT_ARIAL;
    p.alignment = { horizontal: 'left', vertical: 'middle' };
    p.border = { left: BORDER_THICK, right: BORDER_THICK, bottom: BORDER_THICK };
    r++;

    // Header Row: | | 100 g | [portion] g | %VD* |
    const row = sheet.getRow(r);
    row.values = ["", "100 g", `${portionSize} g`, "%VD*"];

    // Cell A: empty
    const c1 = row.getCell(1);
    c1.border = { left: BORDER_THICK, right: BORDER_THIN, bottom: BORDER_THICK }; // Open? Usually grid is closed.

    row.eachCell((c, i) => {
        c.font = FONT_BOLD;
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = {
            bottom: BORDER_THICK,
            top: BORDER_THICK, // Explicit top to match portion bottom?
            left: i === 1 ? BORDER_THICK : BORDER_THIN,
            right: i === 4 ? BORDER_THICK : BORDER_THIN
        };
    });
    r++;

    const addRow = (label: string, v100: string, vPortion: string, vd: string, bold = false, indent = false) => {
        const row = sheet.getRow(r);
        row.values = [label, v100, vPortion, vd];

        // Col 1: Label
        const c1 = row.getCell(1);
        c1.font = bold ? FONT_BOLD : FONT_ARIAL;
        c1.alignment = { indent: indent ? 2 : 0, vertical: 'middle' };
        c1.border = { left: BORDER_THICK, bottom: BORDER_THIN, right: BORDER_THIN };

        // Col 2,3,4: Values
        [2, 3, 4].forEach(idx => {
            const c = row.getCell(idx);
            c.font = (bold && idx !== 4) ? FONT_BOLD : FONT_ARIAL;
            c.alignment = { horizontal: 'center', vertical: 'middle' };
            c.border = { bottom: BORDER_THIN, right: idx === 4 ? BORDER_THICK : BORDER_THIN, left: BORDER_THIN };
        });

        row.getCell(4).font = { ...FONT_BOLD, size: 9 };
        r++;
    };

    addRow("Valor energético (kcal)", roundEnergy(per100g.energy), roundEnergy(perPortion.energy), getVD(perPortion.energy, vdrObj.energy), false);
    addRow("Carboidratos (g)", roundMacro(per100g.carbs), roundMacro(perPortion.carbs), getVD(perPortion.carbs, vdrObj.carbs), false);
    addRow("Açúcares totais (g)", roundSugars(per100g.sugarTotal), roundSugars(perPortion.sugarTotal), "", false, true);
    addRow("Açúcares adicionados (g)", roundSugars(per100g.sugarAdded), roundSugars(perPortion.sugarAdded), "", false, true);
    addRow("Proteínas (g)", roundMacro(per100g.protein), roundMacro(perPortion.protein), getVD(perPortion.protein, vdrObj.protein), false);
    addRow("Gorduras totais (g)", roundMacro(per100g.fatTotal), roundMacro(perPortion.fatTotal), getVD(perPortion.fatTotal, vdrObj.fatTotal), false);
    addRow("Gorduras saturadas (g)", roundSaturatedTrans(per100g.fatSat), roundSaturatedTrans(perPortion.fatSat), getVD(perPortion.fatSat, vdrObj.fatSat), false, true);
    addRow("Gorduras trans (g)", roundSaturatedTrans(per100g.fatTrans), roundSaturatedTrans(perPortion.fatTrans), "", false, true);
    addRow("Fibras alimentares (g)", roundMacro(per100g.fiber), roundMacro(perPortion.fiber), getVD(perPortion.fiber, vdrObj.fiber), false);
    addRow("Sódio (mg)", roundSodium(per100g.sodium), roundSodium(perPortion.sodium), getVD(perPortion.sodium, vdrObj.sodium), false);

    // Footer Borders Adjustment (Last row bottom thick)
    const lastDataRow = r - 1;
    [1, 2, 3, 4].forEach(c => {
        const cell = sheet.getCell(lastDataRow, c);
        cell.border = { ...cell.border, bottom: BORDER_THICK };
    });

    // Footer Note
    sheet.mergeCells(`A${r}:D${r}`);
    const f = sheet.getCell(`A${r}`);
    f.value = "*Percentual de valores diários fornecidos pela porção.";
    f.font = { name: 'Arial', size: 8 };
    f.border = { top: BORDER_THICK, bottom: BORDER_THICK, left: BORDER_THICK, right: BORDER_THICK };
}

// --- 2. Vertical Quebrado (Split Model) ---
function generateVerticalBroken(sheet: ExcelJS.Worksheet, data: any) {
    const { per100g, perPortion, portionSize, householdMeasure, popGroup } = data;
    const { vdrObj, getVD } = getHelpers(popGroup);

    // 6 Columns: | Item | 100g | Port | %VD | Item | 100g | Port | %VD | -- Too wide?
    // ANVISA "Quebrado" usually splits rows. 
    // Left: Energy, Carbs, Sugars, Protein. Right: Fats, Fibers, Sodium.
    // Let's implement 2 columns of DATA blocks.

    // Layout: 
    // INFORMAÇÃO NUTRICIONAL (Merged)
    // Porções... (Merged)
    // Porção... (Merged)
    // | Header Left | | | | Header Right | | |

    sheet.columns = [
        { width: 25 }, { width: 8 }, { width: 8 }, { width: 6 }, // Left Block
        { width: 25 }, { width: 8 }, { width: 8 }, { width: 6 }  // Right Block
    ];

    let r = 1;

    // Title & Info
    sheet.mergeCells(`A${r}:H${r}`);
    const t = sheet.getCell(`A${r}`);
    t.value = "INFORMAÇÃO NUTRICIONAL";
    t.font = FONT_TITLE;
    t.alignment = { horizontal: 'center' };
    t.border = { top: BORDER_THICK, bottom: BORDER_THICK, left: BORDER_THICK, right: BORDER_THICK };
    r++;

    sheet.mergeCells(`A${r}:H${r}`);
    const serv = sheet.getCell(`A${r}`);
    serv.value = "Porções por embalagem: Cerca de ...";
    serv.font = FONT_ARIAL;
    serv.alignment = { horizontal: 'left' };
    serv.border = { left: BORDER_THICK, right: BORDER_THICK };
    r++;

    sheet.mergeCells(`A${r}:H${r}`);
    const p = sheet.getCell(`A${r}`);
    p.value = `Porção: ${portionSize} g (${householdMeasure})`;
    p.font = FONT_ARIAL;
    p.alignment = { horizontal: 'left' };
    p.border = { left: BORDER_THICK, right: BORDER_THICK, bottom: BORDER_THICK };
    r++;

    // Headers
    const row = sheet.getRow(r);
    // Duplicate headers for left and right
    const headers = ["", "100 g", `${portionSize} g`, "%VD*", "", "100 g", `${portionSize} g`, "%VD*"];
    row.values = headers;

    row.eachCell((c, i) => {
        c.font = FONT_BOLD;
        c.alignment = { horizontal: 'center' };
        c.border = {
            bottom: BORDER_THICK,
            top: BORDER_THICK,
            left: (i === 1 || i === 5) ? BORDER_THICK : BORDER_THIN,
            right: (i === 4 || i === 8) ? BORDER_THICK : BORDER_THIN
        };
    });
    r++;

    const items = [
        { l: "Valor energético (kcal)", v100: roundEnergy(per100g.energy), vP: roundEnergy(perPortion.energy), vd: getVD(perPortion.energy, vdrObj.energy) },
        { l: "Carboidratos (g)", v100: roundMacro(per100g.carbs), vP: roundMacro(perPortion.carbs), vd: getVD(perPortion.carbs, vdrObj.carbs) },
        { l: "Açúcares totais (g)", v100: roundSugars(per100g.sugarTotal), vP: roundSugars(perPortion.sugarTotal), vd: "", indent: true },
        { l: "Açúcares adic. (g)", v100: roundSugars(per100g.sugarAdded), vP: roundSugars(perPortion.sugarAdded), vd: "", indent: true },
        { l: "Proteínas (g)", v100: roundMacro(per100g.protein), vP: roundMacro(perPortion.protein), vd: getVD(perPortion.protein, vdrObj.protein) },
        { l: "Gorduras totais (g)", v100: roundMacro(per100g.fatTotal), vP: roundMacro(perPortion.fatTotal), vd: getVD(perPortion.fatTotal, vdrObj.fatTotal) },
        { l: "Gord. saturadas (g)", v100: roundSaturatedTrans(per100g.fatSat), vP: roundSaturatedTrans(perPortion.fatSat), vd: getVD(perPortion.fatSat, vdrObj.fatSat), indent: true },
        { l: "Gorduras trans (g)", v100: roundSaturatedTrans(per100g.fatTrans), vP: roundSaturatedTrans(perPortion.fatTrans), vd: "", indent: true },
        { l: "Fibras alim. (g)", v100: roundMacro(per100g.fiber), vP: roundMacro(perPortion.fiber), vd: getVD(perPortion.fiber, vdrObj.fiber) },
        { l: "Sódio (mg)", v100: roundSodium(per100g.sodium), vP: roundSodium(perPortion.sodium), vd: getVD(perPortion.sodium, vdrObj.sodium) },
    ];

    // Split items: 5 on left, 5 on right
    const half = Math.ceil(items.length / 2);
    // Actually, ANVISA 429 permits flow. Let's do straight split.
    // 10 items -> 5 rows.

    for (let i = 0; i < 5; i++) {
        const row = sheet.getRow(r);
        const L = items[i]; // 0-4
        const R = items[i + 5]; // 5-9

        // Prepare values array
        const vals = [
            L?.l || "", L?.v100 || "", L?.vP || "", L?.vd || "",
            R?.l || "", R?.v100 || "", R?.vP || "", R?.vd || ""
        ];
        row.values = vals;

        // Styles Left
        if (L) {
            row.getCell(1).alignment = { indent: L.indent ? 2 : 0 };
            row.getCell(4).font = { ...FONT_BOLD, size: 9 };
        }
        // Styles Right
        if (R) {
            row.getCell(5).alignment = { indent: R.indent ? 2 : 0 };
            row.getCell(8).font = { ...FONT_BOLD, size: 9 };
        }

        // Borders
        [1, 2, 3, 4, 5, 6, 7, 8].forEach(idx => {
            const c = row.getCell(idx);
            c.border = { bottom: BORDER_THIN, top: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN };
            if (idx === 1 || idx === 5) c.border.left = BORDER_THICK;
            if (idx === 4 || idx === 8) c.border.right = BORDER_THICK;
        });
        r++;
    }

    // Footer bottom thick
    [1, 2, 3, 4, 5, 6, 7, 8].forEach(idx => {
        sheet.getCell(r - 1, idx).border.bottom = BORDER_THICK;
    });

    sheet.mergeCells(`A${r}:H${r}`);
    const f = sheet.getCell(`A${r}`);
    f.value = "*Percentual de valores diários fornecidos pela porção.";
    f.font = { name: 'Arial', size: 8 };
    f.border = { top: BORDER_THICK, bottom: BORDER_THICK, left: BORDER_THICK, right: BORDER_THICK };
}

// --- 3. Horizontal (Row Model) ---
function generateHorizontal(sheet: ExcelJS.Worksheet, data: any) {
    const { per100g, perPortion, portionSize, householdMeasure, popGroup } = data;
    const { vdrObj, getVD } = getHelpers(popGroup);

    // Horizontal usually implies nutrients are columns.
    // Row 1: Title
    // Row 2: Portions
    // Row 3: Headers (Item, Ener, Carb...)
    // Row 4: 100g values
    // Row 5: Portion values
    // Row 6: %VD

    // Items
    const nutrientLabels = [
        "Valor Energético", "Carboidratos", "Açúcares Totais", "Açúcares Adic.",
        "Proteínas", "Gorduras Totais", "Gord. Saturadas", "Gord. Trans",
        "Fibra Alimentar", "Sódio"
    ];

    sheet.columns = [{ width: 25 }, ...nutrientLabels.map(() => ({ width: 12 }))];
    let r = 1;
    const totalCols = nutrientLabels.length + 1; // 11 cols

    // Title
    sheet.mergeCells(1, 1, 1, totalCols);
    const t = sheet.getCell(1, 1);
    t.value = "INFORMAÇÃO NUTRICIONAL";
    t.font = FONT_TITLE;
    t.alignment = { horizontal: 'center' };
    t.border = { top: BORDER_THICK, bottom: BORDER_THICK, left: BORDER_THICK, right: BORDER_THICK };
    r++;

    // Portion
    sheet.mergeCells(2, 1, 2, totalCols);
    const p = sheet.getCell(2, 1);
    p.value = `Porções por embalagem: ... | Porção: ${portionSize} g (${householdMeasure})`;
    p.font = FONT_ARIAL;
    p.alignment = { horizontal: 'center' };
    p.border = { left: BORDER_THICK, right: BORDER_THICK, bottom: BORDER_THICK };
    r++;

    // Headers
    const rowH = sheet.getRow(r);
    rowH.values = ["", ...nutrientLabels];
    rowH.eachCell((c, i) => {
        c.font = { ...FONT_BOLD, size: 9 };
        c.alignment = { horizontal: 'center', wrapText: true };
        c.border = {
            bottom: BORDER_THICK,
            left: i === 1 ? BORDER_THICK : BORDER_THIN,
            right: i === totalCols ? BORDER_THICK : BORDER_THIN
        };
    });
    r++;

    // 100g Row
    const row100 = sheet.getRow(r);
    const h100 = [
        "100 g",
        roundEnergy(per100g.energy) + " kcal",
        roundMacro(per100g.carbs) + " g",
        roundSugars(per100g.sugarTotal) + " g",
        roundSugars(per100g.sugarAdded) + " g",
        roundMacro(per100g.protein) + " g",
        roundMacro(per100g.fatTotal) + " g",
        roundSaturatedTrans(per100g.fatSat) + " g",
        roundSaturatedTrans(per100g.fatTrans) + " g",
        roundMacro(per100g.fiber) + " g",
        roundSodium(per100g.sodium) + " mg"
    ];
    row100.values = h100;
    row100.eachCell((c, i) => {
        c.alignment = { horizontal: 'center' };
        c.border = { left: i === 1 ? BORDER_THICK : BORDER_THIN, right: i === totalCols ? BORDER_THICK : BORDER_THIN, bottom: BORDER_THIN };
        if (i === 1) c.font = FONT_BOLD;
    });
    r++;

    // Portion Row
    const rowP = sheet.getRow(r);
    const hP = [
        `${portionSize} g`,
        roundEnergy(perPortion.energy) + " kcal",
        roundMacro(perPortion.carbs) + " g",
        roundSugars(perPortion.sugarTotal) + " g",
        roundSugars(perPortion.sugarAdded) + " g",
        roundMacro(perPortion.protein) + " g",
        roundMacro(perPortion.fatTotal) + " g",
        roundSaturatedTrans(perPortion.fatSat) + " g",
        roundSaturatedTrans(perPortion.fatTrans) + " g",
        roundMacro(perPortion.fiber) + " g",
        roundSodium(perPortion.sodium) + " mg"
    ];
    rowP.values = hP;
    rowP.eachCell((c, i) => {
        c.alignment = { horizontal: 'center' };
        c.border = { left: i === 1 ? BORDER_THICK : BORDER_THIN, right: i === totalCols ? BORDER_THICK : BORDER_THIN, bottom: BORDER_THIN };
        if (i === 1) c.font = FONT_BOLD;
    });
    r++;

    // VD Row
    const rowVD = sheet.getRow(r);
    const hVD = [
        "%VD*",
        getVD(perPortion.energy, vdrObj.energy),
        getVD(perPortion.carbs, vdrObj.carbs),
        "",
        "",
        getVD(perPortion.protein, vdrObj.protein),
        getVD(perPortion.fatTotal, vdrObj.fatTotal),
        getVD(perPortion.fatSat, vdrObj.fatSat),
        "",
        getVD(perPortion.fiber, vdrObj.fiber),
        getVD(perPortion.sodium, vdrObj.sodium),
    ];
    rowVD.values = hVD;
    rowVD.eachCell((c, i) => {
        c.alignment = { horizontal: 'center' };
        c.font = { ...FONT_BOLD, size: 9 };
        c.border = { left: i === 1 ? BORDER_THICK : BORDER_THIN, right: i === totalCols ? BORDER_THICK : BORDER_THIN, bottom: BORDER_THICK };
    });
    r++;

    // Footer
    sheet.mergeCells(r, 1, r, totalCols);
    const f = sheet.getCell(r, 1);
    f.value = "*Percentual de valores diários fornecidos pela porção.";
    f.font = { name: 'Arial', size: 8 };
    f.border = { top: BORDER_THICK, bottom: BORDER_THICK, left: BORDER_THICK, right: BORDER_THICK };
}

// --- 4. Linear (Sentence) ---
function generateLinear(sheet: ExcelJS.Worksheet, data: any) {
    const { perPortion, portionSize, householdMeasure, popGroup } = data;
    const { vdrObj, getVD } = getHelpers(popGroup);

    sheet.columns = [{ width: 120 }];

    // ANVISA Linear Format:
    // INFORMAÇÃO NUTRICIONAL: Porção de X g (Y medida). Valor energético A kcal (B %VD); Carboidratos C g (D %VD); ...

    const parts = [
        `INFORMAÇÃO NUTRICIONAL: Porção de ${portionSize} g (${householdMeasure}).`,
        `Valor energético ${roundEnergy(perPortion.energy)} kcal (${getVD(perPortion.energy, vdrObj.energy)})`,
        `Carboidratos ${roundMacro(perPortion.carbs)} g (${getVD(perPortion.carbs, vdrObj.carbs)})`,
        `Açúcares totais ${roundSugars(perPortion.sugarTotal)} g`,
        `Açúcares adicionados ${roundSugars(perPortion.sugarAdded)} g`,
        `Proteínas ${roundMacro(perPortion.protein)} g (${getVD(perPortion.protein, vdrObj.protein)})`,
        `Gorduras totais ${roundMacro(perPortion.fatTotal)} g (${getVD(perPortion.fatTotal, vdrObj.fatTotal)})`,
        `Gorduras saturadas ${roundSaturatedTrans(perPortion.fatSat)} g (${getVD(perPortion.fatSat, vdrObj.fatSat)})`,
        `Gorduras trans ${roundSaturatedTrans(perPortion.fatTrans)} g`,
        `Fibras alimentares ${roundMacro(perPortion.fiber)} g (${getVD(perPortion.fiber, vdrObj.fiber)})`,
        `Sódio ${roundSodium(perPortion.sodium)} mg (${getVD(perPortion.sodium, vdrObj.sodium)}).`,
        `*Percentual de valores diários fornecidos pela porção.`
    ];

    const fullText = parts.join(" ");

    const cell = sheet.getCell('A1');
    cell.value = fullText;
    cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
    cell.font = FONT_ARIAL;
}

// --- 5. Supplement (Simple vertical) ---
function generateSupplement(sheet: ExcelJS.Worksheet, data: any) {
    // Supplements only show: Item | Amount | %VD. No 100g column usually.
    const { perPortion, portionSize, householdMeasure, popGroup } = data;
    const { vdrObj, getVD } = getHelpers(popGroup);

    sheet.columns = [{ width: 35 }, { width: 15 }, { width: 10 }];
    let r = 1;

    sheet.mergeCells(`A${r}:C${r}`);
    const t = sheet.getCell(`A${r}`);
    t.value = "INFORMAÇÃO NUTRICIONAL";
    t.font = FONT_TITLE;
    t.alignment = { horizontal: 'center' };
    t.border = { top: BORDER_THICK, bottom: BORDER_THICK, left: BORDER_THICK, right: BORDER_THICK };
    r++;

    sheet.mergeCells(`A${r}:C${r}`);
    const p = sheet.getCell(`A${r}`);
    p.value = `Porção: ${portionSize} g (${householdMeasure})`;
    p.font = FONT_ARIAL;
    p.alignment = { horizontal: 'left' };
    p.border = { left: BORDER_THICK, right: BORDER_THICK, bottom: BORDER_THICK };
    r++;

    const row = sheet.getRow(r);
    row.values = ["", "Quantidade por porção", "%VD*"];
    row.eachCell((c, i) => {
        c.font = FONT_BOLD;
        c.border = { top: BORDER_THIN, bottom: BORDER_THIN, left: i === 1 ? BORDER_THICK : undefined, right: i === 3 ? BORDER_THICK : undefined };
    });
    r++;

    const addRow = (label: string, vPortion: string, vd: string, bold = false) => {
        const row = sheet.getRow(r);
        row.values = [label, vPortion, vd];
        row.getCell(1).border = { left: BORDER_THICK, bottom: BORDER_THIN };
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(2).border = { bottom: BORDER_THIN };
        row.getCell(3).alignment = { horizontal: 'center' };
        row.getCell(3).border = { right: BORDER_THICK, bottom: BORDER_THIN };
        r++;
    };

    addRow("Valor energético (kcal)", roundEnergy(perPortion.energy), getVD(perPortion.energy, vdrObj.energy), true);
    addRow("Carboidratos (g)", roundMacro(perPortion.carbs), getVD(perPortion.carbs, vdrObj.carbs), true);
    addRow("Açúcares totais (g)", roundSugars(perPortion.sugarTotal), "", false);
    addRow("Açúcares adic. (g)", roundSugars(perPortion.sugarAdded), "", false);
    addRow("Proteínas (g)", roundMacro(perPortion.protein), getVD(perPortion.protein, vdrObj.protein), true);
    addRow("Gorduras totais (g)", roundMacro(perPortion.fatTotal), getVD(perPortion.fatTotal, vdrObj.fatTotal), true);
    addRow("Gord. saturadas (g)", roundSaturatedTrans(perPortion.fatSat), getVD(perPortion.fatSat, vdrObj.fatSat), false);
    addRow("Gorduras trans (g)", roundSaturatedTrans(perPortion.fatTrans), "", false);
    addRow("Sódio (mg)", roundSodium(perPortion.sodium), getVD(perPortion.sodium, vdrObj.sodium), true);

    // Supplement footer
    sheet.mergeCells(`A${r}:C${r}`);
    sheet.getCell(`A${r}`).value = "*Percentual de valores diários fornecidos pela porção.";
    sheet.getCell(`A${r}`).border = { top: BORDER_THICK, bottom: BORDER_THICK, left: BORDER_THICK, right: BORDER_THICK };
}

