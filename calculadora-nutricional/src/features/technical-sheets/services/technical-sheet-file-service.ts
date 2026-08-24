import "server-only";

import { getRuntimeRequestBodyLimitMb } from "@/lib/security/request-body-limit";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const DEFAULT_MAX_FILE_SIZE_MB = 20;
const DEFAULT_MAX_BATCH_FILES = 5;
const DEFAULT_MAX_BATCH_SIZE_MB = 80;

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
  const buffer = Buffer.from(arrayBuffer);
  if (!matchesDeclaredFileType(buffer, file.type)) {
    throw new TechnicalSheetFileError("O conteúdo do arquivo não corresponde ao tipo informado.");
  }

  return {
    buffer,
    fileName: sanitizeFileName(file.name || "ficha-tecnica"),
    mimeType: file.type,
    size: file.size,
  };
}

export function getMaxFileSizeMb() {
  const raw = Number(process.env.TECHNICAL_SHEET_MAX_FILE_SIZE_MB);
  const configured = Number.isFinite(raw) && raw >= 1 && raw <= 25 ? raw : DEFAULT_MAX_FILE_SIZE_MB;
  return Math.min(configured, getRuntimeRequestBodyLimitMb(DEFAULT_MAX_FILE_SIZE_MB));
}

export function getMaxBatchFiles() {
  const raw = Number(process.env.TECHNICAL_SHEET_MAX_BATCH_FILES);
  return Number.isFinite(raw) && raw >= 1 && raw <= 5 ? Math.floor(raw) : DEFAULT_MAX_BATCH_FILES;
}

export function getMaxBatchSizeMb() {
  const raw = Number(process.env.TECHNICAL_SHEET_MAX_BATCH_SIZE_MB);
  const configured = Number.isFinite(raw) && raw >= 1 && raw <= 100 ? raw : DEFAULT_MAX_BATCH_SIZE_MB;
  return Math.min(configured, getRuntimeRequestBodyLimitMb(DEFAULT_MAX_BATCH_SIZE_MB));
}

function matchesDeclaredFileType(buffer: Buffer, mimeType: string) {
  if (mimeType === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mimeType === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/webp") {
    return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  return false;
}

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/[^\w.\-()\sÀ-ÿ]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}
