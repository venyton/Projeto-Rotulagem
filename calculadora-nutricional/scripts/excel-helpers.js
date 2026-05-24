const ExcelJS = require('exceljs');

function normalizeCellValue(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value;
  if (typeof value !== "object") return value;
  if ("result" in value) return normalizeCellValue(value.result);
  if ("text" in value && typeof value.text === "string") return value.text;
  if ("richText" in value && Array.isArray(value.richText)) {
    return value.richText.map((item) => item.text).join("");
  }
  return String(value);
}

async function readWorkbook(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  return workbook;
}

function worksheetToRows(worksheet) {
  const rows = [];
  const columnCount = worksheet.columnCount;

  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const values = [];
    for (let col = 1; col <= columnCount; col += 1) {
      values.push(normalizeCellValue(row.getCell(col).value));
    }
    rows[rowNumber - 1] = values;
  });

  return rows;
}

function worksheetToObjects(worksheet) {
  const rows = worksheetToRows(worksheet);
  const headers = rows[0] || [];

  return rows.slice(1).map((row) => {
    const item = {};
    headers.forEach((header, index) => {
      const key = String(header || "").trim();
      if (!key) return;
      item[key] = row[index] ?? "";
    });
    return item;
  });
}

module.exports = {
  readWorkbook,
  worksheetToObjects,
  worksheetToRows,
};
