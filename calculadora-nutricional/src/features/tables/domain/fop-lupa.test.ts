import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_LUPA_STYLE_CONFIG,
  buildDimensionedLupaSvg,
  buildLupaSvg,
  calculateLupa,
  getActiveLupaNutrients,
  normalizeLupaStyleConfig,
} from "./fop-lupa";

test("calcula a lupa para um painel acima de 100 cm2", () => {
  const result = calculateLupa(DEFAULT_LUPA_STYLE_CONFIG, ["acucar", "gordura", "sodio"]);

  assert.equal(result.ok, true);
  assert.equal(result.blocks, 4);
  assert.equal(result.requiredPercent, 4);
  assert.equal(result.fontMinPt, 9);
  assert.ok(result.geom);
  assert.ok((result.achievedPercent ?? 0) >= result.requiredPercent);
});

test("não extrapola a regra para painéis abaixo de 35 cm2", () => {
  const result = calculateLupa({ version: 1, panelHeight: 5, panelWidth: 5, unit: "cm" }, ["sodio"]);

  assert.equal(result.ok, false);
  assert.equal(result.tier, "menor35");
  assert.equal(result.status, "optional");
  assert.equal(result.requiredPercent, 0);
  assert.equal(result.geom, null);
});

test("aplica o corpo máximo em vez de rejeitar painéis grandes", () => {
  const result = calculateLupa({ version: 1, panelHeight: 45, panelWidth: 60, unit: "cm" }, ["acucar"]);

  assert.equal(result.ok, true);
  assert.equal(result.status, "adjusted-maximum");
  assert.equal(result.adjustment, "maximum");
  assert.equal(result.requiredPercent, 2);
  assert.equal(result.requiredAreaMm2, 5_400);
  assert.equal(result.percentageFontPt, 35.64);
  assert.equal(result.fontPt, 15);
  assert.ok(result.geom);
  assert.ok((result.achievedPercent ?? 0) < result.requiredPercent);
});

test("aplica o corpo mínimo em painéis acima de 100 cm2 quando necessário", () => {
  const result = calculateLupa({ version: 1, panelHeight: 10, panelWidth: 11, unit: "cm" }, ["acucar"]);

  assert.equal(result.ok, true);
  assert.equal(result.status, "adjusted-minimum");
  assert.equal(result.adjustment, "minimum");
  assert.equal(result.fontPt, 9);
  assert.ok((result.percentageFontPt ?? 0) < 9);
});

test("aplica o corpo máximo de 9 pt na faixa entre 35 e 100 cm2", () => {
  const result = calculateLupa({ version: 1, panelHeight: 10, panelWidth: 10, unit: "cm" }, ["acucar"]);

  assert.equal(result.ok, true);
  assert.equal(result.status, "adjusted-maximum");
  assert.equal(result.fontPt, 9);
  assert.ok(result.geom);
});

test("normaliza parâmetros inválidos e mantém somente nutrientes calculados", () => {
  assert.deepEqual(normalizeLupaStyleConfig({ panelHeight: -1, panelWidth: Number.POSITIVE_INFINITY, unit: "mm" }), {
    version: 1,
    unit: "mm",
    panelHeight: 200,
    panelWidth: 120,
  });
  assert.deepEqual(getActiveLupaNutrients({ highSugar: true, highFat: false, highSodium: true }), ["acucar", "sodio"]);
});

test("gera o vetor oficial com tipografia limitada e lupa construída em elementos separados", () => {
  const calculation = calculateLupa(DEFAULT_LUPA_STYLE_CONFIG, ["acucar"]);
  assert.ok(calculation.geom);

  const svg = buildLupaSvg(calculation.geom, ["acucar"]);
  assert.match(svg, /textLength=/);
  assert.match(svg, /lengthAdjust="spacingAndGlyphs"/);
  assert.match(svg, /<circle/);
  assert.match(svg, /<rect[^>]*rx=/);
  assert.doesNotMatch(svg, /<line/);
});

test("gera a prancha técnica com as cotas da malha construtiva", () => {
  const calculation = calculateLupa(DEFAULT_LUPA_STYLE_CONFIG, ["acucar"]);
  assert.ok(calculation.geom);

  const svg = buildDimensionedLupaSvg(calculation.geom, ["acucar"]);
  assert.match(svg, /bloco 8Y/);
  assert.match(svg, /bloco 3Y/);
  assert.match(svg, /Entre blocos/);
  assert.match(svg, /Ø 1,7Y/);
  assert.match(svg, /1,3Y/);
  assert.match(svg, /30°/);
  assert.match(svg, /ESPECIFICAÇÕES CONSTRUTIVAS/);
});
