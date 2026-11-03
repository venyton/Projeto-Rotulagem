export const PRIVILEGED_SESSION_DURATIONS = [5, 10, 15] as const;

export type PrivilegedSessionDuration = (typeof PRIVILEGED_SESSION_DURATIONS)[number];
export type PrivilegedPermissionRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type PrivilegedSessionState = "PENDING_APPROVAL" | "ACTIVE" | "REVOKED" | "EXPIRED";

export type PrivilegedSessionScope = {
  permissionKey: string;
  targetType: string | null;
  targetId: string | null;
  sessionBindingHash: string;
};

export type PrivilegedSessionCandidate = PrivilegedSessionScope & {
  status: PrivilegedSessionState;
  startedAt: Date | null;
  expiresAt: Date;
};

export function requiresPrivilegedSession(riskLevel: PrivilegedPermissionRisk) {
  return riskLevel === "HIGH" || riskLevel === "CRITICAL";
}

export function requiresIndependentApproval(riskLevel: PrivilegedPermissionRisk) {
  return riskLevel === "CRITICAL";
}

export function parsePrivilegedDuration(value: string | number): PrivilegedSessionDuration {
  const duration = Number(value);
  if (!PRIVILEGED_SESSION_DURATIONS.includes(duration as PrivilegedSessionDuration)) {
    throw new Error("A duração privilegiada deve ser 5, 10 ou 15 minutos.");
  }
  return duration as PrivilegedSessionDuration;
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function sanitizePrivilegedPurpose(value: string) {
  const purpose = normalizeText(value);
  if (purpose.length < 4 || purpose.length > 120) {
    throw new Error("Informe um propósito entre 4 e 120 caracteres.");
  }
  return purpose;
}

export function sanitizePrivilegedJustification(value: string) {
  const justification = normalizeText(value);
  if (justification.length < 12 || justification.length > 1_000) {
    throw new Error("Informe uma justificativa entre 12 e 1.000 caracteres.");
  }
  return justification;
}

export function sanitizeTicketReference(value: string) {
  const ticket = normalizeText(value);
  if (ticket.length > 120) throw new Error("A referência do ticket deve ter no máximo 120 caracteres.");
  return ticket || null;
}

export function sanitizePrivilegedTarget(targetType: string, targetId: string) {
  const type = targetType.trim().toUpperCase();
  const id = targetId.trim();
  if (!type && !id) return { targetType: null, targetId: null };
  if (!type || !id) throw new Error("Tipo e identificador do destino devem ser informados juntos.");
  if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(type)) throw new Error("Tipo de destino inválido.");
  if (id.length > 128 || /[\u0000-\u001f\u007f]/.test(id)) throw new Error("Identificador de destino inválido.");
  return { targetType: type, targetId: id };
}

export function privilegedSessionCoversScope(
  candidate: PrivilegedSessionCandidate,
  requested: PrivilegedSessionScope,
  now = new Date(),
) {
  return candidate.status === "ACTIVE"
    && candidate.startedAt !== null
    && candidate.startedAt.getTime() <= now.getTime()
    && candidate.expiresAt.getTime() > now.getTime()
    && candidate.permissionKey === requested.permissionKey
    && candidate.targetType === requested.targetType
    && candidate.targetId === requested.targetId
    && candidate.sessionBindingHash === requested.sessionBindingHash;
}

export function canApprovePrivilegedSession(input: {
  requestedByUserId: string;
  approverUserId: string;
  status: PrivilegedSessionState;
  expiresAt: Date;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  return input.requestedByUserId !== input.approverUserId
    && input.status === "PENDING_APPROVAL"
    && input.expiresAt.getTime() > now.getTime();
}
