import "server-only";

import { getResolvedConfigurations } from "@/features/configuration/services/configuration-service";
import { DEFAULT_INGREDIENT_QUANTITY_PRECISION, INGREDIENT_QUANTITY_PRECISION_KEY, isValidIngredientPrecision } from "@/features/configuration/domain/ingredient-precision";

export async function getIngredientQuantityPrecision(organizationId: string) {
  const resolved = (await getResolvedConfigurations({ organizationId, keys: [INGREDIENT_QUANTITY_PRECISION_KEY] })).get(INGREDIENT_QUANTITY_PRECISION_KEY);
  if (!resolved) return DEFAULT_INGREDIENT_QUANTITY_PRECISION;
  if (!isValidIngredientPrecision(resolved.value)) throw new Error("Configuração de precisão inválida.");
  return resolved.value;
}
