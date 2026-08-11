"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { BookOpen, CheckCircle2, ChevronDown, CircleAlert, Download, ExternalLink, Eye, FileSpreadsheet, ImageDown, Info, Ruler, Save, ScanSearch, Scaling, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LupaTechnicalSvg, LupaSvg } from "@/features/tables/components/LupaSvg";
import { saveLupaStyle } from "@/features/tables/actions/lupa-actions";
import {
  buildDimensionedLupaSvg,
  buildLupaSvg,
  calculateLupa,
  LUPA_NUTRIENTS,
  LUPA_NORMATIVE_REFERENCES,
  normalizeLupaStyleConfig,
  type LupaCalculation,
  type LupaNutrientKey,
  type LupaStyleConfig,
  type LupaUnit,
} from "@/features/tables/domain/fop-lupa";

type LupaEditorProps = {
  tableId: string;
  tableTitle: string;
  activeNutrients: LupaNutrientKey[];
  tableOverride?: unknown;
  tenantDefault?: unknown;
  canManageTenantStyle: boolean;
};

function hasRecord(value: unknown) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function format(value: number | null, fractionDigits = 2) {
  if (value === null || !Number.isFinite(value)) return "—";
  return value.toFixed(fractionDigits).replace(".", ",");
}

function calculationStatusLabel(calculation: LupaCalculation) {
  if (calculation.status === "adjusted-minimum") return "Ajustado ao mínimo normativo";
  if (calculation.status === "adjusted-maximum") return "Ajustado ao máximo normativo";
  if (calculation.status === "optional") return "Declaração opcional";
  if (calculation.status === "not-applicable") return "Lupa não aplicável";
  if (calculation.status === "calculated") return "Calculado pelo percentual";
  return "Entrada inválida";
}

