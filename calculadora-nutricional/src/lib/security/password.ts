export const PASSWORD_HASH_ROUNDS = 12;
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 256;

const COMMON_PASSWORDS = new Set([
  "123456",
  "123456789",
  "password",
  "senha",
  "qwerty",
  "teste",
  "admin",
]);

type PasswordContext = {
  email?: string | null;
  name?: string | null;
};

export function validatePasswordStrength(password: string, context: PasswordContext = {}) {
  const value = password.trim();
  const lower = value.toLowerCase();
  const emailUser = context.email?.split("@")[0]?.toLowerCase();
  const name = context.name?.trim().toLowerCase();

  if (value.length < MIN_PASSWORD_LENGTH) {
    return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  if (value.length > MAX_PASSWORD_LENGTH) {
    return `A senha deve ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.`;
  }

  if (COMMON_PASSWORDS.has(lower)) {
    return "Escolha uma senha menos previsível.";
  }

  if (emailUser && emailUser.length >= 4 && lower.includes(emailUser)) {
    return "A senha não pode conter parte do email.";
  }

  if (name && name.length >= 4 && lower.includes(name)) {
    return "A senha não pode conter o nome da conta.";
  }

  return null;
}
