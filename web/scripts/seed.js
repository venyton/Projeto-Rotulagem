const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Explicitly pass url to avoid config resolution issues in script context
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "file:./dev.db"
        }
    }
});

const filePath = path.join(__dirname, '../Dataset', 'Tabela-TACO-Excel-com-Dashboard-2.0.xlsx');

async function main() {
    console.log("Starting seed...");
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const workbook = XLSX.readFile(filePath);

    // -- Process Tabela1 (Main Macros) --
    const s1 = workbook.Sheets['Tabela1'];
    if (!s1) throw new Error("Tabela1 not found");

    const data1 = XLSX.utils.sheet_to_json(s1, { header: 1 });

    // Find header row for Tabela1 (Look for "Energia")
    let h1RowIndex = -1;
    for (let i = 0; i < 20; i++) {
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

    const getIdx = (row, key) => row.findIndex(c => c && c.toString().includes(key));

    // Adjusted keys based on inspection
    // "Energia" appears twice (kcal, kJ). Usually first one is kcal. 
    // But wait, Step 190 output: "Energia", <empty>, "Proteína".
    // So idxEnergy is first match.
    const idxEnergy = getIdx(headers1, "Energia");
    const idxProtein = getIdx(headers1, "Proteína"); // Note specific accent
    const idxLipid = getIdx(headers1, "Lipídeos");
    const idxCarb = getIdx(headers1, "Carboidratos"); // Plural in Step 190? Yes "Carboidratos"
    const idxFiber = getIdx(headers1, "Fibra");
    const idxSodium = getIdx(headers1, "Sódio");

    console.log('Tabela1 Indices:', { idxEnergy, idxProtein, idxLipid, idxCarb, idxFiber, idxSodium });

    if (idxEnergy === -1) throw new Error("Energia column not found");

    // -- Process Tabela2 (Fatty Acids) --
    const s2 = workbook.Sheets['Tabela2'];
    const fatMap = new Map(); // Num -> { sat, trans }
    let h2RowIndex = -1;
    let data2 = [];

    if (s2) {
        data2 = XLSX.utils.sheet_to_json(s2, { header: 1 });
        for (let i = 0; i < 20; i++) {
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

        // Process Tabela2 rows
        for (let i = h2RowIndex + 1; i < data2.length; i++) {
            const row = data2[i];
            if (!row || !row[0]) continue;
            const id = row[0]; // Number
            const val = (v) => {
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

    const parseVal = (v) => {
        if (v === undefined || v === null) return 0;
        if (typeof v === 'number') return v;
        let s = v.toString().trim();
        if (s === '*' || s === 'NA' || s === '') return 0;
        if (s.toLowerCase() === 'tr') return 0;
        s = s.replace(',', '.');
        return parseFloat(s) || 0;
    };

    let count = 0;
    for (let i = h1RowIndex + 1; i < data1.length; i++) {
        const row = data1[i];
        if (!row || !row[1]) continue;

        const tacoId = row[0];
        const name = row[1].toString();

        // Limit name length if needed, or sanity check
        if (name.length > 200) console.warn("Long name:", name);

        const energy = parseVal(row[idxEnergy]);
        const protein = parseVal(row[idxProtein]);
        const fatTotal = parseVal(row[idxLipid]);
        const carbs = parseVal(row[idxCarb]);
        const fiber = parseVal(row[idxFiber]);
        const sodium = parseVal(row[idxSodium]);

        const fats = fatMap.get(tacoId.toString()) || { sat: 0, trans: 0 };

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
    }

    console.log(`\nSeeding finished. Inserted ${count} ingredients.`);
}

main()
    .catch(e => {
        console.error("SEED EXCEPTION:");
        console.error(e.message);
        if (e.stack) console.error(e.stack);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
