import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { rejectCrossOriginRequest } from "@/lib/security/request-origin";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { ModuleAccessError, requireModuleAccess } from "@/features/saas/services/entitlements";
import { authoritativeCompleteExportRequestSchema, imageDataUrlSchema } from "@/features/tables/domain/export-schema";
import { loadAuthoritativeExportBody } from "@/features/tables/services/authoritative-export";
import { generateExcelBuffer } from "@/app/api/export/excel/route";
import {
  consumeRequestRateLimit,
  getRequestRateLimit,
  rateLimitResponse,
} from "@/lib/security/request-rate-limit";
import { getRuntimeRequestBodyLimitBytes, getRuntimeResponseBodyLimitBytes } from "@/lib/security/request-body-limit";

export const runtime = "nodejs";

type ParsedImage = {
  buffer: Buffer;
  extension: "png" | "jpeg";
};

function parseImageDataUrl(imageDataUrl: string | undefined): ParsedImage | null {
  if (!imageDataUrl || !imageDataUrlSchema.safeParse(imageDataUrl).success) {
    return null;
  }

  const separator = imageDataUrl.indexOf(",");
  if (separator < 0) {
    return null;
  }

  const mediaType = imageDataUrl.slice("data:".length, separator);
  const extension = mediaType.endsWith("jpg") ? "jpeg" : mediaType.slice("image/".length, mediaType.indexOf(";")) as "png" | "jpeg";
  const base64 = imageDataUrl.slice(separator + 1);
  const buffer = Buffer.from(base64, "base64");

  if (!buffer.length) {
    return null;
  }

  const isPng = extension === "png" && buffer.subarray(0, 8).equals(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  );
  const isJpeg = extension === "jpeg" && buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (!isPng && !isJpeg) {
    return null;
  }

  return { buffer, extension };
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 60);
}

function sanitizeModelKey(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 30);
}

export async function POST(req: NextRequest) {
  try {
    const originError = rejectCrossOriginRequest(req);
    if (originError) return originError;

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > getRuntimeRequestBodyLimitBytes(25)) {
      return NextResponse.json({ error: "Payload de exportação inválido." }, { status: 413 });
    }

    let context: Awaited<ReturnType<typeof requireModuleAccess>>;
    try {
      context = await requireModuleAccess(SAAS_MODULES.EXPORTS);
    } catch (error) {
      if (error instanceof ModuleAccessError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }

    const parsedRequest = authoritativeCompleteExportRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsedRequest.success) {
      return NextResponse.json({ error: "Dados de exportação inválidos." }, { status: 400 });
    }
    const requestLimit = await consumeRequestRateLimit(
      "exports",
      context.user.id,
      getRequestRateLimit("exports"),
    );
    if (!requestLimit.allowed) {
      return rateLimitResponse(requestLimit, { error: "Limite temporário de exportações atingido." });
    }
    const authoritative = await loadAuthoritativeExportBody(parsedRequest.data.tableId, context.organization.id);
    if (!authoritative.ok) {
      return NextResponse.json({ error: authoritative.error }, { status: 400 });
    }
    const body = authoritative.data;

    const excelBuffer = await generateExcelBuffer(body);
    const isXlsxZip = excelBuffer.length > 4 && excelBuffer[0] === 0x50 && excelBuffer[1] === 0x4b;
    if (!isXlsxZip) {
      return NextResponse.json(
        { error: "O arquivo Excel retornado está inválido. Tente exportar novamente." },
        { status: 500 }
      );
    }
    const selectedModels = body.selectedTableTypes.slice(0, 12);
    const imagesFromMap = parsedRequest.data.imageDataUrls ?? null;

    const safeTitle = sanitizeFileName(body.title || "tabela-nutricional") || "tabela-nutricional";
    const excelName = `tabela-${safeTitle}.xlsx`;

    const zip = new JSZip();
    zip.file(excelName, excelBuffer);

    let appendedImageCount = 0;

    if (imagesFromMap && selectedModels.length > 0) {
      for (const model of selectedModels) {
        const parsed = parseImageDataUrl(imagesFromMap[model]);
        if (!parsed) continue;

        const imageExt = parsed.extension === "jpeg" ? "jpg" : "png";
        const safeModel = sanitizeModelKey(model) || `modelo_${appendedImageCount + 1}`;
        zip.file(`${safeTitle}-${safeModel}.${imageExt}`, parsed.buffer);
        appendedImageCount += 1;
      }
    }

    if (appendedImageCount === 0) {
      const parsedImage = parseImageDataUrl(parsedRequest.data.imageDataUrl);
      if (parsedImage) {
        const imageExt = parsedImage.extension === "jpeg" ? "jpg" : "png";
        zip.file(`${safeTitle}.${imageExt}`, parsedImage.buffer);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    const safeBuffer = new Uint8Array(zipBuffer.length);
    safeBuffer.set(zipBuffer);
    if (safeBuffer.byteLength > getRuntimeResponseBodyLimitBytes(25)) {
      return NextResponse.json({ error: "Arquivo de exportação excede o limite suportado pelo ambiente." }, { status: 413 });
    }

    return new NextResponse(safeBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeTitle}-completo.zip"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro ao exportar pacote completo" }, { status: 500 });
  }
}
