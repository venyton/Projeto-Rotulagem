"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Check, HelpCircle, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  approveTechnicalSheetExtraction,
  rejectTechnicalSheetExtraction,
} from "@/features/technical-sheets/actions/technical-sheet-actions";
import type {
  TechnicalSheetActionState,
  TechnicalSheetReviewData,
} from "@/features/technical-sheets/domain/technical-sheet-types";
import {
  ANNEX_II_OPTIONAL_NUTRIENT_FIELDS,
  MAIN_NUTRIENT_FIELDS,
  OTHER_NUTRIENT_KEY,
  type TechnicalSheetNutrientField,
} from "@/features/technical-sheets/domain/technical-sheet-nutrients";

const initialState: TechnicalSheetActionState = {};

const DOC_TYPE_LABELS: Record<string, string> = {
  PRODUCT_TECHNICAL: "Ficha técnica",
  PRODUCT_TECHNICAL_SHEET: "Ficha técnica",
  TECHNICAL_SHEET: "Ficha técnica",
  NUTRITION_LABEL: "Rótulo nutricional",
  NUTRITION_TABLE_ONLY: "Tabela nutricional",
  SAFETY_DATA_SHEET: "FISPQ",
  CERTIFICATE: "Certificado",
  UNKNOWN: "Não identificado",
};

const REVIEW_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  NEEDS_REVIEW: "Revisão necessária",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

const DECLARATION_TYPE_LABELS: Record<string, string> = {
  CONTAINS: "Contém",
  DOES_NOT_CONTAIN: "Não contém",
  MAY_CONTAIN: "Pode conter",
  TRACES: "Traços",
  UNKNOWN: "Não informado",
};

// ── Help text for every field ────────────────────────────────────────────
const FIELD_HELP: Record<string, string> = {
  // Product info
  productName:
    "Nome comercial do produto como aparece na embalagem ou ficha técnica. Ex: \"Farinha de Trigo Especial\".",
  productCode:
    "Código interno do produto usado pelo fabricante (SKU, código de barras, etc). Pode ficar vazio se não constar no documento.",
  manufacturer:
    "Nome da empresa fabricante do produto.",
  brand:
    "Marca comercial do produto, quando diferente do fabricante.",

  // Nutrients
  energy:
    "Valor energético total por porção ou por 100g, em quilocalorias (kcal).",
  carbs:
    "Quantidade total de carboidratos por porção/100g, em gramas.",
  sugarTotal:
    "Total de açúcares naturais e adicionados, em gramas. Pode ficar vazio se não declarado.",
  sugarAdded:
    "Apenas açúcares adicionados durante o processamento, em gramas. Pode ficar vazio se não declarado.",
  protein:
    "Quantidade de proteínas por porção/100g, em gramas.",
  fatTotal:
    "Gorduras totais por porção/100g, em gramas.",
  fatSat:
    "Gorduras saturadas por porção/100g, em gramas.",
  fatTrans:
    "Gorduras trans por porção/100g, em gramas.",
  fiber:
    "Fibra alimentar por porção/100g, em gramas.",
  sodium:
    "Sódio por porção/100g, em miligramas (mg).",
  annexIiOptional:
    "Componente opcional do Anexo II da IN 75. Pode ficar vazio quando o documento não declarar.",
  otherNutrient:
    "Use para constituintes fora da lista, como cafeína, creatina, polióis, probióticos ou enzimas.",

  // Gluten, GMO
  containsGluten:
    "Indicação se o produto contém ou não contém glúten, conforme a legislação (Lei nº 10.674/2003).",
  glutenText:
    "Texto exato sobre glúten como consta no rótulo. Ex: \"CONTÉM GLÚTEN\".",
  gmoText:
    "Indicação de presença de organismos geneticamente modificados (transgênicos).",

  // Ingredients, allergens
  ingredientsText:
    "Lista completa de ingredientes do produto, em ordem decrescente de proporção, como aparece no rótulo.",
  allergensText:
    "Declaração de alergênicos conforme RDC 26/2015. Ex: \"Contém: trigo, leite. Pode conter: soja.\"",

  // Extra info
  description:
    "Descrição geral do produto: características, uso pretendido, público-alvo.",
  applicationAndDosage:
    "Instruções de uso, dosagem recomendada ou modo de aplicação do ingrediente.",
  shelfLife:
    "Prazo de validade do produto. Ex: \"12 meses\" ou \"Fabricação + 180 dias\".",
  storageConditions:
    "Condições de armazenamento recomendadas. Ex: \"Local seco e arejado, ao abrigo da luz\".",
};

