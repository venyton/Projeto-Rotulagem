import { createHmac } from "node:crypto";

export type AccountKind = "INDIVIDUAL" | "COMPANY";

const CPF_INPUT_PATTERN = /^(?:\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/;
const CNPJ_INPUT_PATTERN = /^(?:\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/;

export function normalizeBrazilianDocument(value: string) {
  if (!CPF_INPUT_PATTERN.test(value) && !CNPJ_INPUT_PATTERN.test(value)) return "";
  return value.replace(/\D/g, "");
}

function hasRepeatedDigits(value: string) {
  return /^(\d)\1+$/.test(value);
}

function checkDigit(value: string, factors: number[]) {
  const total = value
    .split("")
    .reduce((sum, digit, index) => sum + Number(digit) * factors[index], 0);
  const remainder = total % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCpf(value: string) {
  const cpf = normalizeBrazilianDocument(value);
  if (cpf.length !== 11 || hasRepeatedDigits(cpf)) return false;

  const firstDigit = checkDigit(cpf.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = checkDigit(cpf.slice(0, 9) + firstDigit, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cpf === `${cpf.slice(0, 9)}${firstDigit}${secondDigit}`;
}

export function isValidCnpj(value: string) {
  const cnpj = normalizeBrazilianDocument(value);
  if (cnpj.length !== 14 || hasRepeatedDigits(cnpj)) return false;

  const firstDigit = checkDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = checkDigit(cnpj.slice(0, 12) + firstDigit, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cnpj === `${cnpj.slice(0, 12)}${firstDigit}${secondDigit}`;
}

export function hashBrazilianDocument(kind: "CPF" | "CNPJ", value: string) {
  const secret = process.env.DOCUMENT_HASH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("A chave de proteção de documentos não está configurada.");
  }

  const normalized = normalizeBrazilianDocument(value);
  const valid = kind === "CPF" ? isValidCpf(value) : isValidCnpj(value);
  if (!valid) throw new Error(`Documento ${kind} inválido.`);

  return createHmac("sha256", secret)
    .update(`${kind}:${normalized}`)
    .digest("hex");
}

export function lastFourDigits(value: string) {
  return normalizeBrazilianDocument(value).slice(-4);
}
