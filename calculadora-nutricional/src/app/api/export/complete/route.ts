import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { rejectCrossOriginRequest } from "@/lib/security/request-origin";
import { getCanonicalAppOrigin } from "@/lib/security/app-origin";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { ModuleAccessError, requireModuleAccess } from "@/features/saas/services/entitlements";

export const runtime = "nodejs";

type CompleteExportBody = {
  title?: string;
  per100g?: unknown;
  perPortion?: unknown;
  portionSize?: number;
  householdMeasure?: string;
  popGroup?: string;
  isSupplement?: boolean;
  servingsPerPackage?: string;
  selectedNutrients?: string[];
  selectedTableTypes?: string[];
  extraConstituents?: Array<{
    name?: string;
    amount?: string;
    unit?: string;
  }>;
  showDailyValue?: boolean;
  imageDataUrl?: string;
  imageDataUrls?: Record<string, string>;
};

type ParsedImage = {
  buffer: Buffer;
  extension: "png" | "jpeg";
};

function parseImageDataUrl(imageDataUrl: string | undefined): ParsedImage | null {
  if (!imageDataUrl || typeof imageDataUrl !== "string") {
    return null;
  }

  const match = imageDataUrl.match(/^data:(image\/(png|jpeg|jpg));base64,([A-Za-z0-9+/=\n\r]+)$/);
  if (!match) {
    return null;
  }

  const extension = match[2] === "jpg" ? "jpeg" : (match[2] as "png" | "jpeg");
  const base64 = match[3].replace(/\s+/g, "");
  const buffer = Buffer.from(base64, "base64");

  if (!buffer.length) {
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

function readFileNameFromDisposition(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) {
    return fallback;
  }

  const match = contentDisposition.match(/filename\*?=(?:UTF-8''|\"?)([^\";]+)/i);
  if (!match?.[1]) {
    return fallback;
  }

  return decodeURIComponent(match[1]).replace(/\"/g, "").trim() || fallback;
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
    if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "Payload de exportação inválido." }, { status: 413 });
    }

    try {
      await requireModuleAccess(SAAS_MODULES.EXPORTS);
    } catch (error) {
      if (error instanceof ModuleAccessError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }

    const body = (await req.json()) as CompleteExportBody;

    if (!body?.per100g || !body?.perPortion) {
      return NextResponse.json({ error: "Dados nutricionais inválidos para exportação." }, { status: 400 });
    }

    const excelPayload = {
      title: body.title,
      per100g: body.per100g,
      perPortion: body.perPortion,
      portionSize: body.portionSize,
      householdMeasure: body.householdMeasure,
      popGroup: body.popGroup,
      isSupplement: body.isSupplement,
      servingsPerPackage: body.servingsPerPackage,
      selectedNutrients: Array.isArray(body.selectedNutrients) ? body.selectedNutrients : [],
      selectedTableTypes: Array.isArray(body.selectedTableTypes) ? body.selectedTableTypes : [],
      extraConstituents: Array.isArray(body.extraConstituents) ? body.extraConstituents : [],
      showDailyValue: body.showDailyValue !== false,
    };

    const appOrigin = getCanonicalAppOrigin();
    if (!appOrigin) {
      return NextResponse.json({ error: "Origem da aplicação não configurada." }, { status: 503 });
    }

    const excelResponse = await fetch(new URL("/api/export/excel", appOrigin), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: req.headers.get("cookie") ?? "",
        Origin: appOrigin,
      },
      body: JSON.stringify(excelPayload),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(60_000),
    });

    if (!excelResponse.ok) {
      let message = "Falha ao gerar o Excel oficial.";
      try {
        const data = (await excelResponse.json()) as { error?: string };
        if (typeof data?.error === "string" && data.error.trim().length > 0) {
          message = data.error;
        }
      } catch {
        // keep fallback message
      }
      return NextResponse.json({ error: message }, { status: excelResponse.status });
    }

    const excelBuffer = Buffer.from(await excelResponse.arrayBuffer());
    const isXlsxZip = excelBuffer.length > 4 && excelBuffer[0] === 0x50 && excelBuffer[1] === 0x4b;
    if (!isXlsxZip) {
      return NextResponse.json(
        { error: "O arquivo Excel retornado está inválido. Tente exportar novamente." },
        { status: 500 }
      );
    }
    const selectedModels = Array.isArray(body.selectedTableTypes) ? body.selectedTableTypes.slice(0, 12) : [];
    const imagesFromMap = body.imageDataUrls && typeof body.imageDataUrls === "object" ? body.imageDataUrls : null;

    const safeTitle = sanitizeFileName(body.title || "tabela-nutricional") || "tabela-nutricional";
    const excelName = readFileNameFromDisposition(
      excelResponse.headers.get("Content-Disposition"),
      `tabela-${safeTitle}.xlsx`
    );

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
      const parsedImage = parseImageDataUrl(body.imageDataUrl);
      if (parsedImage) {
        const imageExt = parsedImage.extension === "jpeg" ? "jpg" : "png";
        zip.file(`${safeTitle}.${imageExt}`, parsedImage.buffer);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    const safeBuffer = new Uint8Array(zipBuffer.length);
    safeBuffer.set(zipBuffer);

    return new NextResponse(safeBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeTitle}-completo.zip"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro ao exportar pacote completo" }, { status: 500 });
  }
}
