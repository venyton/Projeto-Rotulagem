export const PT_TO_MM = 25.4 / 72;
export const CAP_HEIGHT_EM = 1467 / 2048;
export const Z_PER_Y = (295 / 1409) * 0.82;

export type LupaUnit = "cm" | "mm";
export type LupaNutrientKey = "acucar" | "gordura" | "sodio";

export type LupaNutrient = {
  key: LupaNutrientKey;
  label: string;
  lines: string[];
};

export const LUPA_NUTRIENTS: LupaNutrient[] = [
  { key: "acucar", label: "Açúcar adicionado", lines: ["AÇÚCAR", "ADICIONADO"] },
  { key: "gordura", label: "Gordura saturada", lines: ["GORDURA", "SATURADA"] },
  { key: "sodio", label: "Sódio", lines: ["SÓDIO"] },
];

export type LupaStyleConfig = {
  version: 1;
  panelHeight: number;
  panelWidth: number;
  unit: LupaUnit;
};

export const DEFAULT_LUPA_STYLE_CONFIG: LupaStyleConfig = {
  version: 1,
  panelHeight: 20,
  panelWidth: 12,
  unit: "cm",
};

export type LupaGeometry = {
  fontPt: number;
  Y: number;
  Z: number;
  blockW: number;
  blockH: number;
  border: number;
  innerMargin: number;
  blockGap: number;
  blockRadius: number;
  outerRadius: number;
  totalW: number;
  totalH: number;
  lens: { diameter: number; stroke: number };
  handle: { length: number; thickness: number };
  connection: { length: number; height: number; thickness: number };
  lupaHeight: number;
  lupaOffset: number;
  inclination: number;
  blocks: number;
};

export type LupaCalculation = {
  ok: boolean;
  status: "invalid" | "not-applicable" | "optional" | "calculated" | "adjusted-minimum" | "adjusted-maximum";
  adjustment: "none" | "minimum" | "maximum";
  messages: string[];
  panel: { widthMm: number; heightMm: number; areaMm2: number; areaCm2: number };
  blocks: number;
  tier: "menor35" | "de35a100" | "acima100";
  requiredPercent: number;
  requiredAreaMm2: number;
  fontMinPt: number | null;
  fontMaxPt: number | null;
  percentageFontPt: number | null;
  fontPt: number | null;
  geom: LupaGeometry | null;
  achievedAreaMm2: number | null;
  achievedPercent: number | null;
};

export const LUPA_NORMATIVE_REFERENCES = [
  {
    title: "RDC nº 429/2020 — art. 22",
    description: "Determina o percentual de ocupação e a correção pelo tamanho mínimo ou máximo da fonte.",
    url: "https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&cod_menu=9434&cod_modulo=310&numeroAto=00000429&orgao=RDC%2FDC%2FANVISA%2FMS&seqAto=000&tipo=RDC&valorAno=2020",
  },
  {
    title: "IN nº 75/2020 — Anexo XVIII",
    description: "Define fontes, percentuais, dimensões, relações Y/Z e a malha construtiva da lupa.",
    url: "https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&codTipo=&cod_menu=9434&cod_modulo=310&desItem=&desItemFim=&numeroAto=00000075&orgao=DC%2FANVISA%2FMS&pesquisa=true&seqAto=000&tipo=INM&valorAno=2020",
  },
  {
    title: "Modelos e malha construtiva — Anvisa",
    description: "Arquivos oficiais dos modelos de rotulagem nutricional frontal.",
    url: "https://www.gov.br/anvisa/pt-br/assuntos/alimentos/rotulagem/principais-mudancas-e-modelos",
  },
  {
    title: "Perguntas e Respostas sobre Rotulagem Nutricional — questão 164",
    description: "Confirma que a lupa é opcional em painéis principais inferiores a 35 cm².",
    url: "https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/alimentos/perguntas-e-respostas-arquivos/rotulagem-nutricional_2a-edicao.pdf",
  },
] as const;

export const LUPA_FONT_FAMILY = "'Arial Narrow', 'Liberation Sans Narrow', 'Helvetica Narrow', Arial, Helvetica, sans-serif";

