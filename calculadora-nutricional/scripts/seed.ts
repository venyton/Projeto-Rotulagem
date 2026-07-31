import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

import { normalizeIngredientSearchText } from '../src/features/ingredients/domain/ingredient-search';

const prisma = new PrismaClient();

const filePath = path.join(process.cwd(), 'Dataset/runtime/tabela-taco.xlsx');

function normalizeCellValue(value: ExcelJS.CellValue): any {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return value;
    if (typeof value !== "object") return value;
    if ("result" in value) return normalizeCellValue(value.result as ExcelJS.CellValue);
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("richText" in value && Array.isArray(value.richText)) {
        return value.richText.map((item) => item.text).join("");
    }
    return String(value);
}

function worksheetToRows(worksheet: ExcelJS.Worksheet) {
    const rows: any[][] = [];
    const columnCount = worksheet.columnCount;

    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const values: any[] = [];
        for (let col = 1; col <= columnCount; col += 1) {
            values.push(normalizeCellValue(row.getCell(col).value));
        }
        rows[rowNumber - 1] = values;
    });

    return rows;
}

async function main() {
    console.log("Starting seed (TS)...");
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    // -- Process Tabela1 (Main Macros) --
    const s1 = workbook.getWorksheet('Tabela1');
    if (!s1) throw new Error("Tabela1 not found");

    const data1 = worksheetToRows(s1);

    let h1RowIndex = -1;
    for (let i = 0; i < Math.min(data1.length, 20); i++) {
        const rowStr = JSON.stringify(data1[i]);
        if (rowStr && rowStr.includes("Energia") && rowStr.includes("Proteína")) {
            h1RowIndex = i;
            break;
        }
    }

    if (h1RowIndex === -1) {
        throw new Error("Could not find header in Tabela1");
    }

    const headers1 = data1[h1RowIndex];

    const getIdx = (row: any[], key: string) => row.findIndex(c => c && c.toString().includes(key));

    const idxEnergy = getIdx(headers1, "Energia");
    const idxProtein = getIdx(headers1, "Proteína");
    const idxLipid = getIdx(headers1, "Lipídeos");
    const idxCarb = getIdx(headers1, "Carboidrato");
    const idxFiber = getIdx(headers1, "Fibra");
    const idxSodium = getIdx(headers1, "Sódio");

    console.log('Tabela1 Indices:', { idxEnergy, idxProtein, idxLipid, idxCarb, idxFiber, idxSodium });

    if (idxEnergy === -1) throw new Error("Energia column not found");

    // -- Process Tabela2 (Fatty Acids) --
    const s2 = workbook.getWorksheet('Tabela2');
    const fatMap = new Map();
    let h2RowIndex = -1;
    let data2: any[][] = [];

    if (s2) {
        data2 = worksheetToRows(s2);
        for (let i = 0; i < Math.min(data2.length, 20); i++) {
            const rowStr = JSON.stringify(data2[i]);
            if (rowStr && rowStr.includes("Saturados")) {
                h2RowIndex = i;
                break;
            }
        }
    }

    if (h2RowIndex !== -1) {
        const headers2 = data2[h2RowIndex];
        const idxSat = getIdx(headers2, "Saturados");
        const idxTrans = getIdx(headers2, "Trans");

        for (let i = h2RowIndex + 1; i < data2.length; i++) {
            const row = data2[i];
            if (!row || !row[0]) continue;
            const id = row[0];
            const val = (v: any) => {
                if (!v) return 0;
                if (typeof v === 'string') {
                    if (v.toLowerCase() === 'tr') return 0;
                    if (v === '*') return 0;
                    return parseFloat(v.replace(',', '.')) || 0;
                }
                return parseFloat(v) || 0;
            };

            fatMap.set(id.toString(), {
                sat: idxSat > -1 ? val(row[idxSat]) : 0,
                trans: idxTrans > -1 ? val(row[idxTrans]) : 0
            });
        }
    }

    // -- Seed Data --
    console.log('Seeding database rows...');

    const parseVal = (v: any) => {
        if (v === undefined || v === null) return 0;
        if (typeof v === 'number') return v;
        let s = v.toString().trim();
        if (s === '*' || s === 'NA' || s === '') return 0;
        if (s.toLowerCase() === 'tr') return 0;
        s = s.replace(',', '.');
        // Sanitize non-numeric
        if (isNaN(parseFloat(s))) return 0;
        return parseFloat(s);
    };

    const ingredients = [];

    for (let i = h1RowIndex + 1; i < data1.length; i++) {
        const row = data1[i];
        if (!row || !row[1]) continue;

        const tacoId = row[0];
        const name = row[1].toString();

        // Skip if name is too short or weird
        if (!name || name.trim().length < 2) continue;

        const energy = parseVal(row[idxEnergy]);
        const protein = parseVal(row[idxProtein]);
        const fatTotal = parseVal(row[idxLipid]);
        const carbs = parseVal(row[idxCarb]);
        const fiber = parseVal(row[idxFiber]);
        const sodium = parseVal(row[idxSodium]);

        const fats = fatMap.get((tacoId || "").toString()) || { sat: 0, trans: 0 };

        ingredients.push({
            name,
            searchName: normalizeIngredientSearchText(name),
            energy,
            protein,
            carbs,
            fatTotal,
            fatSat: fats.sat,
            fatTrans: fats.trans,
            fiber,
            sodium,
            sugarTotal: 0,
            origin: 'TACO'
        });
    }

    console.log(`Prepared ${ingredients.length} ingredients. Bulk inserting...`);

    // Insert in chunks of 50 to avoid packet size limits if necessary, though createMany handles large batches well.
    // Given the issues, let's play it safe with chunks.
    const chunkSize = 50;
    for (let i = 0; i < ingredients.length; i += chunkSize) {
        const chunk = ingredients.slice(i, i + chunkSize);
        try {
            await prisma.ingredient.createMany({
                data: chunk,
                skipDuplicates: true,
            });
            process.stdout.write(".");
        } catch (err: any) {
            console.error(`\nError inserting chunk ${i / chunkSize}: ${err.message}`);
        }
    }

    console.log(`\nSeeding finished. Processed ${ingredients.length} items.`);
}

main()
    .catch(e => {
        console.error("FATAL SEED EXCEPTION:");
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
