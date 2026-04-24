const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../Dataset/runtime', 'tabela-taco.xlsx');

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const sheetNames = workbook.SheetNames;


const ws = workbook.Sheets['Tabela2'];
if (ws) {
  const d = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log(`\n--- Tabela2 Headers ---`);
  // Look for header row (contains "Saturados" or "g")
  for (let i = 0; i < 10; i++) {
    console.log(`Row ${i}:`, JSON.stringify(d[i]));
  }
}
