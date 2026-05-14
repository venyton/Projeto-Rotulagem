const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const DEFAULT_MAX_FILE_SIZE_MB = 20;
const DEFAULT_MAX_BATCH_FILES = 5;

export type ValidatedTechnicalSheetFile = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  size: number;
};

export class TechnicalSheetFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TechnicalSheetFileError";
  }
}

export async function validateTechnicalSheetFile(file: File | null): Promise<ValidatedTechnicalSheetFile> {
  if (!file || file.size <= 0) {
    throw new TechnicalSheetFileError("Selecione um PDF ou imagem para importar.");
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new TechnicalSheetFileError("Tipo de arquivo inválido. Use PDF, PNG, JPEG ou WEBP.");
  }

  const maxSizeMb = getMaxFileSizeMb();
  const maxSizeBytes = maxSizeMb * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    throw new TechnicalSheetFileError(`Arquivo grande demais. Limite atual: ${maxSizeMb} MB.`);
  }

  const arrayBuffer = await file.arrayBuffer();

  return {
    buffer: Buffer.from(arrayBuffer),
    fileName: sanitizeFileName(file.name || "ficha-tecnica"),
    mimeType: file.type,
    size: file.size,
  };
}

export function getMaxFileSizeMb() {
  const raw = Number(process.env.TECHNICAL_SHEET_MAX_FILE_SIZE_MB);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_FILE_SIZE_MB;
}

export function getMaxBatchFiles() {
  const raw = Number(process.env.TECHNICAL_SHEET_MAX_BATCH_FILES);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_MAX_BATCH_FILES;
}

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/[^\w.\-()\sÀ-ÿ]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}