// Avanços da Arial Narrow Bold. Ao fixar o textLength no SVG, a composição
// permanece oficial inclusive em máquinas que não têm Arial Narrow instalada.
const ARIAL_NARROW_ADVANCE: Record<string, number> = {
  A: 573, B: 573, C: 573, D: 573, E: 546, F: 500, G: 619, H: 573,
  I: 273, J: 455, K: 573, L: 500, M: 682, N: 573, O: 619, P: 546,
  Q: 619, R: 591, S: 546, T: 500, U: 573, V: 546, W: 773, X: 546,
  Y: 546, Z: 500, " ": 273,
};

const MIN_PANEL_DIMENSION_MM = 1;
const MAX_PANEL_DIMENSION_MM = 10_000;

function numberFrom(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeLupaStyleConfig(value: unknown): LupaStyleConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_LUPA_STYLE_CONFIG };
  }

  const source = value as Record<string, unknown>;
  const unit: LupaUnit = source.unit === "mm" ? "mm" : "cm";
  const max = unit === "cm" ? MAX_PANEL_DIMENSION_MM / 10 : MAX_PANEL_DIMENSION_MM;
  const min = unit === "cm" ? MIN_PANEL_DIMENSION_MM / 10 : MIN_PANEL_DIMENSION_MM;
  const defaultHeight = unit === "cm" ? DEFAULT_LUPA_STYLE_CONFIG.panelHeight : DEFAULT_LUPA_STYLE_CONFIG.panelHeight * 10;
  const defaultWidth = unit === "cm" ? DEFAULT_LUPA_STYLE_CONFIG.panelWidth : DEFAULT_LUPA_STYLE_CONFIG.panelWidth * 10;
  const panelHeight = numberFrom(source.panelHeight);
  const panelWidth = numberFrom(source.panelWidth);

  return {
    version: 1,
    unit,
    panelHeight: panelHeight !== null && panelHeight >= min && panelHeight <= max
      ? panelHeight
      : defaultHeight,
    panelWidth: panelWidth !== null && panelWidth >= min && panelWidth <= max
      ? panelWidth
      : defaultWidth,
  };
}

export function getActiveLupaNutrients(status: {
  highSugar: boolean;
  highFat: boolean;
  highSodium: boolean;
}): LupaNutrientKey[] {
  return [
    status.highSugar && "acucar",
    status.highFat && "gordura",
    status.highSodium && "sodio",
  ].filter(Boolean) as LupaNutrientKey[];
}

export function geometry(fontPt: number, blocks: number): LupaGeometry {
  const Y = CAP_HEIGHT_EM * fontPt * PT_TO_MM;
  const Z = Z_PER_Y * Y;
  const blockW = 8 * Y;
  const blockH = 3 * Y;
  const border = Z;
  const innerMargin = 2 * Z;
  const blockGap = 2 * Z;
  const totalW = blockW + 2 * innerMargin + 2 * border;
  const totalH = blocks * blockH + (blocks - 1) * blockGap + 2 * innerMargin + 2 * border;

  return {
    fontPt,
    Y,
    Z,
    blockW,
    blockH,
    border,
    innerMargin,
    blockGap,
    blockRadius: 0.5 * Y,
    outerRadius: 0.8 * Y,
    totalW,
    totalH,
    lens: { diameter: 1.7 * Y, stroke: 1.4 * Z },
    handle: { length: 1.3 * Y, thickness: 2.6 * Z },
    connection: { length: 1.2 * Z, height: 1.2 * Z, thickness: 1.5 * Z },
    lupaHeight: 3 * Y,
    lupaOffset: Z,
    inclination: 30,
    blocks,
  };
}

function areaAt(fontPt: number, blocks: number) {
  const result = geometry(fontPt, blocks);
  return result.totalW * result.totalH;
}

