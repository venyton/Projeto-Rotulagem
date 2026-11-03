export type BoundedBodyError =
  | "INVALID_CONTENT_LENGTH"
  | "TOO_LARGE"
  | "BODY_READ_FAILED"
  | "INVALID_ENCODING"
  | "BODY_MISSING"
  | "INVALID_JSON";

export type BoundedBytesResult =
  | { ok: true; value: Uint8Array; byteLength: number }
  | { ok: false; error: BoundedBodyError };

export type BoundedTextResult =
  | { ok: true; text: string; byteLength: number }
  | { ok: false; error: BoundedBodyError };

export type BoundedJsonResult =
  | { ok: true; value: unknown; byteLength: number }
  | { ok: false; error: BoundedBodyError };

export async function readBoundedTextBody(
  body: ReadableStream<Uint8Array> | null,
  declaredLength: string | null,
  maxBytes: number,
): Promise<BoundedTextResult> {
  const byteResult = await readBoundedBytesBody(body, declaredLength, maxBytes);
  if (byteResult.ok === false) {
    return { ok: false, error: byteResult.error };
  }

  try {
    return {
      ok: true,
      text: new TextDecoder("utf-8", { fatal: true }).decode(byteResult.value),
      byteLength: byteResult.byteLength,
    };
  } catch {
    return { ok: false, error: "INVALID_ENCODING" };
  }
}

export async function readBoundedBytesBody(
  body: ReadableStream<Uint8Array> | null,
  declaredLength: string | null,
  maxBytes: number,
): Promise<BoundedBytesResult> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new RangeError("O limite do corpo deve ser um inteiro positivo.");
  }

  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength)) return { ok: false, error: "INVALID_CONTENT_LENGTH" };
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength)) return { ok: false, error: "INVALID_CONTENT_LENGTH" };
    if (parsedLength > maxBytes) return { ok: false, error: "TOO_LARGE" };
  }

  if (!body) return { ok: false, error: "BODY_MISSING" };

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // The request has already exceeded its budget; cancellation is best effort.
        }
        return { ok: false, error: "TOO_LARGE" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, error: "BODY_READ_FAILED" };
  } finally {
    reader.releaseLock();
  }

  if (declaredLength !== null && Number(declaredLength) !== byteLength) {
    return { ok: false, error: "INVALID_CONTENT_LENGTH" };
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { ok: true, value: bytes, byteLength };
}

export async function readBoundedJsonRequest(
  request: Request,
  maxBytes: number,
): Promise<BoundedJsonResult> {
  return readBoundedJsonBody(
    request.body,
    request.headers.get("content-length"),
    maxBytes,
  );
}

export async function readBoundedJsonResponse(
  response: Response,
  maxBytes: number,
): Promise<BoundedJsonResult> {
  return readBoundedJsonBody(
    response.body,
    response.headers.get("content-length"),
    maxBytes,
  );
}

export async function readBoundedBytesResponse(
  response: Response,
  maxBytes: number,
): Promise<BoundedBytesResult> {
  return readBoundedBytesBody(
    response.body,
    response.headers.get("content-length"),
    maxBytes,
  );
}

async function readBoundedJsonBody(
  body: ReadableStream<Uint8Array> | null,
  declaredLength: string | null,
  maxBytes: number,
): Promise<BoundedJsonResult> {
  const textResult = await readBoundedTextBody(body, declaredLength, maxBytes);
  if (textResult.ok === false) {
    return { ok: false, error: textResult.error };
  }

  try {
    return {
      ok: true,
      value: JSON.parse(textResult.text) as unknown,
      byteLength: textResult.byteLength,
    };
  } catch {
    return { ok: false, error: "INVALID_JSON" };
  }
}
