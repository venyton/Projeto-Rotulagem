import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { CalculatedNutrients } from "@/lib/nutrients";
import { roundEnergy, roundMacro, roundSodium, roundSugars, roundSaturatedTrans } from "@/lib/anvisa";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, per100g, perPortion, portionSize, householdMeasure, popGroup } = body;

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Tabela Nutricional");

        // Styling Constants
        const FONT_ARIAL = { name: 'Arial', size: 10 };
        const FONT_BOLD = { name: 'Arial', size: 10, bold: true };
        const FONT_TITLE = { name: 'Arial', size: 12, bold: true };
        const BORDER_THICK = { style: 'medium' as const, color: { argb: 'FF000000' } };
        const BORDER_THIN = { style: 'thin' as const, color: { argb: 'FF000000' } };

        // --- Column Setup ---
        sheet.columns = [
            { width: 35 }, // Description
            { width: 15 }, // 100g
            { width: 15 }, // Portion
            { width: 10 }, // %VD
        ];

        let currentRow = 1;

        // --- Title: INFORMAÇÃO NUTRICIONAL ---
        sheet.mergeCells(`A${currentRow}:D${currentRow}`);
        const titleCell = sheet.getCell(`A${currentRow}`);
        titleCell.value = "INFORMAÇÃO NUTRICIONAL";
        titleCell.font = FONT_TITLE;
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        // Border: Top/Bottom/Left/Right Thick
        titleCell.border = { top: BORDER_THICK, bottom: BORDER_THICK, left: BORDER_THICK, right: BORDER_THICK };
        currentRow++;

        // --- Portion Info ---
        sheet.mergeCells(`A${currentRow}:D${currentRow}`);
        const portionCell = sheet.getCell(`A${currentRow}`);
        portionCell.value = `Porção de ${portionSize}g (${householdMeasure})`;
        portionCell.font = FONT_ARIAL;
        portionCell.alignment = { horizontal: 'center', vertical: 'middle' };
        portionCell.border = { left: BORDER_THICK, right: BORDER_THICK };
        currentRow++;

        // --- Header Row ---
        const headers = ["", "100 g", "Porção", "%VD*"];
        const row = sheet.getRow(currentRow);
        row.values = headers;
        row.eachCell((cell, colNumber) => {
            cell.font = FONT_BOLD;
            cell.alignment = { horizontal: 'right' };
            cell.border = {
                top: BORDER_THIN,
                bottom: BORDER_THIN,
                left: colNumber === 1 ? BORDER_THICK : undefined,
                right: colNumber === 4 ? BORDER_THICK : undefined
            };
        });
        sheet.getCell(`B${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
        sheet.getCell(`C${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
        sheet.getCell(`D${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
        currentRow++;

        // --- Data Rows Helper ---
        const addRow = (label: string, val100: string, valPortion: string, vd: string, indent = false, bold = false) => {
            const r = sheet.getRow(currentRow);
            r.values = [label, val100, valPortion, vd];

            // Label Cell Styling
            const labelCell = r.getCell(1);
            labelCell.font = bold ? FONT_BOLD : FONT_ARIAL;
            labelCell.alignment = { indent: indent ? 2 : 0 };
            labelCell.border = { left: BORDER_THICK, bottom: BORDER_THIN };

            // Values Styling
            [2, 3, 4].forEach(c => {
                const cell = r.getCell(c);
                cell.font = (bold && c !== 4) ? FONT_BOLD : FONT_ARIAL; // VD usually bold only if specified, but usually standard
                cell.alignment = { horizontal: 'right' };
                cell.border = { bottom: BORDER_THIN, right: c === 4 ? BORDER_THICK : undefined };
            });

            // Last column bold VD logic
            r.getCell(4).font = { ...FONT_BOLD, size: 9 };

            currentRow++;
        };

        // --- Calculations & Rows ---
        // Need to replicate calculateVD logic or pass it. 
        // For simplicity, we assume frontend passes or we recalculate. Ideally recalculate here to be safe or just format what passed.
        // The payload `per100g` and `perPortion` are already calculated, but we need formatting (rounding).
        // Actually, to match exactly what is shown, we should re-apply rounding.

        // Constants usually available in lib/constants, but simpler to calculate ratio here or pass VD strings.
        // Let's assume we rely on the passed strings? No, the payload has numbers. We need the VDR.
        // Let's import calculateVD if possible or implement simple logic.

        // Re-importing VDR from constants 
        // We can't easily import 'VDR' inside this edge/node environment if it depends on complex invalid imports? 
        // No, lib/constants is pure TS.

        const { VDR, POPULATION_GROUPS } = require("@/lib/constants");
        const { calculateVD } = require("@/lib/anvisa");
        // Note: require might fail in some Next build setups if not standard. Using imports at top level.

        const vdrObj = VDR[popGroup] || VDR[POPULATION_GROUPS.ADULTS];

        const getVD = (val: number, ref: number | null) => calculateVD(val, ref);

        addRow("Valor energético (kcal)", roundEnergy(per100g.energy), roundEnergy(perPortion.energy), getVD(perPortion.energy, vdrObj.energy), false, true);
        addRow("Carboidratos totais (g)", roundMacro(per100g.carbs), roundMacro(perPortion.carbs), getVD(perPortion.carbs, vdrObj.carbs), false, true);
        addRow("Açúcares totais (g)", roundSugars(per100g.sugarTotal), roundSugars(perPortion.sugarTotal), "", true, false);
        addRow("Açúcares adicionados (g)", roundSugars(per100g.sugarAdded), roundSugars(perPortion.sugarAdded), "", true, false);
        addRow("Proteínas (g)", roundMacro(per100g.protein), roundMacro(perPortion.protein), getVD(perPortion.protein, vdrObj.protein), false, true);
        addRow("Gorduras totais (g)", roundMacro(per100g.fatTotal), roundMacro(perPortion.fatTotal), getVD(perPortion.fatTotal, vdrObj.fatTotal), false, true);
        addRow("Gorduras saturadas (g)", roundSaturatedTrans(per100g.fatSat), roundSaturatedTrans(perPortion.fatSat), getVD(perPortion.fatSat, vdrObj.fatSat), true, false);
        addRow("Gorduras trans (g)", roundSaturatedTrans(per100g.fatTrans), roundSaturatedTrans(perPortion.fatTrans), "", true, false);
        addRow("Fibra alimentar (g)", roundMacro(per100g.fiber), roundMacro(perPortion.fiber), getVD(perPortion.fiber, vdrObj.fiber), false, true);
        addRow("Sódio (mg)", roundSodium(per100g.sodium), roundSodium(perPortion.sodium), getVD(perPortion.sodium, vdrObj.sodium), false, true);

        // --- Footer ---
        const footerRowStart = currentRow;
        const footerCell = sheet.getCell(`A${footerRowStart}`);
        footerCell.value = "*Percentual de valores diários fornecidos pela porção.";
        footerCell.border = { top: BORDER_THICK, bottom: BORDER_THICK, left: BORDER_THICK, right: BORDER_THICK };
        footerCell.font = { name: 'Arial', size: 8 };
        sheet.mergeCells(`A${footerRowStart}:D${footerRowStart}`);

        // --- Generate Buffer ---
        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="tabela-${title.replace(/\s/g, '_')}.xlsx"`
            }
        });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to generate Excel" }, { status: 500 });
    }
}
