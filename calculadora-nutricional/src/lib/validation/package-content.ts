import { z } from "zod";

// O editor usa zero para representar o campo vazio. No armazenamento, ausência
// permanece distinta de um conteúdo de embalagem positivo informado.
export const optionalPackageContentSchema = z.number()
  .finite()
  .min(0)
  .max(10_000_000)
  .transform((value) => value === 0 ? undefined : value)
  .optional();
