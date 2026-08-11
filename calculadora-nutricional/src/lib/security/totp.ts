import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { totpCodeSchema } from "@/lib/validation/identifiers";

const ISSUER = "SoIZI";
const SECRET_VERSION = "v1";

function getEncryptionKey() {
  const source = process.env.TWO_FACTOR_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!source || source.length < 32) {
    throw new Error("Configuração de criptografia do 2FA ausente.");
  }

  return createHash("sha256").update(source).digest();
}

function encode(value: Buffer) {
  return value.toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url");
}

export function createTotpSetup(email: string) {
  const secret = generateSecret({ length: 20 });
  const otpauthUrl = generateURI({
    issuer: ISSUER,
    label: email,
    secret,
    digits: 6,
    period: 30,
  });

  return { secret, otpauthUrl };
}

export async function createTotpQrCodeDataUrl(otpauthUrl: string) {
  return QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 192,
  });
}

export function encryptTotpSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [SECRET_VERSION, encode(iv), encode(tag), encode(encrypted)].join(".");
}

export function decryptTotpSecret(payload: string) {
  const [version, ivValue, tagValue, encryptedValue] = payload.split(".");
  if (version !== SECRET_VERSION || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Segredo 2FA inválido.");
  }

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), decode(ivValue));
  decipher.setAuthTag(decode(tagValue));

  return Buffer.concat([
    decipher.update(decode(encryptedValue)),
    decipher.final(),
  ]).toString("utf8");
}

export async function verifyTotpCode(secret: string, code: string) {
  const token = code.replace(/\s+/g, "");
  if (!totpCodeSchema.safeParse(token).success) return false;

  const result = await verify({
    secret,
    token,
    digits: 6,
    period: 30,
    epochTolerance: 30,
  });

  return result.valid;
}

export function formatTotpSecret(secret: string) {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
}
