import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

const filePath = path.join(process.cwd(), 'Dataset/Tabela-TACO-Excel-com-Dashboard-2.0.xlsx');

async function main() {
    console.log("Starting seed (TS)...");
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const workbook = XLSX.readFile(filePath);

    // -- Process Tabela1 (Main Macros) --
    const s1 = workbook.Sheets['Tabela1'];
    if (!s1) throw new Error("Tabela1 not found");

    const data1 = XLSX.utils.sheet_to_json(s1, { header: 1 }) as any[][];

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
    const s2 = workbook.Sheets['Tabela2'];
    const fatMap = new Map();
    let h2RowIndex = -1;
    let data2: any[][] = [];

    if (s2) {
        data2 = XLSX.utils.sheet_to_json(s2, { header: 1 }) as any[][];
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

    let count = 0;
    let errors = 0;

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

        try {
            await prisma.ingredient.create({
                data: {
                    name,
                    energy,
                    protein,
                    carbs,
                    fatTotal,
                    fiber,
                    sodium,
                    fatSat: fats.sat,
                    fatTrans: fats.trans,
                    sugarTotal: 0,
                    origin: 'TACO'
                }
            });
            count++;
            if (count % 50 === 0) process.stdout.write(".");
        } catch (err: any) {
            process.stdout.write("E");
            errors++;
            console.error(`\nERR [ID:${tacoId}]: ${err.message}`);
        }
    }

    console.log(`\nSeeding finished. Inserted ${count}. Errors ${errors}.`);
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