function tierLabel(calculation: LupaCalculation) {
  if (calculation.tier === "menor35") return "Painel inferior a 35 cm²";
  if (calculation.tier === "de35a100") return "Painel de 35 a 100 cm²";
  return "Painel acima de 100 cm²";
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function downloadPng(svg: string, widthMm: number, heightMm: number) {
  const scale = 600 / 25.4;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível rasterizar a lupa."));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(widthMm * scale));
    canvas.height = Math.max(1, Math.round(heightMm * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas indisponível.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Não foi possível gerar o PNG.");
    downloadBlob(blob, "lupa-rotulagem-frontal-600dpi.png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function downloadWorkbook(config: LupaStyleConfig, calculation: ReturnType<typeof calculateLupa>, nutrients: LupaNutrientKey[]) {
  const ExcelJSModule = await import("exceljs");
  const ExcelJS = ExcelJSModule.default;
  const workbook = new ExcelJS.Workbook();
  const summary = workbook.addWorksheet("Resumo");
  summary.columns = [{ width: 42 }, { width: 42 }];
  summary.addRow(["Construtor de lupa", "Rotulagem nutricional frontal"]);
  summary.addRows([
    ["Painel principal", `${format(calculation.panel.heightMm)} × ${format(calculation.panel.widthMm)} mm`],
    ["Área do painel", `${format(calculation.panel.areaCm2)} cm²`],
    ["Nutrientes", nutrients.map((key) => LUPA_NUTRIENTS.find((item) => item.key === key)?.label).join(", ")],
    ["Unidade informada", config.unit],
    ["Faixa regulatória", tierLabel(calculation)],
    ["Decisão do cálculo", calculationStatusLabel(calculation)],
    ["Percentual de referência", calculation.requiredPercent === 0 ? "Não se aplica" : `${format(calculation.requiredPercent)} %`],
    ["Área proporcional antes dos limites", calculation.requiredAreaMm2 === 0 ? "Não se aplica" : `${format(calculation.requiredAreaMm2)} mm²`],
    ["Corpo calculado pelo percentual", calculation.percentageFontPt === null ? "—" : `${format(calculation.percentageFontPt)} pt`],
    ["Limite mínimo", calculation.fontMinPt === null ? "Não se aplica" : `${format(calculation.fontMinPt)} pt`],
    ["Limite máximo", calculation.fontMaxPt === null ? "Não se aplica" : `${format(calculation.fontMaxPt)} pt`],
    ["Corpo aplicado", calculation.fontPt === null ? "—" : `${format(calculation.fontPt)} pt`],
    ["Área final da lupa", calculation.achievedAreaMm2 === null ? "—" : `${format(calculation.achievedAreaMm2)} mm²`],
    ["Ocupação final", calculation.achievedPercent === null ? "—" : `${format(calculation.achievedPercent)} %`],
    ["Justificativa", calculation.messages.join(" ") || "Cálculo dentro dos limites tipográficos normativos."],
  ]);
  const dimensions = workbook.addWorksheet("Dimensões");
  dimensions.columns = [{ width: 40 }, { width: 24 }, { width: 24 }];
  dimensions.addRow(["Elemento", "Relação", "Valor (mm)"]);
  if (calculation.geom) {
    const geometry = calculation.geom;
    dimensions.addRows([
      ["Y", "altura da letra A", format(geometry.Y, 3)],
      ["Z", "largura da letra I", format(geometry.Z, 3)],
      ["Largura total", "8Y + 6Z", format(geometry.totalW, 3)],
      ["Altura total", "blocos + margens", format(geometry.totalH, 3)],
      ["Largura do bloco", "8Y", format(geometry.blockW, 3)],
      ["Altura do bloco", "3Y", format(geometry.blockH, 3)],
      ["Borda externa", "1Z", format(geometry.border, 3)],
      ["Margem interna", "2Z", format(geometry.innerMargin, 3)],
      ["Distância entre blocos", "2Z", format(geometry.blockGap, 3)],
      ["Raio dos cantos dos blocos", "0,50Y", format(geometry.blockRadius, 3)],
      ["Raio da borda externa", "0,80Y", format(geometry.outerRadius, 3)],
      ["Diâmetro da lente", "1,7Y", format(geometry.lens.diameter, 3)],
      ["Espessura da lente", "1,4Z", format(geometry.lens.stroke, 3)],
      ["Comprimento do cabo", "1,3Y", format(geometry.handle.length, 3)],
      ["Espessura do cabo", "2,6Z", format(geometry.handle.thickness, 3)],
      ["Comprimento da conexão", "1,2Z", format(geometry.connection.length, 3)],
      ["Altura da conexão", "1,2Z", format(geometry.connection.height, 3)],
      ["Espessura da conexão", "1,5Z", format(geometry.connection.thickness, 3)],
      ["Altura da lupa", "3Y", format(geometry.lupaHeight, 3)],
      ["Distância da lupa à borda", "1Z", format(geometry.lupaOffset, 3)],
      ["Inclinação da lupa", "30 graus", `${geometry.inclination}°`],
    ]);
  }
  const references = workbook.addWorksheet("Base normativa");
  references.columns = [{ width: 52 }, { width: 78 }, { width: 110 }];
  references.addRow(["Documento oficial", "Evidência utilizada", "Endereço"]);
  LUPA_NORMATIVE_REFERENCES.forEach((reference) => {
    references.addRow([reference.title, reference.description, reference.url]);
  });
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "lupa-calculo.xlsx");
}

export function LupaEditor({
  tableId,
  tableTitle,
  activeNutrients,
  tableOverride,
  tenantDefault,
  canManageTenantStyle,
}: LupaEditorProps) {
  const initialSource: "table" | "tenant" | "default" = hasRecord(tableOverride) ? "table" : hasRecord(tenantDefault) ? "tenant" : "default";
  const [config, setConfig] = useState<LupaStyleConfig>(() => normalizeLupaStyleConfig(tableOverride ?? tenantDefault));
  const [scope, setScope] = useState<"table" | "tenant">("table");
  const [savedSource, setSavedSource] = useState<"table" | "tenant" | "default">(initialSource);
  const [previewMode, setPreviewMode] = useState<"proportional" | "fit">("proportional");
  const [isPending, startTransition] = useTransition();
  const calculation = useMemo(() => calculateLupa(config, activeNutrients), [activeNutrients, config]);
  const geometry = calculation.geom;
  const hasApplicableLupa = activeNutrients.length > 0;
  const proportionalPreviewWidth = geometry ? Math.round(geometry.totalW * 12) : 0;

  const setDimension = (key: "panelHeight" | "panelWidth", raw: string) => {
    const parsed = Number(raw.replace(",", "."));
    setConfig((current) => ({ ...current, [key]: Number.isFinite(parsed) ? parsed : 0 }));
  };

  const setUnit = (unit: string) => {
    if (unit !== "cm" && unit !== "mm") return;
    setConfig((current) => {
      const nextUnit = unit as LupaUnit;
      if (current.unit === nextUnit) return current;
      const factor = nextUnit === "mm" ? 10 : 0.1;
      return {
        ...current,
        unit: nextUnit,
        panelHeight: Number((current.panelHeight * factor).toFixed(3)),
        panelWidth: Number((current.panelWidth * factor).toFixed(3)),
      };
    });
  };

  const handleSave = () => {
    if (!hasApplicableLupa) {
      toast.error("Esta tabela não possui uma lupa aplicável.");
      return;
    }
    if (!calculation.ok) {
      if (calculation.status === "optional") {
        toast.info("Para painéis inferiores a 35 cm², a declaração da lupa é opcional e não é gerada automaticamente.");
      } else {
        toast.error("Corrija as dimensões do painel antes de salvar.");
      }
      return;
    }

    startTransition(async () => {
      const result = await saveLupaStyle({ tableId, scope, config });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setConfig(result.config);
      setSavedSource(result.scope);
      toast.success(result.scope === "tenant" ? "Padrão global da organização atualizado." : "Lupa desta tabela atualizada.");
    });
  };

  const handleSvgDownload = (kind: "lupa" | "technical") => {
    if (!geometry) return;
    const output = kind === "lupa" ? buildLupaSvg(geometry, activeNutrients) : buildDimensionedLupaSvg(geometry, activeNutrients);
    downloadBlob(new Blob([output], { type: "image/svg+xml;charset=utf-8" }), kind === "lupa" ? "lupa-rotulagem-frontal.svg" : "lupa-desenho-tecnico.svg");
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge variant="secondary">Tabela</Badge>
          <span className="truncate text-sm text-muted-foreground">{tableTitle}</span>
          <Badge variant={savedSource === "table" ? "default" : "outline"}>{savedSource === "table" ? "Personalizada" : savedSource === "tenant" ? "Padrão da organização" : "Modelo normativo"}</Badge>
        </div>
        <Button variant="outline" asChild><Link href={`/dashboard/edit/${tableId}`}>Voltar para a tabela</Link></Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="grid min-h-[46rem] xl:grid-cols-[21rem_minmax(0,1fr)]">
          <aside className="border-b bg-muted/15 xl:border-r xl:border-b-0">
            <div className="border-b px-5 py-5">
              <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Parâmetros do rótulo</p>
              <h2 className="mt-1 text-lg font-semibold">Dimensionamento</h2>
              <p className="mt-1 text-sm text-muted-foreground">A lupa é recalculada enquanto você altera o painel principal.</p>
            </div>

            <div className="flex flex-col gap-5 p-5">
              <FieldGroup>
                <FieldSet>
                  <FieldLegend>Medidas do painel principal</FieldLegend>
                  <FieldGroup className="grid grid-cols-2 gap-3">
                    <Field><FieldLabel htmlFor="lupa-panel-height">Altura</FieldLabel><Input id="lupa-panel-height" inputMode="decimal" value={config.panelHeight || ""} onChange={(event) => setDimension("panelHeight", event.target.value)} /></Field>
                    <Field><FieldLabel htmlFor="lupa-panel-width">Largura</FieldLabel><Input id="lupa-panel-width" inputMode="decimal" value={config.panelWidth || ""} onChange={(event) => setDimension("panelWidth", event.target.value)} /></Field>
                  </FieldGroup>
                  <Field>
                    <FieldLabel>Unidade</FieldLabel>
                    <ToggleGroup className="grid w-full grid-cols-2" type="single" variant="outline" value={config.unit} onValueChange={setUnit} aria-label="Unidade do painel"><ToggleGroupItem className="w-full" value="cm">Centímetros</ToggleGroupItem><ToggleGroupItem className="w-full" value="mm">Milímetros</ToggleGroupItem></ToggleGroup>
                    <FieldDescription>Use a área principal disponível no rótulo, não a área da tabela nutricional.</FieldDescription>
                  </Field>
                </FieldSet>
              </FieldGroup>

              <Separator />

              <section aria-labelledby="lupa-nutrients-title">
                <h3 id="lupa-nutrients-title" className="text-sm font-medium">Nutrientes identificados</h3>
                <div className="mt-3 flex flex-wrap gap-2">{activeNutrients.map((key) => <Badge key={key} variant="secondary">{LUPA_NUTRIENTS.find((item) => item.key === key)?.label}</Badge>)}</div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Estes itens vêm do cálculo nutricional da tabela e mantêm a composição consistente.</p>
              </section>

              <Separator />

              <FieldSet>
                <FieldLegend>Aplicar configuração</FieldLegend>
                <ToggleGroup className="grid w-full grid-cols-2" type="single" variant="outline" value={scope} onValueChange={(value) => value === "table" || value === "tenant" ? setScope(value) : undefined} aria-label="Escopo da configuração"><ToggleGroupItem className="w-full" value="table">Nesta tabela</ToggleGroupItem><ToggleGroupItem className="w-full" value="tenant" disabled={!canManageTenantStyle}>Organização</ToggleGroupItem></ToggleGroup>
                <FieldDescription>{scope === "tenant" ? "Este desenho se torna o padrão do tenant ativo." : "Somente esta tabela receberá este desenho."}</FieldDescription>
                {!canManageTenantStyle ? <p className="text-xs text-muted-foreground">O padrão da organização exige permissão de Configurações.</p> : null}
              </FieldSet>

              <Button onClick={handleSave} disabled={isPending || !hasApplicableLupa || !calculation.ok} className="w-full"><Save data-icon="inline-start" />{isPending ? "Salvando..." : scope === "tenant" ? "Salvar como padrão" : "Salvar nesta tabela"}</Button>
              <p className="text-center text-xs text-muted-foreground">A prévia é instantânea. A configuração só é persistida ao salvar.</p>
            </div>
          </aside>

          <main className="min-w-0">
            <Tabs defaultValue="preview" className="h-full gap-0">
              <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <TabsList variant="line" aria-label="Visualização da lupa">
                  <TabsTrigger value="preview"><Eye />Prévia</TabsTrigger>
                  <TabsTrigger value="technical"><Ruler />Desenho técnico</TabsTrigger>
                </TabsList>
                <CalculationStatus calculation={calculation} />
              </div>
              <div className="px-5 pt-5"><CalculationDecision calculation={calculation} /></div>

              <TabsContent value="preview" className="m-0">
                <div className="flex flex-col gap-3 border-b px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="font-semibold">Resultado em tempo real</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{geometry ? `${format(geometry.totalW)} × ${format(geometry.totalH)} mm · Arial Narrow Bold ${format(geometry.fontPt)} pt` : "Informe medidas válidas para gerar a composição."}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ToggleGroup type="single" variant="outline" size="sm" value={previewMode} onValueChange={(value) => value === "proportional" || value === "fit" ? setPreviewMode(value) : undefined} aria-label="Escala da prévia">
                      <ToggleGroupItem value="proportional"><Scaling />Proporcional</ToggleGroupItem>
                      <ToggleGroupItem value="fit">Ajustar à tela</ToggleGroupItem>
                    </ToggleGroup>
                    <Button variant="outline" size="sm" disabled={!geometry} onClick={() => handleSvgDownload("lupa")}><Download data-icon="inline-start" />SVG</Button>
                    <Button variant="outline" size="sm" disabled={!geometry} onClick={() => geometry && downloadPng(buildLupaSvg(geometry, activeNutrients), geometry.totalW, geometry.totalH)}><ImageDown data-icon="inline-start" />PNG 600 dpi</Button>
                  </div>
                </div>

                <div className="min-h-[32rem] overflow-auto bg-muted/25 p-8 sm:p-12 dark:bg-black/15">
                  {geometry ? (
                    <div className="flex min-h-[24rem] min-w-fit items-center justify-center">
                      <div
                        className={previewMode === "fit" ? "w-full max-w-md" : "shrink-0 transition-[width] duration-200 ease-out"}
                        style={previewMode === "proportional" ? { width: `${proportionalPreviewWidth}px` } : undefined}
                      >
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                          <LupaSvg geometry={geometry} nutrients={activeNutrients} />
                        </div>
                      </div>
                    </div>
                  ) : <EmptyCalculation calculation={calculation} />}
                </div>

                <div className="grid border-t sm:grid-cols-2 xl:grid-cols-3">
                  <Metric label="Área do painel" value={`${format(calculation.panel.areaCm2)} cm²`} />
                  <Metric label="Blocos informativos" value={String(calculation.blocks)} />
                  <Metric label="Ocupação de referência" value={calculation.requiredPercent === 0 ? "Não se aplica" : `${format(calculation.requiredPercent)} %`} />
                  <Metric label="Ocupação final" value={calculation.achievedPercent === null ? "—" : `${format(calculation.achievedPercent)} %`} />
                  <Metric label="Referência Y" value={geometry ? `${format(geometry.Y, 3)} mm` : "—"} />
                  <Metric label="Referência Z" value={geometry ? `${format(geometry.Z, 3)} mm` : "—"} />
                </div>
              </TabsContent>

              <TabsContent value="technical" className="m-0">
                <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-semibold">Prancha construtiva cotada</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Confira relações Y/Z, espaçamentos, bordas e elementos da lupa.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" disabled={!geometry} onClick={() => handleSvgDownload("technical")}><Download data-icon="inline-start" />SVG técnico</Button>
                    <Button variant="outline" size="sm" disabled={!calculation.ok} onClick={() => downloadWorkbook(config, calculation, activeNutrients)}><FileSpreadsheet data-icon="inline-start" />Memorial XLSX</Button>
                  </div>
                </div>
                <div className="min-h-[38rem] overflow-auto bg-muted/25 p-4 sm:p-6 dark:bg-black/15">
                  {geometry ? <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><LupaTechnicalSvg geometry={geometry} nutrients={activeNutrients} className="min-w-[58rem]" /></div> : <EmptyCalculation calculation={calculation} />}
                </div>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b px-5 py-3 text-sm sm:border-r last:border-r-0">
      <span className="text-muted-foreground">{label}</span>
      <strong className="font-medium tabular-nums">{value}</strong>
    </div>
  );
}

function CalculationStatus({ calculation }: { calculation: LupaCalculation }) {
  const adjusted = calculation.status === "adjusted-minimum" || calculation.status === "adjusted-maximum";
  const styles = adjusted
    ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100"
    : calculation.status === "calculated"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100"
      : calculation.status === "optional"
        ? "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-100"
        : "border-border bg-muted/40 text-muted-foreground";
  const Icon = adjusted ? ShieldCheck : calculation.status === "calculated" ? CheckCircle2 : calculation.status === "optional" ? Info : calculation.status === "not-applicable" ? ScanSearch : CircleAlert;

  return <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${styles}`}><Icon className="size-3.5" />{calculationStatusLabel(calculation)}</div>;
}

function CalculationDecision({ calculation }: { calculation: LupaCalculation }) {
  const adjusted = calculation.status === "adjusted-minimum" || calculation.status === "adjusted-maximum";
  const presentation = adjusted
    ? {
        title: calculation.status === "adjusted-maximum" ? "Limite máximo aplicado" : "Limite mínimo aplicado",
        description: `${calculation.messages[0]} A lupa continua válida e foi gerada com o limite previsto pela RDC nº 429/2020.`,
        icon: ShieldCheck,
        className: "border-amber-300 bg-amber-50/70 text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100",
      }
    : calculation.status === "calculated"
      ? {
          title: "Cálculo dentro dos limites normativos",
          description: `O percentual de ${format(calculation.requiredPercent)}% resultou em ${format(calculation.fontPt)} pt, sem necessidade de ajuste pelo mínimo ou máximo.`,
          icon: CheckCircle2,
          className: "border-emerald-200 bg-emerald-50/60 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
        }
      : calculation.status === "optional"
        ? {
            title: "Declaração opcional para este painel",
            description: calculation.messages[0] ?? "A lupa não é obrigatória nesta faixa de área.",
            icon: Info,
            className: "border-sky-200 bg-sky-50/70 text-sky-950 dark:border-sky-800 dark:bg-sky-950/35 dark:text-sky-100",
          }
        : calculation.status === "not-applicable"
          ? {
              title: "Lupa não aplicável",
              description: calculation.messages[0] ?? "Nenhum nutriente foi classificado em alto teor.",
              icon: ScanSearch,
              className: "border-border bg-muted/35 text-foreground",
            }
          : {
              title: "Não foi possível calcular",
              description: calculation.messages[0] ?? "Revise as dimensões informadas.",
              icon: CircleAlert,
              className: "border-destructive/40 bg-destructive/5 text-destructive dark:bg-destructive/10",
            };
  const Icon = presentation.icon;
  const fontRange = calculation.fontMaxPt === null
    ? "Não se aplica"
    : calculation.fontMinPt === null
      ? `até ${format(calculation.fontMaxPt)} pt`
      : `${format(calculation.fontMinPt)} a ${format(calculation.fontMaxPt)} pt`;

  return (
    <section aria-live="polite" className={`rounded-lg border ${presentation.className}`}>
      <div className="flex items-start gap-3 px-4 py-3.5">
        <Icon className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{presentation.title}</h3>
          <p className="mt-1 text-sm leading-relaxed opacity-85">{presentation.description}</p>
        </div>
      </div>

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="mx-3 mb-2 h-auto min-h-8 max-w-[calc(100%-1.5rem)] justify-start px-2 py-1.5 text-left whitespace-normal text-current hover:bg-black/5 dark:hover:bg-white/5">
            <BookOpen />Ver memória de cálculo e evidências oficiais<ChevronDown data-icon="inline-end" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid gap-6 border-t border-current/15 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)]">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] uppercase opacity-65">Memória do resultado</p>
              <dl className="mt-3 grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2">
                <EvidenceRow label="Área do painel" value={`${format(calculation.panel.areaCm2)} cm²`} />
                <EvidenceRow label="Faixa regulatória" value={tierLabel(calculation)} />
                <EvidenceRow label="Blocos informativos" value={String(calculation.blocks)} />
                <EvidenceRow label="Percentual de referência" value={calculation.requiredPercent === 0 ? "Não se aplica" : `${format(calculation.requiredPercent)} %`} />
                <EvidenceRow label="Área proporcional solicitada" value={calculation.requiredAreaMm2 === 0 ? "Não se aplica" : `${format(calculation.requiredAreaMm2)} mm²`} />
                <EvidenceRow label="Corpo calculado" value={calculation.percentageFontPt === null ? "—" : `${format(calculation.percentageFontPt)} pt`} />
                <EvidenceRow label="Faixa tipográfica" value={fontRange} />
                <EvidenceRow label="Corpo aplicado" value={calculation.fontPt === null ? "—" : `${format(calculation.fontPt)} pt`} />
                <EvidenceRow label="Área final da lupa" value={calculation.achievedAreaMm2 === null ? "—" : `${format(calculation.achievedAreaMm2)} mm²`} />
                <EvidenceRow label="Ocupação final" value={calculation.achievedPercent === null ? "—" : `${format(calculation.achievedPercent)} %`} />
              </dl>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-[0.12em] uppercase opacity-65">Evidências oficiais</p>
              <div className="mt-3 divide-y divide-current/15 border-y border-current/15">
                {LUPA_NORMATIVE_REFERENCES.map((reference) => (
                  <a key={reference.title} href={reference.url} target="_blank" rel="noreferrer" className="group flex items-start justify-between gap-3 py-2.5 text-current hover:underline">
                    <span><span className="block text-sm font-medium">{reference.title}</span><span className="mt-0.5 block text-xs leading-relaxed opacity-70">{reference.description}</span></span>
                    <ExternalLink className="mt-0.5 size-3.5 shrink-0 opacity-55 transition-opacity group-hover:opacity-100" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

function EvidenceRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-baseline justify-between gap-3 border-b border-current/10 pb-1.5"><dt className="opacity-65">{label}</dt><dd className="text-right font-medium tabular-nums">{value}</dd></div>;
}

function EmptyCalculation({ calculation }: { calculation: LupaCalculation }) {
  const optional = calculation.status === "optional";
  const notApplicable = calculation.status === "not-applicable";
  return (
    <div className="flex min-h-[24rem] w-full items-center justify-center text-center">
      <div className="max-w-sm">
        {optional ? <Info className="mx-auto size-8 text-sky-600 dark:text-sky-400" /> : <ScanSearch className="mx-auto size-8 text-muted-foreground" />}
        <p className="mt-3 text-sm font-medium">{optional ? "A lupa não é obrigatória" : notApplicable ? "Nenhuma lupa aplicável" : "Aguardando um dimensionamento válido"}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{optional ? "O painel possui menos de 35 cm². Consulte a memória acima para ver a justificativa oficial." : notApplicable ? "A tabela não possui nutrientes classificados em alto teor." : "Revise altura e largura para continuar."}</p>
      </div>
    </div>
  );
}