// ── Nutrient help lookup (same keys as MAIN_FIELDS) ──────────────────────
const NUTRIENT_HELP: Record<string, string> = Object.fromEntries(
  MAIN_NUTRIENT_FIELDS.map((field) => [field.key, FIELD_HELP[field.key] || ""])
);

/**
 * Translates AI-facing review field messages to user-friendly Portuguese.
 */
function humanizeReviewExplanation(raw: string): string {
  const map: Record<string, string> = {
    "Baixa confiança geral da extração":
      "A IA teve dificuldade ao ler este documento. Revise todos os campos com atenção.",
  };
  if (map[raw]) return map[raw];

  if (/confiança/i.test(raw) && /baix/i.test(raw))
    return "A IA não conseguiu ler este campo com segurança. Confira o valor original no documento.";
  if (/não encontrad/i.test(raw) || /not found/i.test(raw))
    return "Este campo não foi encontrado no documento. Preencha manualmente se necessário.";
  if (/ambígu/i.test(raw) || /conflict/i.test(raw))
    return "A IA encontrou informações conflitantes para este campo. Verifique e corrija se necessário.";

  return `Atenção: ${raw}`;
}

export function TechnicalSheetExtractionReview({ data }: { data: TechnicalSheetReviewData }) {
  const router = useRouter();
  const approveAction = approveTechnicalSheetExtraction.bind(null, data.extraction.id);
  const [state, formAction] = useActionState(approveAction, initialState);
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());

  const isApproved = data.extraction.reviewStatus === "APPROVED";
  const isRejected = data.extraction.reviewStatus === "REJECTED";

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) {
      toast.success(state.message || "Extração aprovada.");
      router.refresh();
    }
  }, [router, state]);

  const handleFieldChange = (name: string) => {
    setEditedFields((prev) => {
      const next = new Set(prev);
      next.add(name);
      return next;
    });
  };

  const isFieldInReview = (name: string) => {
    if (editedFields.has(name)) return false;
    return data.extraction.fieldsForReview.some((f) =>
      f.toLowerCase().includes(name.toLowerCase())
    );
  };

  const getReviewExplanation = (name: string): string | undefined => {
    const raw = data.extraction.fieldsForReview.find((f) =>
      f.toLowerCase().includes(name.toLowerCase())
    );
    return raw ? humanizeReviewExplanation(raw) : undefined;
  };

  const hasGlobalLowConfidence = data.extraction.fieldsForReview.some(
    (f) => f === "Baixa confiança geral da extração"
  );

  return (
    <div className="space-y-5 rounded-lg border border-border/70 bg-card p-5">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border/70 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {data.extraction.productName || data.document.fileName}
          </h2>
          <p className="text-sm text-muted-foreground">{data.document.fileName}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs md:text-right">
          <Info
            label="Tipo"
            value={DOC_TYPE_LABELS[data.document.documentType] || data.document.documentType}
          />
          <Info
            label="Confiança"
            value={
              typeof data.document.confidence === "number"
                ? `${Math.round(data.document.confidence * 100)}%`
                : "-"
            }
          />
          <Info
            label="Status"
            value={
              REVIEW_STATUS_LABELS[data.extraction.reviewStatus] ||
              data.extraction.reviewStatus
            }
          />
          <Info
            label="Base"
            value={`${data.extraction.baseQuantity} ${data.extraction.baseUnit}`}
          />
        </div>
      </div>

      {/* Global low confidence banner */}
      {hasGlobalLowConfidence && (
        <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium">Extração com baixa confiança</p>
            <p className="text-xs opacity-80">
              A IA teve dificuldade ao processar este documento. Revise todos os campos
              abaixo com atenção antes de aprovar.
            </p>
          </div>
        </div>
      )}

      {state.error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      {data.document.errorMessage && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {data.document.errorMessage}
        </div>
      )}

      <form action={formAction} className="space-y-5">
        {/* Product info */}
        <section className="grid gap-4 md:grid-cols-2">
          <EditableField
            name="productName"
            label="Nome do produto"
            helpText={FIELD_HELP.productName}
            defaultValue={data.extraction.productName}
            required
            inReview={isFieldInReview("productName")}
            reviewExplanation={getReviewExplanation("productName")}
            onChange={() => handleFieldChange("productName")}
          />
          <EditableField
            name="productCode"
            label="Código"
            helpText={FIELD_HELP.productCode}
            defaultValue={data.extraction.productCode}
            inReview={isFieldInReview("productCode")}
            reviewExplanation={getReviewExplanation("productCode")}
            onChange={() => handleFieldChange("productCode")}
          />
          <EditableField
            name="manufacturer"
            label="Fabricante"
            helpText={FIELD_HELP.manufacturer}
            defaultValue={data.extraction.manufacturer}
            inReview={isFieldInReview("manufacturer")}
            reviewExplanation={getReviewExplanation("manufacturer")}
            onChange={() => handleFieldChange("manufacturer")}
          />
          <EditableField
            name="brand"
            label="Marca"
            helpText={FIELD_HELP.brand}
            defaultValue={data.extraction.brand}
            inReview={isFieldInReview("brand")}
            reviewExplanation={getReviewExplanation("brand")}
            onChange={() => handleFieldChange("brand")}
          />
        </section>

        {/* Nutritional info */}
        <section className="space-y-3">
          <h3 className="border-b border-border/70 pb-2 text-sm font-semibold">
            Informação nutricional
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {MAIN_NUTRIENT_FIELDS.map((field) => (
              <FieldContainer
                key={field.key}
                label={field.label}
                helpText={NUTRIENT_HELP[field.key]}
                inReview={isFieldInReview(field.key)}
                reviewExplanation={getReviewExplanation(field.key)}
                labelClass="text-[10px] text-muted-foreground uppercase tracking-wider"
              >
                <Input
                  name={field.key}
                  type="number"
                  step="any"
                  defaultValue={nutrientValue(data, field.key)}
                  placeholder={field.unit}
                  required={"required" in field ? field.required : undefined}
                  onChange={() => handleFieldChange(field.key)}
                  className={
                    isFieldInReview(field.key)
                      ? "border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]"
                      : ""
                  }
                />
              </FieldContainer>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="border-b border-border/70 pb-2 text-sm font-semibold">
            Componentes do Anexo II (opcionais)
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {ANNEX_II_OPTIONAL_NUTRIENT_FIELDS.map((field) => (
              <OptionalNutrientInput
                key={field.key}
                field={field}
                data={data}
                inReview={isFieldInReview(field.key)}
                reviewExplanation={getReviewExplanation(field.key)}
                onChange={() => handleFieldChange(field.key)}
              />
            ))}
          </div>
        </section>

        <OtherNutrientFields
          data={data}
          inReview={isFieldInReview(OTHER_NUTRIENT_KEY)}
          reviewExplanation={getReviewExplanation(OTHER_NUTRIENT_KEY)}
          onChange={() => handleFieldChange(OTHER_NUTRIENT_KEY)}
        />

        {/* Gluten / GMO */}
        <section className="grid gap-4 md:grid-cols-3">
          <FieldContainer
            label="Contém glúten"
            helpText={FIELD_HELP.containsGluten}
            inReview={isFieldInReview("gluten")}
            reviewExplanation={getReviewExplanation("gluten")}
          >
            <select
              name="containsGluten"
              defaultValue={
                data.extraction.containsGluten === null
                  ? ""
                  : String(data.extraction.containsGluten)
              }
              className={`h-9 w-full rounded-md border bg-background px-3 text-sm transition-colors ${
                isFieldInReview("gluten")
                  ? "border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]"
                  : "border-input"
              }`}
              onChange={() => handleFieldChange("gluten")}
            >
              <option value="">Não informado</option>
              <option value="false">Não contém</option>
              <option value="true">Contém</option>
            </select>
          </FieldContainer>
          <EditableField
            name="glutenText"
            label="Texto glúten"
            helpText={FIELD_HELP.glutenText}
            defaultValue={data.extraction.glutenText}
            inReview={isFieldInReview("glutenText")}
            reviewExplanation={getReviewExplanation("glutenText")}
            onChange={() => handleFieldChange("glutenText")}
          />
          <EditableField
            name="gmoText"
            label="Transgênicos (OGM)"
            helpText={FIELD_HELP.gmoText}
            defaultValue={data.extraction.gmoText}
            inReview={isFieldInReview("gmo")}
            reviewExplanation={getReviewExplanation("gmo")}
            onChange={() => handleFieldChange("gmo")}
          />
        </section>

        {/* Ingredients + Allergens */}
        <section className="grid gap-4 md:grid-cols-2">
          <TextAreaField
            name="ingredientsText"
            label="Ingredientes"
            helpText={FIELD_HELP.ingredientsText}
            defaultValue={data.extraction.ingredientsText}
            inReview={isFieldInReview("ingredients")}
            reviewExplanation={getReviewExplanation("ingredients")}
            onChange={() => handleFieldChange("ingredients")}
          />
          <TextAreaField
            name="allergensText"
            label="Alergênicos"
            helpText={FIELD_HELP.allergensText}
            defaultValue={data.extraction.allergensText}
            inReview={isFieldInReview("allergens")}
            reviewExplanation={getReviewExplanation("allergens")}
            onChange={() => handleFieldChange("allergens")}
          />
        </section>

        {/* Extra text fields */}
        <section className="grid gap-4 text-sm md:grid-cols-2">
          <TextAreaField
            name="description"
            label="Descrição"
            helpText={FIELD_HELP.description}
            defaultValue={data.extraction.description}
            inReview={isFieldInReview("description")}
            reviewExplanation={getReviewExplanation("description")}
            onChange={() => handleFieldChange("description")}
            rows={3}
          />
          <TextAreaField
            name="applicationAndDosage"
            label="Aplicação e dosagem"
            helpText={FIELD_HELP.applicationAndDosage}
            defaultValue={data.extraction.applicationAndDosage}
            inReview={isFieldInReview("applicationAndDosage")}
            reviewExplanation={getReviewExplanation("applicationAndDosage")}
            onChange={() => handleFieldChange("applicationAndDosage")}
            rows={3}
          />
          <EditableField
            name="shelfLife"
            label="Validade"
            helpText={FIELD_HELP.shelfLife}
            defaultValue={data.extraction.shelfLife}
            inReview={isFieldInReview("shelfLife")}
            reviewExplanation={getReviewExplanation("shelfLife")}
            onChange={() => handleFieldChange("shelfLife")}
          />
          <EditableField
            name="storageConditions"
            label="Armazenamento"
            helpText={FIELD_HELP.storageConditions}
            defaultValue={data.extraction.storageConditions}
            inReview={isFieldInReview("storageConditions")}
            reviewExplanation={getReviewExplanation("storageConditions")}
            onChange={() => handleFieldChange("storageConditions")}
          />
        </section>

        {/* Additional technical info */}
        {data.additionalInfo.length > 0 && (
          <section className="space-y-3">
            <h3 className="border-b border-border/70 pb-2 text-sm font-semibold">
              Informações técnicas adicionais
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {data.additionalInfo.map((group) => (
                <div
                  key={group.title}
                  className="rounded-md border border-border/70 p-3 bg-muted/5"
                >
                  <div className="mb-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
                    {group.title}
                  </div>
                  <dl className="space-y-2 text-sm">
                    {group.items.map((entry) => (
                      <div key={`${group.title}-${entry.label}`}>
                        <dt className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {entry.label}
                        </dt>
                        <dd className="whitespace-pre-wrap">{entry.value || "-"}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Detected allergens */}
        {data.allergens.length > 0 && (
          <section className="space-y-2">
            <h3 className="border-b border-border/70 pb-2 text-sm font-semibold">
              Alergênicos detectados
            </h3>
            <div className="grid gap-2 md:grid-cols-2">
              {data.allergens.map((allergen) => (
                <div
                  key={allergen.id}
                  className="rounded-md border border-border/70 p-3 text-sm bg-muted/5"
                >
                  <div className="font-medium">{allergen.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {DECLARATION_TYPE_LABELS[allergen.declarationType || ""] ||
                      allergen.declarationType ||
                      "Não informado"}
                  </div>
                  {allergen.sourceText && (
                    <p className="mt-2 text-xs opacity-80 italic">
                      &quot;{allergen.sourceText}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-col gap-2 border-t border-border/70 pt-4 sm:flex-row">
          <ApproveButton disabled={isApproved || isRejected} />
        </div>
      </form>

      <form action={rejectTechnicalSheetExtraction.bind(null, data.extraction.id)}>
        <Button
          type="submit"
          variant="outline"
          className="w-full border-red-300 text-red-700 hover:bg-red-50 transition-colors"
          disabled={isApproved || isRejected}
        >
          <X className="mr-2 h-4 w-4" />
          Rejeitar extração
        </Button>
      </form>

      {isApproved && data.extraction.approvedTargetId && (
        <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 animate-in fade-in slide-in-from-bottom-2">
          Ingrediente criado com sucesso!
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function nutrientValue(data: TechnicalSheetReviewData, key: string) {
  const nutrient = data.nutrients.find((item) => item.nutrientKey === key);
  return nutrient?.value ?? "";
}

function nutrientUnit(data: TechnicalSheetReviewData, key: string, fallback: string) {
  const nutrient = data.nutrients.find((item) => item.nutrientKey === key);
  return nutrient?.unit || fallback;
}

function nutrientLabel(data: TechnicalSheetReviewData, key: string, fallback: string) {
  const nutrient = data.nutrients.find((item) => item.nutrientKey === key);
  return nutrient?.label || fallback;
}

function OptionalNutrientInput({
  field,
  data,
  inReview,
  reviewExplanation,
  onChange,
}: {
  field: TechnicalSheetNutrientField;
  data: TechnicalSheetReviewData;
  inReview: boolean;
  reviewExplanation?: string;
  onChange: () => void;
}) {
  return (
    <FieldContainer
      label={field.label}
      helpText={FIELD_HELP.annexIiOptional}
      inReview={inReview}
      reviewExplanation={reviewExplanation}
      labelClass="text-[10px] text-muted-foreground uppercase tracking-wider"
    >
      <Input
        name={field.key}
        type="number"
        step="any"
        defaultValue={nutrientValue(data, field.key)}
        placeholder={nutrientUnit(data, field.key, field.unit)}
        onChange={onChange}
        className={
          inReview ? "border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]" : ""
        }
      />
    </FieldContainer>
  );
}

function OtherNutrientFields({
  data,
  inReview,
  reviewExplanation,
  onChange,
}: {
  data: TechnicalSheetReviewData;
  inReview: boolean;
  reviewExplanation?: string;
  onChange: () => void;
}) {
  const otherName = nutrientLabel(data, OTHER_NUTRIENT_KEY, "");
  const defaultName = otherName === "Outros" ? "" : otherName;

  return (
    <section className="space-y-3">
      <h3 className="border-b border-border/70 pb-2 text-sm font-semibold">
        Outros constituintes
      </h3>
      <div className="grid gap-3 md:grid-cols-[1fr_10rem_8rem]">
        <FieldContainer
          label="Nome"
          helpText={FIELD_HELP.otherNutrient}
          inReview={inReview}
          reviewExplanation={reviewExplanation}
        >
          <Input
            name="otherNutrientLabel"
            defaultValue={defaultName}
            placeholder="ex: Cafeína"
            onChange={onChange}
          />
        </FieldContainer>
        <FieldContainer label="Valor" inReview={inReview}>
          <Input
            name="otherNutrientValue"
            type="number"
            step="any"
            defaultValue={nutrientValue(data, OTHER_NUTRIENT_KEY)}
            placeholder="ex: 80"
            onChange={onChange}
          />
        </FieldContainer>
        <FieldContainer label="Unidade" inReview={inReview}>
          <Input
            name="otherNutrientUnit"
            defaultValue={nutrientUnit(data, OTHER_NUTRIENT_KEY, "")}
            placeholder="mg"
            onChange={onChange}
          />
        </FieldContainer>
      </div>
    </section>
  );
}

function ApproveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={disabled || pending}>
      <Check className="mr-2 h-4 w-4" />
      {pending ? "Salvando..." : "Aprovar e salvar como ingrediente"}
    </Button>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "-"}</div>
    </div>
  );
}

/**
 * Container for any field. Shows:
 * - A blue/gray "?" with help text (always, if helpText is provided)
 * - A red "?" with review explanation (only when the field needs review)
 * - Red background highlight when the field is flagged for review
 */
function FieldContainer({
  label,
  children,
  helpText,
  inReview,
  reviewExplanation,
  labelClass = "",
}: {
  label: string;
  children: React.ReactNode;
  helpText?: string;
  inReview?: boolean;
  reviewExplanation?: string;
  labelClass?: string;
}) {
  return (
    <div
      className={`space-y-2 rounded-md p-2 transition-colors ${
        inReview ? "bg-red-50/60 ring-1 ring-red-200" : ""
      }`}
    >
      <div className="flex items-center gap-1.5">
        <Label className={labelClass}>{label}</Label>

        {/* Help tooltip — always visible */}
        {helpText && (
          <div className="group relative">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
              <HelpCircle className="h-3 w-3" />
            </div>
            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-64 -translate-x-1/2 rounded-md bg-popover p-2.5 text-[11px] leading-relaxed text-popover-foreground opacity-0 shadow-xl ring-1 ring-border transition-all group-hover:opacity-100 group-hover:translate-y-0 translate-y-1 z-50">
              <p>{helpText}</p>
            </div>
          </div>
        )}

        {/* Review warning tooltip — only when flagged */}
        {inReview && reviewExplanation && (
          <div className="group relative">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-red-500 transition-colors group-hover:bg-red-200">
              <span className="text-[10px] font-bold leading-none">!</span>
            </div>
            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-60 -translate-x-1/2 rounded-md bg-popover p-2.5 text-[11px] leading-relaxed text-popover-foreground opacity-0 shadow-xl ring-1 ring-red-200 transition-all group-hover:opacity-100 group-hover:translate-y-0 translate-y-1 z-50">
              <p className="font-medium mb-1 text-red-600">⚠ Revisão necessária</p>
              <p>{reviewExplanation}</p>
            </div>
          </div>
        )}
      </div>
      <div className="transition-all">{children}</div>
    </div>
  );
}

function EditableField({
  name,
  label,
  helpText,
  defaultValue,
  required,
  inReview,
  reviewExplanation,
  onChange,
}: {
  name: string;
  label: string;
  helpText?: string;
  defaultValue: string | null;
  required?: boolean;
  inReview?: boolean;
  reviewExplanation?: string;
  onChange?: () => void;
}) {
  return (
    <FieldContainer
      label={label}
      helpText={helpText}
      inReview={inReview}
      reviewExplanation={reviewExplanation}
    >
      <Input
        name={name}
        defaultValue={defaultValue || ""}
        required={required}
        onChange={onChange}
        className={
          inReview ? "border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]" : ""
        }
      />
    </FieldContainer>
  );
}

function TextAreaField({
  name,
  label,
  helpText,
  defaultValue,
  inReview,
  reviewExplanation,
  onChange,
  rows = 4,
}: {
  name: string;
  label: string;
  helpText?: string;
  defaultValue: string | null;
  inReview?: boolean;
  reviewExplanation?: string;
  onChange?: () => void;
  rows?: number;
}) {
  return (
    <FieldContainer
      label={label}
      helpText={helpText}
      inReview={inReview}
      reviewExplanation={reviewExplanation}
    >
      <textarea
        name={name}
        defaultValue={defaultValue || ""}
        onChange={onChange}
        rows={rows}
        className={`w-full rounded-md border bg-background px-3 py-2 text-sm transition-all resize-y ${
          inReview
            ? "border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]"
            : "border-input"
        }`}
      />
    </FieldContainer>
  );
}
