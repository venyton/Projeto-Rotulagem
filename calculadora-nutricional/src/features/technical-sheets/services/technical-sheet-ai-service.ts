import "server-only";

import {
  createPartFromBase64,
  createPartFromUri,
  FileState,
  GoogleGenAI,
  type Part,
} from "@google/genai";
import {
  getTechnicalSheetResponseJsonSchema,
  technicalSheetExtractionSchema,
  type TechnicalSheetAiExtraction,
} from "@/features/technical-sheets/domain/technical-sheet-schema";
import { ZodError } from "zod/v3";
import {
  buildTechnicalSheetExtractionPrompt,
  TECHNICAL_SHEET_SYSTEM_PROMPT,
} from "@/features/technical-sheets/domain/technical-sheet-prompts";
import { consumeRequestRateLimit, getRequestRateLimit } from "@/lib/security/request-rate-limit";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const INLINE_FALLBACK_MAX_BYTES = 5 * 1024 * 1024;

export type ExtractTechnicalSheetInput = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
};

export class TechnicalSheetAiError extends Error {
  code: "NOT_CONFIGURED" | "UPLOAD_FAILED" | "QUOTA" | "INVALID_RESPONSE" | "PROVIDER_ERROR";
  userMessage: string;

  constructor(
    code: TechnicalSheetAiError["code"],
    userMessage: string,
    details?: string
  ) {
    super(details ? `${userMessage} ${details}` : userMessage);
    this.name = "TechnicalSheetAiError";
    this.code = code;
    this.userMessage = userMessage;
  }
}

export async function extractTechnicalSheetWithGemini(
  input: ExtractTechnicalSheetInput,
  userId?: string,
): Promise<TechnicalSheetAiExtraction> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new TechnicalSheetAiError(
      "NOT_CONFIGURED",
      "AI provider is not configured. Configure GEMINI_API_KEY."
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = getGeminiModel();
  const prompt = buildTechnicalSheetExtractionPrompt(input.fileName);
  const responseJsonSchema = getTechnicalSheetResponseJsonSchema();
  const projectLimit = await consumeRequestRateLimit(
    "gemini.project",
    "application",
    getRequestRateLimit("geminiProject"),
  );
  if (!projectLimit.allowed) {
    throw new TechnicalSheetAiError(
      "QUOTA",
      "Limite temporário da IA atingido. Tente novamente mais tarde.",
    );
  }
  if (userId) {
    const userLimit = await consumeRequestRateLimit(
      "gemini.user",
      userId,
      getRequestRateLimit("geminiUser"),
    );
    if (!userLimit.allowed) {
      throw new TechnicalSheetAiError(
        "QUOTA",
        "Limite temporário de importações por usuário atingido. Tente novamente mais tarde.",
      );
    }
  }
  const filePart = await buildGeminiFilePart(ai, input);

  try {
    const response = await retryTransientGeminiRequest(() => ai.models.generateContent({
        model,
        contents: [prompt, filePart],
        config: {
          systemInstruction: TECHNICAL_SHEET_SYSTEM_PROMPT,
          temperature: 0.1,
          responseMimeType: "application/json",
          responseJsonSchema,
        },
      }));

    const parsed = parseGeminiJsonResponse(response.text);
    return technicalSheetExtractionSchema.parse(parsed);
  } catch (error) {
    if (error instanceof TechnicalSheetAiError) {
      throw error;
    }
    if (error instanceof ZodError) {
      throw new TechnicalSheetAiError(
        "INVALID_RESPONSE",
        "A resposta da IA veio em formato inválido. Tente novamente ou revise manualmente.",
        error.message
      );
    }

    const quotaError = toQuotaError(error);
    if (quotaError) throw quotaError;

    throw new TechnicalSheetAiError(
      "PROVIDER_ERROR",
      "Não foi possível processar este arquivo. Verifique se o PDF está legível.",
      error instanceof Error ? error.message : String(error)
    );
  }
}

export function getGeminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

function isTransientGeminiError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /429|resource_exhausted|rate.?limit|503|unavailable|timeout/i.test(message);
}

async function retryTransientGeminiRequest<T>(operation: () => Promise<T>) {
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientGeminiError(error) || attempt === maxRetries) throw error;
      const backoffMs = 1_000 * (2 ** attempt) + Math.floor(Math.random() * 250);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw new Error("Gemini request retry exhausted.");
}

async function buildGeminiFilePart(
  ai: GoogleGenAI,
  input: ExtractTechnicalSheetInput
): Promise<Part> {
  try {
    const blob = new Blob([new Uint8Array(input.buffer)], { type: input.mimeType });
    const uploadedFile = await ai.files.upload({
      file: blob,
      config: {
        displayName: input.fileName,
        mimeType: input.mimeType,
      },
    });

    const activeFile = await waitForFileProcessing(ai, uploadedFile.name);
    if (!activeFile.uri || !activeFile.mimeType) {
      throw new Error("Gemini file upload did not return a reusable URI.");
    }

    return createPartFromUri(activeFile.uri, activeFile.mimeType);
  } catch (error) {
    const quotaError = toQuotaError(error);
    if (quotaError) throw quotaError;

    if (input.buffer.byteLength <= INLINE_FALLBACK_MAX_BYTES) {
      return createPartFromBase64(input.buffer.toString("base64"), input.mimeType);
    }

    throw new TechnicalSheetAiError(
      "UPLOAD_FAILED",
      "Falha no upload do arquivo para a IA.",
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function waitForFileProcessing(ai: GoogleGenAI, fileName: string | undefined) {
  if (!fileName) {
    throw new Error("Gemini file upload did not return a file name.");
  }

  let file = await ai.files.get({ name: fileName });
  const deadline = Date.now() + 60_000;

  while (file.state === FileState.PROCESSING && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    file = await ai.files.get({ name: fileName });
  }

  if (file.state === FileState.FAILED) {
    throw new Error(file.error?.message || "File processing failed.");
  }

  if (file.state === FileState.PROCESSING) {
    throw new Error("File processing timed out.");
  }

  return file;
}

function parseGeminiJsonResponse(text: string | undefined) {
  if (!text) {
    throw new TechnicalSheetAiError(
      "INVALID_RESPONSE",
      "A resposta da IA veio em formato inválido. Tente novamente ou revise manualmente."
    );
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new TechnicalSheetAiError(
      "INVALID_RESPONSE",
      "A resposta da IA veio em formato inválido. Tente novamente ou revise manualmente.",
      error instanceof Error ? error.message : String(error)
    );
  }
}

function toQuotaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/429|quota|rate.?limit|resource_exhausted/i.test(message)) {
    return new TechnicalSheetAiError(
      "QUOTA",
      "Limite de cota ou taxa do Gemini atingido. Tente novamente mais tarde.",
      message
    );
  }

  return null;
}
