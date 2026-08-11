import {
  calculateLupa,
  getActiveLupaNutrients,
  normalizeLupaStyleConfig,
  type LupaStyleConfig,
} from "@/features/tables/domain/fop-lupa";
import { LupaSvg } from "@/features/tables/components/LupaSvg";

type MagnifyingGlassLabelProps = {
  highSugar: boolean;
  highFat: boolean;
  highSodium: boolean;
  config?: LupaStyleConfig | unknown;
  id?: string;
};

export function MagnifyingGlassLabel({
  highSugar,
  highFat,
  highSodium,
  config,
  id = "magnifying-glass-label",
}: MagnifyingGlassLabelProps) {
  const nutrients = getActiveLupaNutrients({ highSugar, highFat, highSodium });
  const calculation = calculateLupa(normalizeLupaStyleConfig(config), nutrients);

  if (!calculation.geom) return null;

  return (
    <div id={id} data-i18n-skip className="inline-block max-w-full bg-white p-1 leading-none">
      <LupaSvg geometry={calculation.geom} nutrients={nutrients} className="block max-h-64 min-w-48" />
    </div>
  );
}