export function calculateLupa(
  configInput: LupaStyleConfig | unknown,
  nutrients: LupaNutrientKey[],
): LupaCalculation {
  const config = normalizeLupaStyleConfig(configInput);
  const factor = config.unit === "cm" ? 10 : 1;
  const heightMm = config.panelHeight * factor;
  const widthMm = config.panelWidth * factor;
  const areaMm2 = heightMm * widthMm;
  const areaCm2 = areaMm2 / 100;
  const blocks = nutrients.length + 1;
  const messages: string[] = [];
  const tier: LupaCalculation["tier"] = areaCm2 < 35 ? "menor35" : areaCm2 <= 100 ? "de35a100" : "acima100";
  const percentTable: Record<number, number> = tier === "menor35"
    ? {}
    : tier === "acima100"
      ? { 2: 2, 3: 3, 4: 4 }
      : { 2: 3.5, 3: 5.25, 4: 7 };
  const requiredPercent = percentTable[blocks] ?? 0;
  const base: LupaCalculation = {
    ok: false,
    status: "invalid",
    adjustment: "none",
    messages,
    panel: { widthMm, heightMm, areaMm2, areaCm2 },
    blocks,
    tier,
    requiredPercent,
    requiredAreaMm2: (areaMm2 * requiredPercent) / 100,
    fontMinPt: tier === "acima100" ? 9 : null,
    fontMaxPt: tier === "menor35" ? null : tier === "acima100" ? 15 : 9,
    percentageFontPt: null,
    fontPt: null,
    geom: null,
    achievedAreaMm2: null,
    achievedPercent: null,
  };

  if (nutrients.length === 0) {
    messages.push("Sem nutriente em teor elevado, não há lupa frontal aplicável para esta tabela.");
    return { ...base, status: "not-applicable" };
  }
  if (!(heightMm > 0 && widthMm > 0)) {
    messages.push("Informe altura e largura do painel principal maiores que zero.");
    return base;
  }
  if (tier === "menor35") {
    messages.push("A declaração da lupa é opcional porque o painel principal possui área inferior a 35 cm² (RDC nº 429/2020, art. 18, § 3º, I).");
    return { ...base, status: "optional" };
  }

  let low = 0.5;
  let high = 400;
  for (let index = 0; index < 200; index += 1) {
    const middle = (low + high) / 2;
    if (areaAt(middle, blocks) < base.requiredAreaMm2) low = middle;
    else high = middle;
  }

  const percentageFontPt = Math.ceil(high * 100) / 100;
  let fontPt = percentageFontPt;
  let status: LupaCalculation["status"] = "calculated";
  let adjustment: LupaCalculation["adjustment"] = "none";
  if (base.fontMinPt !== null && fontPt < base.fontMinPt) {
    fontPt = base.fontMinPt;
    status = "adjusted-minimum";
    adjustment = "minimum";
    messages.push(`O percentual resultaria em ${percentageFontPt.toFixed(2).replace(".", ",")} pt. Foi aplicado o mínimo normativo de ${base.fontMinPt} pt.`);
  }
  if (base.fontMaxPt !== null && fontPt > base.fontMaxPt) {
    fontPt = base.fontMaxPt;
    status = "adjusted-maximum";
    adjustment = "maximum";
    messages.push(`O percentual resultaria em ${percentageFontPt.toFixed(2).replace(".", ",")} pt. Foi aplicado o máximo normativo de ${base.fontMaxPt} pt.`);
  }

  const geom = geometry(fontPt, blocks);
  const achievedAreaMm2 = geom.totalW * geom.totalH;
  return {
    ...base,
    ok: true,
    status,
    adjustment,
    percentageFontPt,
    fontPt,
    geom,
    achievedAreaMm2,
    achievedPercent: (achievedAreaMm2 / areaMm2) * 100,
  };
}

const decimal = (value: number, places = 3) => value.toFixed(places);
const mm = (value: number) => `${value.toFixed(2).replace(".", ",")} mm`;

function svgText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function textWidth(text: string, fontMm: number) {
  const advances = [...text.toUpperCase()].reduce((total, character) => {
    const base = character.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return total + (ARIAL_NARROW_ADVANCE[base] ?? 573);
  }, 0);
  return (advances / 1000) * fontMm;
}

function fitText(text: string, fontMm: number, available: number) {
  return Math.min(textWidth(text, fontMm), available);
}

function rotate(x: number, y: number, degrees: number) {
  const angle = (degrees * Math.PI) / 180;
  return { x: x * Math.cos(angle) - y * Math.sin(angle), y: x * Math.sin(angle) + y * Math.cos(angle) };
}

