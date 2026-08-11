import { cn } from "@/lib/utils";
import {
  buildDimensionedLupaSvg,
  buildLupaSvg,
  type LupaGeometry,
  type LupaNutrientKey,
} from "@/features/tables/domain/fop-lupa";

type LupaSvgProps = {
  geometry: LupaGeometry;
  nutrients: LupaNutrientKey[];
  className?: string;
  title?: string;
};

function toSvgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Renders the same calculated SVG used by downloads. This keeps the preview,
 * PNG and final vector in a single official construction path.
 */
export function LupaSvg({ geometry, nutrients, className, title = "Rotulagem nutricional frontal" }: LupaSvgProps) {
  return (
    <div className={cn("h-auto w-full", className)}>
      {/* SVG is generated locally and intentionally stays unoptimized in a data URL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={toSvgDataUrl(buildLupaSvg(geometry, nutrients))} alt={title} className="h-auto w-full" />
    </div>
  );
}

export function LupaTechnicalSvg({ geometry, nutrients, className }: LupaSvgProps) {
  return (
    <div className={cn("h-auto w-full", className)}>
      {/* SVG is generated locally and intentionally stays unoptimized in a data URL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={toSvgDataUrl(buildDimensionedLupaSvg(geometry, nutrients))}
        alt="Desenho técnico da rotulagem nutricional frontal"
        className="h-auto w-full"
      />
    </div>
  );
}
