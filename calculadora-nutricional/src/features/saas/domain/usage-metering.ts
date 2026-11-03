export const USAGE_METRICS = {
  AI_IMPORTS: "ai_imports_monthly",
  API_REQUESTS: "api_requests",
  EXPORTS: "exports",
} as const;

export type UsagePeriod = { start: Date; end: Date };

export function monthlyUsagePeriod(at: Date): UsagePeriod {
  if (!Number.isFinite(at.getTime())) throw new Error("Data de consumo inválida.");
  return {
    start: new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1)),
    end: new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1)),
  };
}

export function validateUsageRecord(input: {
  metricKey: string;
  idempotencyKey: string;
  source: string;
  quantity: number;
  costMinor: number;
}) {
  const metricKey = input.metricKey.trim();
  const idempotencyKey = input.idempotencyKey.trim();
  const source = input.source.trim();
  if (!/^[a-z][a-z0-9_]{1,63}$/.test(metricKey)) throw new Error("Chave de métrica inválida.");
  if (idempotencyKey.length < 8 || idempotencyKey.length > 160) throw new Error("Chave idempotente inválida.");
  if (!/^[a-z][a-z0-9_.-]{1,63}$/.test(source)) throw new Error("Fonte de consumo inválida.");
  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) throw new Error("Quantidade de consumo inválida.");
  if (!Number.isSafeInteger(input.costMinor) || input.costMinor < 0) throw new Error("Custo de consumo inválido.");
  return { metricKey, idempotencyKey, source, quantity: input.quantity, costMinor: input.costMinor };
}