function lupaLocal(geometry: LupaGeometry) {
  const radius = geometry.lens.diameter / 2;
  const ringRadius = radius - geometry.lens.stroke / 2;
  const handleWidth = geometry.handle.thickness;
  const parts = [
    `<circle cx="0" cy="0" r="${decimal(ringRadius, 4)}" fill="#fff" stroke="#000" stroke-width="${decimal(geometry.lens.stroke, 4)}"/>`,
    `<rect x="${decimal(-geometry.connection.thickness / 2, 4)}" y="${decimal(radius - geometry.connection.height / 2, 4)}" width="${decimal(geometry.connection.thickness, 4)}" height="${decimal(geometry.connection.height, 4)}" fill="#000"/>`,
    `<rect x="${decimal(-handleWidth / 2, 4)}" y="${decimal(radius, 4)}" width="${decimal(handleWidth, 4)}" height="${decimal(geometry.handle.length, 4)}" rx="${decimal(handleWidth / 2, 4)}" fill="#000"/>`,
  ].join("");

  const points = [{ x: 0, y: 0, radius }, { x: 0, y: radius + handleWidth / 2, radius: handleWidth / 2 }, { x: 0, y: radius + geometry.handle.length - handleWidth / 2, radius: handleWidth / 2 }];
  const bounds = points.reduce((current, point) => {
    const rotated = rotate(point.x, point.y, geometry.inclination);
    return {
      minX: Math.min(current.minX, rotated.x - point.radius),
      maxX: Math.max(current.maxX, rotated.x + point.radius),
      minY: Math.min(current.minY, rotated.y - point.radius),
      maxY: Math.max(current.maxY, rotated.y + point.radius),
    };
  }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

  return { parts, bounds };
}

function buildLupaLayout(geometry: LupaGeometry, nutrients: LupaNutrientKey[]) {
  const fontMm = geometry.fontPt * PT_TO_MM;
  const blockX = geometry.border + geometry.innerMargin;
  const titleY = geometry.border + geometry.innerMargin;
  const step = geometry.blockH + geometry.blockGap;
  const nutrientYs = nutrients.map((_, index) => titleY + step * (index + 1));
  const lupa = lupaLocal(geometry);
  const lupaCenter = {
    x: blockX + geometry.lupaOffset - lupa.bounds.minX,
    y: titleY + geometry.blockH / 2 - (lupa.bounds.minY + lupa.bounds.maxY) / 2,
  };
  const titleRight = blockX + geometry.blockW - 2 * geometry.Z;
  const titleLeft = lupaCenter.x + lupa.bounds.maxX + geometry.Z;
  const parts = [
    `<rect x="${decimal(geometry.border / 2, 4)}" y="${decimal(geometry.border / 2, 4)}" width="${decimal(geometry.totalW - geometry.border, 4)}" height="${decimal(geometry.totalH - geometry.border, 4)}" rx="${decimal(geometry.outerRadius, 4)}" fill="#fff" stroke="#000" stroke-width="${decimal(geometry.border, 4)}"/>`,
    `<rect x="${decimal(blockX + geometry.border / 2, 4)}" y="${decimal(titleY + geometry.border / 2, 4)}" width="${decimal(geometry.blockW - geometry.border, 4)}" height="${decimal(geometry.blockH - geometry.border, 4)}" rx="${decimal(geometry.blockRadius, 4)}" fill="#fff" stroke="#000" stroke-width="${decimal(geometry.border, 4)}"/>`,
    `<text x="${decimal(titleRight, 4)}" y="${decimal(titleY + geometry.blockH / 2 + geometry.Y / 2, 4)}" text-anchor="end" textLength="${decimal(fitText("ALTO EM", fontMm, titleRight - titleLeft), 4)}" lengthAdjust="spacingAndGlyphs" font-family="${LUPA_FONT_FAMILY}" font-size="${decimal(fontMm, 4)}" font-weight="700" fill="#000">ALTO EM</text>`,
    `<g transform="translate(${decimal(lupaCenter.x, 4)} ${decimal(lupaCenter.y, 4)}) rotate(${geometry.inclination})">${lupa.parts}</g>`,
  ];

  nutrients.forEach((key, index) => {
    const nutrient = LUPA_NUTRIENTS.find((item) => item.key === key);
    if (!nutrient) return;
    const y = nutrientYs[index];
    if (y === undefined) return;
    const centerX = blockX + geometry.blockW / 2;
    const centerY = y + geometry.blockH / 2;
    parts.push(`<rect x="${decimal(blockX, 4)}" y="${decimal(y, 4)}" width="${decimal(geometry.blockW, 4)}" height="${decimal(geometry.blockH, 4)}" rx="${decimal(geometry.blockRadius, 4)}" fill="#000"/>`);
    nutrient.lines.forEach((line, lineIndex) => {
      const offset = (lineIndex - (nutrient.lines.length - 1) / 2) * 1.35 * geometry.Y;
      parts.push(`<text x="${decimal(centerX, 4)}" y="${decimal(centerY + offset + geometry.Y / 2, 4)}" text-anchor="middle" textLength="${decimal(fitText(line, fontMm, geometry.blockW - 2 * geometry.innerMargin), 4)}" lengthAdjust="spacingAndGlyphs" font-family="${LUPA_FONT_FAMILY}" font-size="${decimal(fontMm, 4)}" font-weight="700" fill="#fff">${svgText(line)}</text>`);
    });
  });

  return { svgBody: parts.join(""), blockX, titleY, nutrientYs, lupa, lupaCenter };
}

export function buildLupaSvg(geometry: LupaGeometry, nutrients: LupaNutrientKey[]) {
  const layout = buildLupaLayout(geometry, nutrients);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${decimal(geometry.totalW)}mm" height="${decimal(geometry.totalH)}mm" viewBox="0 0 ${decimal(geometry.totalW)} ${decimal(geometry.totalH)}">${layout.svgBody}</svg>`;
}

export function buildDimensionedLupaSvg(geometry: LupaGeometry, nutrients: LupaNutrientKey[]) {
  const layout = buildLupaLayout(geometry, nutrients);
  const paddingLeft = 10 * geometry.Y;
  const paddingRight = 30 * geometry.Y;
  const paddingTop = 5 * geometry.Y;
  const paddingBottom = 7 * geometry.Y;
  const width = geometry.totalW + paddingLeft + paddingRight;
  const height = Math.max(27 * geometry.Y, geometry.totalH + paddingTop + paddingBottom);
  const textSize = 0.68 * geometry.Y;
  const lineWidth = 0.06 * geometry.Y;
  const annotationColor = "#c2185b";
  const secondaryColor = "#64748b";
  const drawing: string[] = [];

  const tick = (x: number, y: number, vertical: boolean) => vertical
    ? `<line x1="${decimal(x - textSize * 0.35)}" y1="${decimal(y)}" x2="${decimal(x + textSize * 0.35)}" y2="${decimal(y)}" stroke="${annotationColor}" stroke-width="${decimal(lineWidth)}"/>`
    : `<line x1="${decimal(x)}" y1="${decimal(y - textSize * 0.35)}" x2="${decimal(x)}" y2="${decimal(y + textSize * 0.35)}" stroke="${annotationColor}" stroke-width="${decimal(lineWidth)}"/>`;

  const label = (x: number, y: number, text: string, anchor = "middle", color = annotationColor, weight = 400) =>
    `<text x="${decimal(x)}" y="${decimal(y)}" text-anchor="${anchor}" font-family="${LUPA_FONT_FAMILY}" font-size="${decimal(textSize)}" font-weight="${weight}" fill="${color}">${svgText(text)}</text>`;

  const horizontalDimension = (x1: number, x2: number, y: number, text: string) => [
    `<line x1="${decimal(x1)}" y1="${decimal(y)}" x2="${decimal(x2)}" y2="${decimal(y)}" stroke="${annotationColor}" stroke-width="${decimal(lineWidth)}"/>`,
    tick(x1, y, false),
    tick(x2, y, false),
    label((x1 + x2) / 2, y - textSize * 0.5, text),
  ].join("");

  const verticalDimension = (y1: number, y2: number, x: number, text: string) => [
    `<line x1="${decimal(x)}" y1="${decimal(y1)}" x2="${decimal(x)}" y2="${decimal(y2)}" stroke="${annotationColor}" stroke-width="${decimal(lineWidth)}"/>`,
    tick(x, y1, true),
    tick(x, y2, true),
    `<text x="${decimal(x - textSize * 0.65)}" y="${decimal((y1 + y2) / 2)}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${decimal(x - textSize * 0.65)} ${decimal((y1 + y2) / 2)})" font-family="${LUPA_FONT_FAMILY}" font-size="${decimal(textSize)}" fill="${annotationColor}">${svgText(text)}</text>`,
  ].join("");

  const originX = paddingLeft;
  const originY = paddingTop;
  const firstNutrientY = layout.nutrientYs[0] ?? 0;
  const hasNutrient = layout.nutrientYs.length > 0;
  const blockDimensionY = originY - 1.6 * geometry.Y;
  const totalDimensionY = originY + geometry.totalH + 2.5 * geometry.Y;
  const totalDimensionX = originX + geometry.totalW + 2.2 * geometry.Y;
  const blockDimensionX = originX + layout.blockX - 1.5 * geometry.Y;

  drawing.push(label(1.2 * geometry.Y, 1.6 * geometry.Y, "DESENHO TÉCNICO · MALHA CONSTRUTIVA", "start", secondaryColor, 700));
  drawing.push(`<g transform="translate(${decimal(originX)} ${decimal(originY)})">${layout.svgBody}</g>`);

  drawing.push(`<line x1="${decimal(originX + layout.blockX)}" y1="${decimal(originY)}" x2="${decimal(originX + layout.blockX)}" y2="${decimal(blockDimensionY)}" stroke="${annotationColor}" stroke-width="${decimal(lineWidth)}" opacity="0.55"/>`);
  drawing.push(`<line x1="${decimal(originX + layout.blockX + geometry.blockW)}" y1="${decimal(originY)}" x2="${decimal(originX + layout.blockX + geometry.blockW)}" y2="${decimal(blockDimensionY)}" stroke="${annotationColor}" stroke-width="${decimal(lineWidth)}" opacity="0.55"/>`);
  drawing.push(horizontalDimension(originX + layout.blockX, originX + layout.blockX + geometry.blockW, blockDimensionY, `bloco 8Y = ${mm(geometry.blockW)}`));

  drawing.push(`<line x1="${decimal(originX)}" y1="${decimal(originY + geometry.totalH)}" x2="${decimal(originX)}" y2="${decimal(totalDimensionY)}" stroke="${annotationColor}" stroke-width="${decimal(lineWidth)}" opacity="0.55"/>`);
  drawing.push(`<line x1="${decimal(originX + geometry.totalW)}" y1="${decimal(originY + geometry.totalH)}" x2="${decimal(originX + geometry.totalW)}" y2="${decimal(totalDimensionY)}" stroke="${annotationColor}" stroke-width="${decimal(lineWidth)}" opacity="0.55"/>`);
  drawing.push(horizontalDimension(originX, originX + geometry.totalW, totalDimensionY, `L total ${mm(geometry.totalW)}`));

  drawing.push(`<line x1="${decimal(originX + geometry.totalW)}" y1="${decimal(originY)}" x2="${decimal(totalDimensionX)}" y2="${decimal(originY)}" stroke="${annotationColor}" stroke-width="${decimal(lineWidth)}" opacity="0.55"/>`);
  drawing.push(`<line x1="${decimal(originX + geometry.totalW)}" y1="${decimal(originY + geometry.totalH)}" x2="${decimal(totalDimensionX)}" y2="${decimal(originY + geometry.totalH)}" stroke="${annotationColor}" stroke-width="${decimal(lineWidth)}" opacity="0.55"/>`);
  drawing.push(verticalDimension(originY, originY + geometry.totalH, totalDimensionX, `H total ${mm(geometry.totalH)}`));

  if (hasNutrient) {
    drawing.push(`<line x1="${decimal(blockDimensionX)}" y1="${decimal(originY + firstNutrientY)}" x2="${decimal(originX + layout.blockX)}" y2="${decimal(originY + firstNutrientY)}" stroke="${annotationColor}" stroke-width="${decimal(lineWidth)}" opacity="0.55"/>`);
    drawing.push(`<line x1="${decimal(blockDimensionX)}" y1="${decimal(originY + firstNutrientY + geometry.blockH)}" x2="${decimal(originX + layout.blockX)}" y2="${decimal(originY + firstNutrientY + geometry.blockH)}" stroke="${annotationColor}" stroke-width="${decimal(lineWidth)}" opacity="0.55"/>`);
    drawing.push(verticalDimension(originY + firstNutrientY, originY + firstNutrientY + geometry.blockH, blockDimensionX, `bloco 3Y = ${mm(geometry.blockH)}`));
  }

  const specificationX = originX + geometry.totalW + 6 * geometry.Y;
  const specificationY = 2.7 * geometry.Y;
  const specificationWidth = width - specificationX - 1.5 * geometry.Y;
  const rowHeight = 1.32 * geometry.Y;
  const specificationRows = [
    ["Referência Y", mm(geometry.Y)],
    ["Referência Z", mm(geometry.Z)],
    ["Tipografia", `Arial Narrow Bold ${geometry.fontPt.toFixed(2).replace(".", ",")} pt`],
    ["Borda externa", `1Z = ${mm(geometry.border)}`],
    ["Margem interna", `2Z = ${mm(geometry.innerMargin)}`],
    ["Entre blocos", `2Z = ${mm(geometry.blockGap)}`],
    ["Lente", `Ø 1,7Y = ${mm(geometry.lens.diameter)}`],
    ["Espessura da lente", `1,4Z = ${mm(geometry.lens.stroke)}`],
    ["Cabo", `1,3Y = ${mm(geometry.handle.length)}`],
    ["Espessura do cabo", `2,6Z = ${mm(geometry.handle.thickness)}`],
    ["Conexão", `1,2Z × 1,2Z · esp. 1,5Z`],
    ["Lupa", `30° · altura 3Y = ${mm(geometry.lupaHeight)}`],
  ];
  const specificationHeight = (specificationRows.length + 1.8) * rowHeight;

  drawing.push(`<rect x="${decimal(specificationX)}" y="${decimal(specificationY)}" width="${decimal(specificationWidth)}" height="${decimal(specificationHeight)}" rx="${decimal(0.45 * geometry.Y)}" fill="#fff8fb" stroke="#e9a8c2" stroke-width="${decimal(lineWidth)}"/>`);
  drawing.push(label(specificationX + 0.8 * geometry.Y, specificationY + 1.05 * geometry.Y, "ESPECIFICAÇÕES CONSTRUTIVAS", "start", annotationColor, 700));

  specificationRows.forEach(([name, value], index) => {
    const rowY = specificationY + (2.15 + index * 1.32) * geometry.Y;
    if (index > 0) {
      drawing.push(`<line x1="${decimal(specificationX + 0.8 * geometry.Y)}" y1="${decimal(rowY - 0.72 * geometry.Y)}" x2="${decimal(specificationX + specificationWidth - 0.8 * geometry.Y)}" y2="${decimal(rowY - 0.72 * geometry.Y)}" stroke="#f3cfdd" stroke-width="${decimal(lineWidth * 0.65)}"/>`);
    }
    drawing.push(label(specificationX + 0.8 * geometry.Y, rowY, name, "start", secondaryColor, 700));
    const valueX = specificationX + specificationWidth - 0.8 * geometry.Y;
    const availableWidth = specificationWidth - 11.5 * geometry.Y;
    drawing.push(`<text x="${decimal(valueX)}" y="${decimal(rowY)}" text-anchor="end" font-family="${LUPA_FONT_FAMILY}" font-size="${decimal(textSize)}" font-weight="400" fill="#0f172a" textLength="${decimal(fitText(value, textSize, availableWidth))}" lengthAdjust="spacingAndGlyphs">${svgText(value)}</text>`);
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${decimal(width)}mm" height="${decimal(height)}mm" viewBox="0 0 ${decimal(width)} ${decimal(height)}"><rect width="${decimal(width)}" height="${decimal(height)}" fill="#fff"/>${drawing.join("")}</svg>`;
}
