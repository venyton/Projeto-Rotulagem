export const EXPORT_SHEET_TYPES = [
  "VERT",
  "HORIZ",
  "VERT-QUEB",
  "HORIZ-QUEB",
  "LINEAR",
  "AGREGADO",
  "SIMPLIF",
  "B2B",
  "ADICAO",
  "100",
  "SUPLEM",
  "SUPLEM-POP",
] as const;

export type ExportSheetType = typeof EXPORT_SHEET_TYPES[number];
