import assert from "node:assert/strict";
import test from "node:test";

import { readBoundedBytesResponse, readBoundedJsonRequest } from "./request-body";

test("lê JSON válido somente dentro do limite de bytes", async () => {
  const request = new Request("https://soizi.test/api", {
    method: "POST",
    body: JSON.stringify({ enabled: true }),
  });

  const result = await readBoundedJsonRequest(request, 64);
  assert.deepEqual(result, {
    ok: true,
    value: { enabled: true },
    byteLength: 16,
  });
});

test("rejeita tamanho declarado acima do limite sem consumir o corpo", async () => {
  const request = new Request("https://soizi.test/api", {
    method: "POST",
    headers: { "content-length": "128" },
    body: "{}",
  });

  assert.deepEqual(await readBoundedJsonRequest(request, 64), {
    ok: false,
    error: "TOO_LARGE",
  });
});

test("limita o corpo real mesmo quando Content-Length não foi enviado", async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("1234"));
      controller.enqueue(new TextEncoder().encode("5678"));
      controller.close();
    },
  });
  const request = new Request("https://soizi.test/api", {
    method: "POST",
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  assert.deepEqual(await readBoundedJsonRequest(request, 7), {
    ok: false,
    error: "TOO_LARGE",
  });
});

test("rejeita JSON malformado e texto UTF-8 inválido", async () => {
  const invalidJson = new Request("https://soizi.test/api", { method: "POST", body: "{" });
  assert.deepEqual(await readBoundedJsonRequest(invalidJson, 64), {
    ok: false,
    error: "INVALID_JSON",
  });

  const invalidUtf8 = new Request("https://soizi.test/api", {
    method: "POST",
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([0xff]));
        controller.close();
      },
    }),
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  assert.deepEqual(await readBoundedJsonRequest(invalidUtf8, 64), {
    ok: false,
    error: "INVALID_ENCODING",
  });
});

test("limita respostas binárias externas pelo tamanho real do stream", async () => {
  const response = new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([0xff, 0xd8, 0xff]));
      controller.enqueue(new Uint8Array([0xd9, 0x00]));
      controller.close();
    },
  }), { headers: { "content-type": "image/jpeg" } });

  assert.deepEqual(await readBoundedBytesResponse(response, 4), {
    ok: false,
    error: "TOO_LARGE",
  });
});
