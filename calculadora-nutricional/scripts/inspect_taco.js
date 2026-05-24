const fs = require('fs');
const path = require('path');
const { readWorkbook, worksheetToRows } = require('./excel-helpers');

const filePath = path.join(__dirname, '../Dataset/runtime', 'tabela-taco.xlsx');

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

async function main() {
  const workbook = await readWorkbook(filePath);
  const ws = workbook.getWorksheet('Tabela2');
  if (ws) {
    const d = worksheetToRows(ws);
    console.log(`\n--- Tabela2 Headers ---`);
    // Look for header row (contains "Saturados" or "g")
    for (let i = 0; i < 10; i++) {
      console.log(`Row ${i}:`, JSON.stringify(d[i]));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
