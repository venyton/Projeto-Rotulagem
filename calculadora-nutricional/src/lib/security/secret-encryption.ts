import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const SECRET_VERSION = "v1";

function getEncryptionKey() {
  const source = process.env.SECRET_ENCRYPTION_KEY || process.env.TWO_FACTOR_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!source || source.length < 32) {
    throw new Error("Configuração de criptografia de segredos ausente.");
  }

  return createHash("sha256").update(source).digest();
}

function encode(value: Buffer) {
  return value.toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url");
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [SECRET_VERSION, encode(iv), encode(tag), encode(encrypted)].join(".");
}

export function decryptSecret(payload: string) {
  const [version, ivValue, tagValue, encryptedValue] = payload.split(".");
  if (version !== SECRET_VERSION || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Segredo criptografado inválido.");
  }

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), decode(ivValue));
  decipher.setAuthTag(decode(tagValue));

  return Buffer.concat([
    decipher.update(decode(encryptedValue)),
    decipher.final(),
  ]).toString("utf8");
}
