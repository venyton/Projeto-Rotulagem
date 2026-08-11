'use client'

import React, { useState, useEffect } from "react";
import { IngredientSelector } from "@/features/ingredients/components/IngredientSelector";
import { OpenFoodFactsImporter } from "@/features/open-food-facts/components/OpenFoodFactsImporter";
import {
    SelectedIngredient,
    PreparedProductCalculation,
    calculateRecipe,
    calculatePreparedProduct,
    CalculatedNutrients,
    applyManualMicronutrientOverrides,
    isLikelyAddedSugarIngredient,
    normalizeManualMicronutrients,
    parseManualMicronutrientValue,
    type ManualMicronutrientValues,
} from "@/features/tables/domain/nutrients";
import { NutritionalLabel } from "@/features/tables/components/NutritionalLabel";
import { MagnifyingGlassLabel } from "@/features/tables/components/MagnifyingGlassLabel";
import {
    POPULATION_GROUPS,
    PopGroup,
    RegulatoryScenario,
    SPECIFIC_POPULATION_LABELS,
    isSpecificPopulationGroup,
    normalizePopulationGroupForScenario,
} from "@/features/tables/domain/constants";
import { checkFOP, inferFopFoodType, type FOPFoodType } from "@/features/tables/domain/anvisa";
import { Ingredient } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { HelpTip } from "@/components/ui/help-tip";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trash2, Download, Save, ChevronDown, FileSpreadsheet, FileText, Image as ImageIcon } from "lucide-react";
import { saveTable } from "@/features/tables/actions/table-actions";
import { toast } from "sonner";
import { toCanvas } from "html-to-image";
import { MICRONUTRIENTS_A_TO_Z, type MicronutrientKey } from "@/features/tables/domain/micronutrients";
import { FOOD_GROUPS } from "@/features/tables/domain/food-groups";
import {
    HOUSEHOLD_MEASURE_CODES,
    HOUSEHOLD_MEASURE_OPTIONS,
    HouseholdMeasureCode,
    parseHouseholdMeasureValue,
    toHouseholdMeasureLabel,
} from "@/features/tables/domain/household-measures";
import {
    AMINO_ACID_REFERENCE_PROFILE,
    AminoAcidKey,
    AminoAcidProfileInput,
    calculateAminoAcidProfile,
    hasAminoAcidProfileInput,
    parsePositiveNumber,
    toAminoAcidProfileInput,
} from "@/features/tables/domain/amino-acids";
import { checkAnnexXxNutritionClaims, NutritionClaimStatus } from "@/features/tables/domain/annex-xx-claims";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { renderElementAsSvg } from "@/lib/render-element-svg";
import { normalizeLupaStyleConfig, type LupaStyleConfig } from "@/features/tables/domain/fop-lupa";

type ExcelTableType =
    | "VERT"
    | "HORIZ"
    | "VERT-QUEB"
    | "HORIZ-QUEB"
    | "LINEAR"
    | "AGREGADO"
    | "SIMPLIF"
    | "B2B"
    | "ADICAO"
    | "100"
    | "SUPLEM"
    | "SUPLEM-POP";

type ImageExportFormat = "png" | "jpeg" | "webp" | "svg";
type RasterImageExportFormat = Exclude<ImageExportFormat, "svg">;
type ServingsDeclarationMode = "auto" | "manual";
type ComplianceProfile = "general" | "bottled-water" | "iodized-salt" | "flour" | "annex-xvi";
type FopReferenceMode = "as-sold" | "prepared";
type RegulatoryCategory =
    | "general-food"
    | "supplement"
    | "special-purpose"
    | "infant-formula"
    | "enteral-formula"
    | "metabolic-formula"
    | "lactose-restriction"
    | "hyposodium-salt";
type ExtraConstituent = {
    id: string;
    name: string;
    amount: string;
    unit: string;
};
type ExportFile = {
    fileName: string;
    blob: Blob;
};
type TableUiState = {
    productDescription?: string;
    selectedGroup?: string;
    selectedProduct?: string;
    packageContent?: number;
    servingsDeclarationMode?: ServingsDeclarationMode;
    servingsPerPackageManual?: string;
    useIndividualPackagePortion?: boolean;
    useUnitFractionMeasure?: boolean;
    unitWeightForFraction?: string;
    regulatoryScenario?: RegulatoryScenario;
    regulatoryCategory?: RegulatoryCategory;
    isSupplement?: boolean;
    extraConstituents?: ExtraConstituent[];
    selectedNutrients?: string[];
    manualMicronutrients?: ManualMicronutrientValues;
    selectedTableTypes?: ExcelTableType[];
    selectedImageFormats?: ImageExportFormat[];
    includeFopSealOnImageExport?: boolean;
    enableFopLupa?: boolean;
    previewTableType?: ExcelTableType;
    enableStrictCompliance?: boolean;
    complianceProfile?: ComplianceProfile;
    fopFoodType?: FOPFoodType;
    fopReferenceMode?: FopReferenceMode;
    preparedSugarAdded?: number;
    preparedFatSat?: number;
    preparedSodium?: number;
    iodizedSaltStatement?: string;
    flourStatement?: string;
    aminoAcidProfile?: AminoAcidProfileInput;
    aminoAcidProteinOverride?: string;
    aminoAcidSectionOpen?: boolean;
    aminoAcidNotApplicable?: boolean;
    enablePreparationSimulator?: boolean;
    preparationSectionOpen?: boolean;
    preparationInstructions?: string;
    preparationReadyPortionSize?: string;
    preparationPowderBatchWeight?: string;
    preparationPowderPortionSize?: string;
    preparationFinalYield?: string;
    preparationIngredients?: SelectedIngredient[];
    lupaStyle?: LupaStyleConfig;
};

const EXCEL_TABLE_OPTIONS: Array<{ value: ExcelTableType; label: string }> = [
    { value: "VERT", label: "Vertical" },
    { value: "HORIZ", label: "Horizontal" },
    { value: "VERT-QUEB", label: "Vertical Quebrado" },
    { value: "HORIZ-QUEB", label: "Horizontal Quebrado" },
    { value: "LINEAR", label: "Linear" },
    { value: "AGREGADO", label: "Agregado" },
    { value: "SIMPLIF", label: "Simplificada" },
    { value: "B2B", label: "B2B" },
    { value: "ADICAO", label: "Adição de Ingredientes" },
    { value: "100", label: "Porção = 100 g/ml" },
    { value: "SUPLEM", label: "Suplementos" },
    { value: "SUPLEM-POP", label: "Suplementos por Grupo" },
];

const DEFAULT_IMAGE_EXPORT_FORMATS: ImageExportFormat[] = ["png"];
const IMAGE_EXPORT_FORMAT_OPTIONS: Array<{ value: ImageExportFormat; label: string }> = [
    { value: "png", label: "PNG (Recomendado)" },
    { value: "svg", label: "SVG (Vetor)" },
    { value: "jpeg", label: "JPEG" },
    { value: "webp", label: "WEBP" },
];
const SUPPLEMENT_TABLE_TYPES: ExcelTableType[] = ["SUPLEM", "SUPLEM-POP"];
const DEFAULT_NON_SUPPLEMENT_TABLE_TYPE: ExcelTableType = "VERT";
const COMPLIANCE_PROFILE_OPTIONS: Array<{ value: ComplianceProfile; label: string }> = [
    { value: "general", label: "Alimento geral (sem exceção específica)" },
    { value: "bottled-water", label: "Água envasada (fora do escopo RDC 429/IN 75)" },
    { value: "iodized-salt", label: "Sal iodado para consumo humano" },
    { value: "flour", label: "Farinha de trigo/milho enriquecida" },
    { value: "annex-xvi", label: "Categoria com vedação de lupa (Anexo XVI IN 75)" },
];
const REGULATORY_CATEGORY_OPTIONS: Array<{ value: RegulatoryCategory; label: string }> = [
    { value: "general-food", label: "Alimento em geral" },
    { value: "supplement", label: "Suplemento alimentar" },
    { value: "special-purpose", label: "Alimento para fins especiais" },
    { value: "infant-formula", label: "Fórmula infantil" },
    { value: "enteral-formula", label: "Fórmula para nutrição enteral" },
    { value: "metabolic-formula", label: "Fórmula dietoterápica" },
    { value: "lactose-restriction", label: "Dieta com restrição de lactose" },
    { value: "hyposodium-salt", label: "Sal hipossódico" },
];
const CLAIM_STATUS_STYLES: Record<NutritionClaimStatus, { label: string; className: string }> = {
    allowed: {
        label: "Pode",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300",
    },
    attention: {
        label: "Atenção",
        className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
    },
    blocked: {
        label: "Não pode",
        className: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",
    },
};

const NO_DAILY_VALUE_CATEGORIES: RegulatoryCategory[] = [
    "infant-formula",
    "enteral-formula",
    "metabolic-formula",
];
const INGREDIENT_QUANTITY_STEP = "0.0000001";
const PANEL_CLASS = "app-panel";
const PANEL_MUTED_CLASS = "app-panel-muted";
const PANEL_HEADER_CLASS = "app-panel-header";
const PANEL_EYEBROW_CLASS = "app-eyebrow";

function normalizeText(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function parseDecimalInput(value: string) {
    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
}

function gcd(a: number, b: number): number {
    let x = Math.abs(a);
    let y = Math.abs(b);

    while (y) {
        const next = x % y;
        x = y;
        y = next;
    }

    return x || 1;
}

function toScaledInteger(value: number) {
    return Math.round(value * 10_000_000);
}

function formatUnitFraction(portion: number, unitWeight: number) {
    if (portion <= 0 || unitWeight <= 0) return "";

    let numerator = toScaledInteger(portion);
    let denominator = toScaledInteger(unitWeight);
    const divisor = gcd(numerator, denominator);
    numerator = numerator / divisor;
    denominator = denominator / divisor;

    if (denominator === 1) {
        return `${numerator} ${numerator === 1 ? "unidade" : "unidades"}`;
    }

    if (numerator > denominator) {
        const whole = Math.floor(numerator / denominator);
        const remainder = numerator % denominator;
        return `${whole} ${remainder}/${denominator} unidade`;
    }

    return `${numerator}/${denominator} unidade`;
}

function getIndividualPackagePortion(referencePortion: number, packageContent: number) {
    if (referencePortion <= 0 || packageContent <= 0) return null;

    const useFullPackage = packageContent < referencePortion * 2;
    const portion = useFullPackage ? packageContent : referencePortion;

    return {
        portion,
        unitWeight: packageContent,
        measure: formatUnitFraction(portion, packageContent),
        useFullPackage,
    };
}

function formatWeight(value: number) {
    if (!Number.isFinite(value) || value === 0) return "0";
    if (Math.abs(value) < 0.001) return value.toFixed(7).replace(/0+$/, "").replace(/\.$/, "");
    return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function formatQuantityInput(value: number) {
    if (!Number.isFinite(value) || value === 0) return "";
    if (Math.abs(value) < 0.000001) return value.toFixed(7);
    return String(value);
}

function isImageExportFormat(value: unknown): value is ImageExportFormat {
    return typeof value === "string" && IMAGE_EXPORT_FORMAT_OPTIONS.some((item) => item.value === value);
}

function normalizeImageExportFormats(value: unknown): ImageExportFormat[] {
    if (!Array.isArray(value)) return DEFAULT_IMAGE_EXPORT_FORMATS;

    const formats = value.filter(isImageExportFormat);
    return formats.length > 0 ? Array.from(new Set(formats)) : DEFAULT_IMAGE_EXPORT_FORMATS;
}

function isRasterImageExportFormat(format: ImageExportFormat): format is RasterImageExportFormat {
    return format !== "svg";
}

function getRasterImageMime(format: RasterImageExportFormat) {
    if (format === "jpeg") return "image/jpeg";
    if (format === "webp") return "image/webp";
    return "image/png";
}

function toTableUiState(value: unknown): TableUiState {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }
    return value as TableUiState;
}

function calculateServingsPerPackage(portionSize: number, packageContent: number) {
    const EPSILON = 1e-6;
    if (portionSize <= 0 || packageContent <= 0) return "-";

    const servings = packageContent / portionSize;
    if (!Number.isFinite(servings) || servings <= EPSILON) return "-";

    const rounded = Math.round(servings);
    const isInteger = Math.abs(servings - rounded) <= EPSILON;

    // RDC 429/2020 define embalagem individual como <= 2 porções.
    if (isInteger) {
        return rounded >= 3 ? String(rounded) : "-";
    }

    // IN 75/2020 Anexo VI: > 2 porções não inteiras deve ser expresso como "Cerca de N".
    if (servings > 2 + EPSILON) {
        return `Cerca de ${rounded}`;
    }

    return "-";
}

interface TableGeneratorProps {
    canUseOpenFoodFacts?: boolean;
    canExport?: boolean;
    tenantLupaStyle?: unknown;
    initialData?: {
        id: string;
        title: string;
        portionSize: number;
        householdMeasure: string;
        popGroup: string;
        ingredients: SelectedIngredient[];
        packageContent?: number;
        servingsPerPackage?: string;
        suggestedFoodGroup?: string;
        suggestedProduct?: string;
        uiState?: unknown;
    };
}

export function TableGenerator({
    initialData,
    canUseOpenFoodFacts = false,
    canExport = false,
    tenantLupaStyle,
}: TableGeneratorProps) {
    const initialMeasure = initialData?.householdMeasure || "";
    const savedUiState: TableUiState = toTableUiState(initialData?.uiState);
    const effectiveLupaStyle = normalizeLupaStyleConfig(savedUiState.lupaStyle ?? tenantLupaStyle);
    const [tableId, setTableId] = useState(initialData?.id || "");
    const [title, setTitle] = useState(initialData?.title || "");
    const [productDescription, setProductDescription] = useState(savedUiState.productDescription || "");
    const [ingredients, setIngredients] = useState<SelectedIngredient[]>(initialData?.ingredients || []);
    const [portionSize, setPortionSize] = useState<number>(initialData?.portionSize || 0);
    const [householdMeasureCode, setHouseholdMeasureCode] = useState<HouseholdMeasureCode>(
        () => parseHouseholdMeasureValue(initialMeasure).code
    );
    const [householdMeasureCustom, setHouseholdMeasureCustom] = useState(
        () => parseHouseholdMeasureValue(initialMeasure).customValue
    );
    const [packageContent, setPackageContent] = useState<number>(initialData?.packageContent || 0);
    const [servingsDeclarationMode, setServingsDeclarationMode] = useState<ServingsDeclarationMode>(
        savedUiState.servingsDeclarationMode || "auto"
    );
    const [servingsPerPackageManual, setServingsPerPackageManual] = useState<string>(
        savedUiState.servingsPerPackageManual || initialData?.servingsPerPackage || ""
    );
    const [useIndividualPackagePortion, setUseIndividualPackagePortion] = useState(savedUiState.useIndividualPackagePortion ?? false);
    const [useUnitFractionMeasure, setUseUnitFractionMeasure] = useState(savedUiState.useUnitFractionMeasure ?? false);
    const [unitWeightForFraction, setUnitWeightForFraction] = useState(savedUiState.unitWeightForFraction || "");
    const [isSupplement, setIsSupplement] = useState(!!savedUiState.isSupplement);
    const [regulatoryCategory, setRegulatoryCategory] = useState<RegulatoryCategory>(
        savedUiState.regulatoryCategory || (savedUiState.isSupplement ? "supplement" : "general-food")
    );
    const [extraConstituents, setExtraConstituents] = useState<ExtraConstituent[]>(
        Array.isArray(savedUiState.extraConstituents) ? savedUiState.extraConstituents : []
    );
    const [enablePreparationSimulator, setEnablePreparationSimulator] = useState(savedUiState.enablePreparationSimulator ?? false);
    const [preparationSectionOpen, setPreparationSectionOpen] = useState(savedUiState.preparationSectionOpen ?? false);
    const [preparationInstructions, setPreparationInstructions] = useState(savedUiState.preparationInstructions || "");
    const [preparationReadyPortionSize, setPreparationReadyPortionSize] = useState(savedUiState.preparationReadyPortionSize || "");
    const [preparationPowderBatchWeight, setPreparationPowderBatchWeight] = useState(savedUiState.preparationPowderBatchWeight || "");
    const [preparationPowderPortionSize, setPreparationPowderPortionSize] = useState(savedUiState.preparationPowderPortionSize || "");
    const [preparationFinalYield, setPreparationFinalYield] = useState(savedUiState.preparationFinalYield || "");
    const [preparationIngredients, setPreparationIngredients] = useState<SelectedIngredient[]>(
        Array.isArray(savedUiState.preparationIngredients) ? savedUiState.preparationIngredients : []
    );
    const initialRegulatoryScenario: RegulatoryScenario =
        savedUiState.regulatoryScenario ||
        (savedUiState.isSupplement ||
        savedUiState.regulatoryCategory === "supplement" ||
        savedUiState.regulatoryCategory === "special-purpose" ||
        isSpecificPopulationGroup((initialData?.popGroup as PopGroup) || POPULATION_GROUPS.ADULTS)
            ? "specific"
            : "general");
    const [regulatoryScenario, setRegulatoryScenario] = useState<RegulatoryScenario>(initialRegulatoryScenario);
    const [popGroup, setPopGroup] = useState<PopGroup>(() =>
        normalizePopulationGroupForScenario(
            initialRegulatoryScenario,
            (initialData?.popGroup as PopGroup) || POPULATION_GROUPS.ADULTS
        )
    );
    const [selectedNutrients, setSelectedNutrients] = useState<string[]>(savedUiState.selectedNutrients || []);
    const [manualMicronutrients, setManualMicronutrients] = useState<ManualMicronutrientValues>(() =>
        normalizeManualMicronutrients(savedUiState.manualMicronutrients)
    );
    const [selectedTableTypes, setSelectedTableTypes] = useState<ExcelTableType[]>(
        savedUiState.selectedTableTypes && savedUiState.selectedTableTypes.length > 0
            ? savedUiState.selectedTableTypes
            : EXCEL_TABLE_OPTIONS.filter((item) => !SUPPLEMENT_TABLE_TYPES.includes(item.value)).map((item) => item.value)
    );
    const [selectedImageFormats, setSelectedImageFormats] = useState<ImageExportFormat[]>(
        () => normalizeImageExportFormats(savedUiState.selectedImageFormats)
    );
    const [includeFopSealOnImageExport, setIncludeFopSealOnImageExport] = useState(
        savedUiState.includeFopSealOnImageExport ?? true
    );
    const [enableFopLupa, setEnableFopLupa] = useState(savedUiState.enableFopLupa ?? true);
    const [enableStrictCompliance, setEnableStrictCompliance] = useState(savedUiState.enableStrictCompliance ?? true);
    const [complianceProfile, setComplianceProfile] = useState<ComplianceProfile>(savedUiState.complianceProfile || "general");
    const [fopFoodType, setFopFoodType] = useState<FOPFoodType>(
        savedUiState.fopFoodType || inferFopFoodType(initialMeasure)
    );
    const [fopReferenceMode, setFopReferenceMode] = useState<FopReferenceMode>(savedUiState.fopReferenceMode || "as-sold");
    const [preparedSugarAdded, setPreparedSugarAdded] = useState<number>(savedUiState.preparedSugarAdded || 0);
    const [preparedFatSat, setPreparedFatSat] = useState<number>(savedUiState.preparedFatSat || 0);
    const [preparedSodium, setPreparedSodium] = useState<number>(savedUiState.preparedSodium || 0);
    const [iodizedSaltStatement, setIodizedSaltStatement] = useState(
        savedUiState.iodizedSaltStatement || "Este produto é enriquecido com 15 mg a 45 mg de iodo por quilograma."
    );
    const [flourStatement, setFlourStatement] = useState(
        savedUiState.flourStatement || "Este produto é enriquecido com ferro e ácido fólico."
    );
    const [aminoAcidProfile, setAminoAcidProfile] = useState<AminoAcidProfileInput>(() =>
        toAminoAcidProfileInput(savedUiState.aminoAcidProfile)
    );
    const [aminoAcidProteinOverride, setAminoAcidProteinOverride] = useState(
        savedUiState.aminoAcidProteinOverride || ""
    );
    const [aminoAcidNotApplicable, setAminoAcidNotApplicable] = useState(savedUiState.aminoAcidNotApplicable ?? false);
    const [aminoAcidSectionOpen, setAminoAcidSectionOpen] = useState(
        savedUiState.aminoAcidSectionOpen ?? !(savedUiState.aminoAcidNotApplicable ?? false)
    );
    const [nutritionClaimsSectionOpen, setNutritionClaimsSectionOpen] = useState(false);
    const [vdrSectionOpen, setVdrSectionOpen] = useState(false);
    const [micronutrientsSectionOpen, setMicronutrientsSectionOpen] = useState(false);
    const [extraConstituentsSectionOpen, setExtraConstituentsSectionOpen] = useState(false);
    const [previewTableType, setPreviewTableType] = useState<ExcelTableType>(savedUiState.previewTableType || "VERT");
    const [saving, setSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [exitDialogOpen, setExitDialogOpen] = useState(false);
    const [pendingExitUrl, setPendingExitUrl] = useState<string | null>(null);
    const suppressBeforeUnloadRef = React.useRef(false);
    const [measureSuggestionsExpanded, setMeasureSuggestionsExpanded] = useState(true);

    // New state for selectors
    const [selectedGroup, setSelectedGroup] = useState<string>(initialData?.suggestedFoodGroup || savedUiState.selectedGroup || "");
    const [selectedProduct, setSelectedProduct] = useState<string>(initialData?.suggestedProduct || savedUiState.selectedProduct || "");

    const [result, setResult] = useState<{
        per100g: CalculatedNutrients;
        perPortion: CalculatedNutrients;
        totalWeight?: number;
        memorial?: PreparedProductCalculation["memorial"];
    } | null>(null);
    const tableUiStorageKey = React.useMemo(
        () => (tableId ? `table-generator-ui:${tableId}` : ""),
        [tableId]
    );

    const selectedOfficialProduct = React.useMemo(() => {
        const group = FOOD_GROUPS.find((item) => item.group === selectedGroup);
        return group?.products.find((item) => item.name === selectedProduct);
    }, [selectedGroup, selectedProduct]);
    const currentMeasureSuggestedPortion = selectedOfficialProduct?.portion;
    const individualPackagePortion = React.useMemo(
        () => getIndividualPackagePortion(currentMeasureSuggestedPortion || 0, packageContent),
        [currentMeasureSuggestedPortion, packageContent]
    );
    const isUsingIndividualPackagePortion =
        useIndividualPackagePortion &&
        !!individualPackagePortion &&
        Math.abs(portionSize - individualPackagePortion.portion) < 0.0001;
    const isUsingSuggestedPortion =
        typeof currentMeasureSuggestedPortion === "number" &&
        Math.abs(portionSize - currentMeasureSuggestedPortion) < 0.0001;
    const suggestedMeasuresForCurrentPortion: Array<{
        code: HouseholdMeasureCode;
        label: string;
        suggestedPortion: number;
    }> = [];

    const baseHouseholdMeasure = toHouseholdMeasureLabel(householdMeasureCode, householdMeasureCustom);
    const unitFractionLabel = React.useMemo(
        () => formatUnitFraction(portionSize, parseDecimalInput(unitWeightForFraction)),
        [portionSize, unitWeightForFraction]
    );
    const householdMeasure = useUnitFractionMeasure && unitFractionLabel ? unitFractionLabel : baseHouseholdMeasure;
    const servingsPerPackageAuto = React.useMemo(
        () => calculateServingsPerPackage(portionSize, packageContent),
        [portionSize, packageContent]
    );
    const servingsPerPackage = React.useMemo(() => {
        if (servingsDeclarationMode === "manual") {
            const manualValue = servingsPerPackageManual.trim();
            return manualValue || servingsPerPackageAuto;
        }
        return servingsPerPackageAuto;
    }, [servingsDeclarationMode, servingsPerPackageManual, servingsPerPackageAuto]);
    const currentTableSnapshot = JSON.stringify({
        title,
        portionSize,
        householdMeasure,
        popGroup,
        ingredients,
        productDescription,
        selectedGroup,
        selectedProduct,
        packageContent,
        servingsDeclarationMode,
        servingsPerPackageManual,
        useIndividualPackagePortion,
        useUnitFractionMeasure,
        unitWeightForFraction,
        regulatoryScenario,
        regulatoryCategory,
        isSupplement,
        extraConstituents,
        enablePreparationSimulator,
        preparationSectionOpen,
        preparationInstructions,
        preparationReadyPortionSize,
        preparationPowderBatchWeight,
        preparationPowderPortionSize,
        preparationFinalYield,
        preparationIngredients,
        selectedNutrients,
        manualMicronutrients,
        selectedTableTypes,
        selectedImageFormats,
        includeFopSealOnImageExport,
        enableFopLupa,
        previewTableType,
        enableStrictCompliance,
        complianceProfile,
        fopFoodType,
        fopReferenceMode,
        preparedSugarAdded,
        preparedFatSat,
        preparedSodium,
        iodizedSaltStatement,
        flourStatement,
        aminoAcidProfile,
        aminoAcidProteinOverride,
        aminoAcidSectionOpen,
        aminoAcidNotApplicable,
    });
    const currentTableSnapshotRef = React.useRef(currentTableSnapshot);
    const lastSavedSnapshotRef = React.useRef<string | null>(null);
    currentTableSnapshotRef.current = currentTableSnapshot;
    const preparationReadyPortion = parseDecimalInput(preparationReadyPortionSize);
    const preparationPowderBatch = parseDecimalInput(preparationPowderBatchWeight);
    const preparationYield = parseDecimalInput(preparationFinalYield);
    const calculatedPowderPortion = preparationYield > 0
        ? preparationPowderBatch * (preparationReadyPortion / preparationYield)
        : 0;
    const preparationPowderPortion = parseDecimalInput(preparationPowderPortionSize) || calculatedPowderPortion;
    const preparationIngredientsWeight = preparationIngredients.reduce((sum, item) => sum + Math.max(0, item.quantity || 0), 0);
    const preparationTotalBeforeHeat = preparationPowderBatch + preparationIngredientsWeight;
    const preparationLoss = Math.max(0, preparationTotalBeforeHeat - preparationYield);
    const preparationLossPercent = preparationTotalBeforeHeat > 0 ? (preparationLoss / preparationTotalBeforeHeat) * 100 : 0;

    const preparedReference = React.useMemo(
        () => ({
            sugarAdded: enablePreparationSimulator && result ? result.per100g.sugarAdded : preparedSugarAdded,
            fatSat: enablePreparationSimulator && result ? result.per100g.fatSat : preparedFatSat,
            sodium: enablePreparationSimulator && result ? result.per100g.sodium : preparedSodium,
        }),
        [enablePreparationSimulator, preparedSugarAdded, preparedFatSat, preparedSodium, result]
    );

    const fopReference = React.useMemo(() => {
        if (!result) return null;
        if (fopReferenceMode === "prepared") {
            return preparedReference;
        }
        return {
            sugarAdded: result.per100g.sugarAdded || 0,
            fatSat: result.per100g.fatSat || 0,
            sodium: result.per100g.sodium || 0,
        };
    }, [fopReferenceMode, preparedReference, result]);

    const isExcludedFromRdc429 = complianceProfile === "bottled-water";
    const isFopForbiddenByCategory = complianceProfile === "annex-xvi";
    const requiresIodizedSaltStatement = complianceProfile === "iodized-salt";
    const requiresFlourStatement = complianceProfile === "flour";
    const showDailyValue = !NO_DAILY_VALUE_CATEGORIES.includes(regulatoryCategory);

    const fopStatus = fopReference ? checkFOP(fopReference, fopFoodType) : null;
    const hasFopSeal = !!(fopStatus && (fopStatus.highSugar || fopStatus.highFat || fopStatus.highSodium));
    const effectiveHasFopSeal = !isExcludedFromRdc429 && !isFopForbiddenByCategory && hasFopSeal;
    const shouldShowFopSeal = effectiveHasFopSeal && enableFopLupa;
    const mandatoryStatements = React.useMemo(() => {
        if (isExcludedFromRdc429) return [] as string[];
        const statements: string[] = [];
        if (requiresIodizedSaltStatement && iodizedSaltStatement.trim()) {
            statements.push(iodizedSaltStatement.trim());
        }
        if (requiresFlourStatement && flourStatement.trim()) {
            statements.push(flourStatement.trim());
        }
        return statements;
    }, [flourStatement, iodizedSaltStatement, isExcludedFromRdc429, requiresFlourStatement, requiresIodizedSaltStatement]);
    const aminoAcidProteinPer100g = React.useMemo(() => {
        const override = parsePositiveNumber(aminoAcidProteinOverride);
        if (override !== null && override > 0) return override;
        return result?.per100g.protein || 0;
    }, [aminoAcidProteinOverride, result]);
    const aminoAcidResults = React.useMemo(
        () => calculateAminoAcidProfile(aminoAcidProfile, aminoAcidProteinPer100g),
        [aminoAcidProfile, aminoAcidProteinPer100g]
    );
    const hasAminoAcidInput = hasAminoAcidProfileInput(aminoAcidProfile);
    const filledAminoAcidResults = aminoAcidResults.filter((item) => item.compliant !== null);
    const aminoAcidMissingCount = aminoAcidResults.length - filledAminoAcidResults.length;
    const aminoAcidFailCount = filledAminoAcidResults.filter((item) => item.compliant === false).length;
    const aminoAcidPassCount = filledAminoAcidResults.filter((item) => item.compliant === true).length;
    const aminoAcidProfileStatus =
        filledAminoAcidResults.length === 0 || aminoAcidProteinPer100g <= 0
            ? "Preencha o perfil para calcular."
            : aminoAcidFailCount === 0 && aminoAcidMissingCount === 0
                ? "Perfil atende ao Anexo XXI."
                : `${aminoAcidPassCount} dentro, ${aminoAcidFailCount} fora, ${aminoAcidMissingCount} sem dado.`;
    const nutritionClaims = React.useMemo(() => {
        if (!result) return [];
        return checkAnnexXxNutritionClaims({
            per100g: result.per100g,
            perPortion: result.perPortion,
            portionSize,
            aminoAcids: aminoAcidNotApplicable ? [] : aminoAcidResults,
            highSodiumFop: !!fopStatus?.highSodium,
        });
    }, [aminoAcidNotApplicable, aminoAcidResults, fopStatus, portionSize, result]);

    const complianceWarnings = React.useMemo(() => {
        if (!enableStrictCompliance) return [] as string[];
        const warnings: string[] = [];

        if (isExcludedFromRdc429) {
            warnings.push("Produto marcado como água envasada: tabela/lupa da RDC 429/IN 75 não se aplica.");
        }

        if (isFopForbiddenByCategory) {
            warnings.push("Categoria marcada como vedada no Anexo XVI: não exibir lupa frontal.");
        }

        if (fopReferenceMode === "prepared") {
            warnings.push("Lupa está sendo calculada por alimento pronto para consumo (Art. 19, parágrafo único, RDC 429/2020).");
        }

        if (!showDailyValue) {
            warnings.push("Categoria selecionada dispensa %VD: a tabela não deve declarar percentual de valores diários.");
        }

        if (regulatoryCategory === "supplement") {
            warnings.push("Suplemento: a porção deve corresponder à quantidade diária recomendada para o grupo populacional indicado.");
            warnings.push("Validar constituintes, limites mínimos/máximos, alegações e rotulagem complementar na IN 28/2018 e atualizações.");
        }

        if (regulatoryCategory === "lactose-restriction") {
            warnings.push("Restrição de lactose: declarar lactose e galactose na tabela.");
        }

        if (regulatoryCategory === "hyposodium-salt") {
            warnings.push("Sal hipossódico: declarar potássio na tabela.");
        }

        if (regulatoryCategory === "infant-formula") {
            warnings.push("Fórmula infantil: declarar vitaminas/minerais e DHA, ARA, taurina, L-carnitina, nucleotídeos, FOS, GOS e outros nutrientes quando adicionados.");
        }

        if (regulatoryCategory === "enteral-formula") {
            warnings.push("Nutrição enteral: declarar monoinsaturadas, poli-insaturadas, ômega 6, ômega 3, colesterol, vitaminas, minerais e nutrientes adicionados.");
        }

        if (regulatoryCategory === "metabolic-formula") {
            warnings.push("Fórmula dietoterápica: declarar substâncias associadas ao erro inato do metabolismo indicado.");
        }

        if (servingsDeclarationMode === "manual" && servingsPerPackageManual.trim().length === 0) {
            warnings.push("Declaração manual de porções por embalagem está vazia.");
        }

        if (requiresIodizedSaltStatement) {
            warnings.push("Validar frase obrigatória de sal iodado próxima à tabela.");
        }

        if (requiresFlourStatement) {
            warnings.push("Validar frase obrigatória de enriquecimento da farinha próxima à tabela.");
        }

        return warnings;
    }, [
        enableStrictCompliance,
        isExcludedFromRdc429,
        isFopForbiddenByCategory,
        fopReferenceMode,
        showDailyValue,
        regulatoryCategory,
        servingsDeclarationMode,
        servingsPerPackageManual,
        requiresIodizedSaltStatement,
        requiresFlourStatement,
    ]);
    const imageExportTableTypes = React.useMemo(
        () => (selectedTableTypes.length > 0 ? selectedTableTypes : [previewTableType]),
        [selectedTableTypes, previewTableType]
    );
    const selectedImageTableCount = selectedTableTypes.length > 0 ? selectedTableTypes.length : 1;
    const previewViewportRef = React.useRef<HTMLDivElement>(null);
    const previewContentRef = React.useRef<HTMLDivElement>(null);
    const [previewScale, setPreviewScale] = useState(1);
    const isExactHundredPortion = Math.abs(Number(portionSize) - 100) < 0.001;
    const availableTableOptionValues = React.useMemo(
        () =>
            EXCEL_TABLE_OPTIONS
                .filter((item) => {
                    if (isSupplement) {
                        return SUPPLEMENT_TABLE_TYPES.includes(item.value);
                    }
                    if (item.value === "100") {
                        return isExactHundredPortion;
                    }
                    return !SUPPLEMENT_TABLE_TYPES.includes(item.value);
                })
                .map((item) => item.value),
        [isExactHundredPortion, isSupplement]
    );
    const availableTableOptions = React.useMemo(
        () => EXCEL_TABLE_OPTIONS.filter((item) => availableTableOptionValues.includes(item.value)),
        [availableTableOptionValues]
    );
    const previewTableOptions = React.useMemo(
        () => EXCEL_TABLE_OPTIONS.filter((item) => item.value !== "100" || isExactHundredPortion),
        [isExactHundredPortion]
    );

    useEffect(() => {
        const availablePreview = new Set(previewTableOptions.map((item) => item.value));
        const availableExport = new Set(availableTableOptionValues);
        if (!availablePreview.has(previewTableType)) {
            const nextPreview = previewTableOptions[0]?.value || "VERT";
            setPreviewTableType(nextPreview);
            setSelectedTableTypes([nextPreview]);
            return;
        }
        setSelectedTableTypes((prev) => {
            const next = prev.filter((item) => availableExport.has(item));
            return next.length === prev.length ? prev : next;
        });
    }, [availableTableOptionValues, previewTableOptions, previewTableType]);

    useEffect(() => {
        if (!result) return;

        const viewport = previewViewportRef.current;
        const content = previewContentRef.current;
        if (!viewport || !content) return;

        let rafId = 0;
        const updatePreviewSize = () => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                const availableWidth = viewport.clientWidth;
                const contentWidth = Math.max(content.scrollWidth, content.offsetWidth);
                if (availableWidth <= 0 || contentWidth <= 0) return;

                const nextScale = Math.min(1, availableWidth / contentWidth);
                const roundedScale = Math.floor(nextScale * 10000) / 10000;

                setPreviewScale((current) => (Math.abs(current - roundedScale) > 0.0001 ? roundedScale : current));
            });
        };

        updatePreviewSize();
        const resizeObserver = new ResizeObserver(updatePreviewSize);
        resizeObserver.observe(viewport);
        window.addEventListener("resize", updatePreviewSize);

        return () => {
            cancelAnimationFrame(rafId);
            resizeObserver.disconnect();
            window.removeEventListener("resize", updatePreviewSize);
        };
    }, [
        householdMeasure,
        popGroup,
        portionSize,
        previewTableType,
        result,
        selectedNutrients,
        servingsPerPackage,
    ]);

    const handleGroupChange = (group: string) => {
        setSelectedGroup(group);
        setSelectedProduct(""); // Reset product when group changes
    };

    const handleProductChange = (prodName: string) => {
        setSelectedProduct(prodName);
        const group = FOOD_GROUPS.find(g => g.group === selectedGroup);
        const product = group?.products.find(p => p.name === prodName);

        if (product) {
            setTitle(product.name);
            setPortionSize(product.portion);
            const parsedMeasure = parseHouseholdMeasureValue(product.measure);
            setHouseholdMeasureCode(parsedMeasure.code);
            setHouseholdMeasureCustom(parsedMeasure.customValue);
        }
    };

    const handleHouseholdMeasureCodeChange = (value: string) => {
        const code = value as HouseholdMeasureCode;
        setHouseholdMeasureCode(code);
        if (code !== HOUSEHOLD_MEASURE_CODES.OTHER) {
            setHouseholdMeasureCustom("");
        }
    };

    const applySuggestedMeasureForCurrentPortion = (suggestion: {
        code: HouseholdMeasureCode;
        label: string;
        suggestedPortion: number;
    }) => {
        setHouseholdMeasureCode(suggestion.code);
        setHouseholdMeasureCustom("");
        if (suggestion.suggestedPortion > 0) {
            setPortionSize(suggestion.suggestedPortion);
        }
        setMeasureSuggestionsExpanded(false);
        toast.success(`Medida ajustada para ${suggestion.label}.`);
    };

    const toggleNutrient = (name: MicronutrientKey) => {
        setSelectedNutrients(prev =>
            prev.includes(name)
                ? prev.filter(n => n !== name)
                : [...prev, name]
        );
        setManualMicronutrients((previous) => {
            if (!(name in previous)) return previous;
            const next = { ...previous };
            delete next[name];
            return next;
        });
    };

    const updateManualMicronutrient = (name: MicronutrientKey, value: string) => {
        setManualMicronutrients((previous) => {
            const next = { ...previous };
            if (value.trim()) next[name] = value;
            else delete next[name];
            return next;
        });
    };

    const toggleTableType = (type: ExcelTableType) => {
        setSelectedTableTypes((prev) => {
            if (prev.includes(type)) {
                return prev.filter((item) => item !== type);
            }
            return [...prev, type];
        });
    };

    const toggleImageFormat = (format: ImageExportFormat) => {
        setSelectedImageFormats((prev) => (
            prev.includes(format) ? prev.filter((item) => item !== format) : [...prev, format]
        ));
    };

    const handlePreviewTypeChange = (value: string) => {
        const selected = value as ExcelTableType;
        if (!previewTableOptions.some((item) => item.value === selected)) {
            return;
        }
        const nextIsSupplement = SUPPLEMENT_TABLE_TYPES.includes(selected);
        setIsSupplement(nextIsSupplement);
        if (nextIsSupplement) {
            setRegulatoryScenario("specific");
            setPopGroup((current) => normalizePopulationGroupForScenario("specific", current));
        }
        setPreviewTableType(selected);
        setSelectedTableTypes([selected]);
    };

    const addExtraConstituent = (preset?: Partial<ExtraConstituent>) => {
        setExtraConstituents((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                name: preset?.name || "",
                amount: preset?.amount || "",
                unit: preset?.unit || "mg",
            },
        ]);
    };

    const updateExtraConstituent = <K extends keyof ExtraConstituent>(
        id: string,
        field: K,
        value: ExtraConstituent[K]
    ) => {
        setExtraConstituents((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    };

    const removeExtraConstituent = (id: string) => {
        setExtraConstituents((prev) => prev.filter((item) => item.id !== id));
    };

    const handleRegulatoryCategoryChange = (value: string) => {
        const nextCategory = value as RegulatoryCategory;
        setRegulatoryCategory(nextCategory);
        const nextIsSupplement = nextCategory === "supplement";
        setIsSupplement(nextIsSupplement);

        if (nextCategory !== "general-food") {
            setRegulatoryScenario("specific");
            setPopGroup((current) => normalizePopulationGroupForScenario("specific", current));
        } else {
            setRegulatoryScenario("general");
            setPopGroup(POPULATION_GROUPS.ADULTS);
        }

        if (nextCategory === "lactose-restriction") {
            setExtraConstituents((prev) => {
                const existing = new Set(prev.map((item) => normalizeText(item.name)));
                const additions: ExtraConstituent[] = [];
                if (!existing.has("lactose")) additions.push({ id: crypto.randomUUID(), name: "Lactose", amount: "", unit: "g" });
                if (!existing.has("galactose")) additions.push({ id: crypto.randomUUID(), name: "Galactose", amount: "", unit: "g" });
                return [...prev, ...additions];
            });
        }

        if (nextCategory === "hyposodium-salt") {
            setSelectedNutrients((prev) => (prev.includes("potassium") ? prev : [...prev, "potassium"]));
        }
    };

    const handleRegulatoryScenarioChange = (value: string) => {
        const nextScenario = value as RegulatoryScenario;
        if (regulatoryCategory !== "general-food" && nextScenario === "general") return;
        setRegulatoryScenario(nextScenario);
        setPopGroup((current) => normalizePopulationGroupForScenario(nextScenario, current));
    };

    const handleSupplementChange = (checked: boolean) => {
        setIsSupplement(checked);
        setRegulatoryCategory(checked ? "supplement" : "general-food");
        if (checked) {
            setRegulatoryScenario("specific");
            setPopGroup((current) => normalizePopulationGroupForScenario("specific", current));
        } else {
            setRegulatoryScenario("general");
            setPopGroup(POPULATION_GROUPS.ADULTS);
        }
    };

    const handleAddIngredient = (ing: Ingredient) => {
        setIngredients(prev => [
            ...prev,
            {
                ingredient: ing,
                quantity: 0,
                isAddedSugar: isLikelyAddedSugarIngredient(ing.name),
            },
        ]);
    };

    const handleAddPreparationIngredient = (ing: Ingredient) => {
        setPreparationIngredients(prev => [
            ...prev,
            {
                ingredient: ing,
                quantity: 0,
                isAddedSugar: isLikelyAddedSugarIngredient(ing.name),
            },
        ]);
    };

    const updateIngredient = <K extends keyof SelectedIngredient>(
        index: number,
        field: K,
        value: SelectedIngredient[K]
    ) => {
        setIngredients(prev => {
            const newIngredients = [...prev];
            newIngredients[index] = { ...newIngredients[index], [field]: value };
            return newIngredients;
        });
    };

    const updatePreparationIngredient = <K extends keyof SelectedIngredient>(
        index: number,
        field: K,
        value: SelectedIngredient[K]
    ) => {
        setPreparationIngredients(prev => {
            const newIngredients = [...prev];
            newIngredients[index] = { ...newIngredients[index], [field]: value };
            return newIngredients;
        });
    };

    const removeIngredient = (index: number) => {
        setIngredients(prev => prev.filter((_, i) => i !== index));
    };

    const removePreparationIngredient = (index: number) => {
        setPreparationIngredients(prev => prev.filter((_, i) => i !== index));
    };

    const clearIngredients = () => {
        if (ingredients.length === 0) return;
        setIngredients([]);
        toast.success("Ingredientes limpos.");
    };

    const clearPreparationIngredients = () => {
        if (preparationIngredients.length === 0) return;
        setPreparationIngredients([]);
        toast.success("Ingredientes de preparo limpos.");
    };

    const clearSelectedMicronutrients = () => {
        if (selectedNutrients.length === 0) return;
        setSelectedNutrients([]);
        setManualMicronutrients({});
        toast.success("Micronutrientes desmarcados.");
    };

    const updateAminoAcidProfile = (key: AminoAcidKey, value: string) => {
        setAminoAcidProfile((prev) => ({ ...prev, [key]: value }));
    };

    const clearAminoAcidProfile = () => {
        if (!hasAminoAcidInput && aminoAcidProteinOverride.trim().length === 0) return;
        setAminoAcidProfile(toAminoAcidProfileInput(null));
        setAminoAcidProteinOverride("");
        toast.success("Perfil de aminoácidos limpo.");
    };

    const handleAminoAcidNotApplicableChange = (checked: boolean) => {
        setAminoAcidNotApplicable(checked);
        setAminoAcidSectionOpen(!checked);
        if (checked) {
            setAminoAcidProfile(toAminoAcidProfileInput(null));
            setAminoAcidProteinOverride("");
        }
    };

    useEffect(() => {
        if (isSupplement) {
            setRegulatoryCategory("supplement");
            setRegulatoryScenario("specific");
            setPopGroup((current) => normalizePopulationGroupForScenario("specific", current));
            setSelectedTableTypes((prev) => {
                const supplementSelected = prev.filter((type) => SUPPLEMENT_TABLE_TYPES.includes(type));
                return supplementSelected.length > 0 ? supplementSelected : [...SUPPLEMENT_TABLE_TYPES];
            });
            setPreviewTableType((prev) => (SUPPLEMENT_TABLE_TYPES.includes(prev) ? prev : "SUPLEM"));
            return;
        }

        setSelectedTableTypes((prev) => {
            const nonSupplement = prev.filter((type) => !SUPPLEMENT_TABLE_TYPES.includes(type));
            return nonSupplement.length > 0 ? nonSupplement : [DEFAULT_NON_SUPPLEMENT_TABLE_TYPE];
        });
        setPreviewTableType((prev) => (SUPPLEMENT_TABLE_TYPES.includes(prev) ? DEFAULT_NON_SUPPLEMENT_TABLE_TYPE : prev));
    }, [isSupplement]);

    useEffect(() => {
        if (!useIndividualPackagePortion || !individualPackagePortion) return;

        setPortionSize((current) => (
            Math.abs(current - individualPackagePortion.portion) > 0.0001
                ? individualPackagePortion.portion
                : current
        ));
        setUseUnitFractionMeasure(true);
        setUnitWeightForFraction(formatWeight(individualPackagePortion.unitWeight));
    }, [individualPackagePortion, useIndividualPackagePortion]);

    useEffect(() => {
        if (enablePreparationSimulator) {
            const powderPortion = preparationPowderPortion > 0 ? preparationPowderPortion : portionSize;
            const res = calculatePreparedProduct({
                powderIngredients: ingredients,
                preparationIngredients,
                powderPortionSize: powderPortion,
                powderBatchWeight: preparationPowderBatch,
                readyPortionSize: preparationReadyPortion,
                finalYield: preparationYield,
                preparationInstructions,
                extraConstituents,
            });
            setResult(applyManualMicronutrientOverrides(res, manualMicronutrients, portionSize));
            if (powderPortion > 0 && Math.abs(portionSize - powderPortion) > 0.0001) {
                setPortionSize(powderPortion);
            }
            if (fopReferenceMode !== "prepared") {
                setFopReferenceMode("prepared");
            }
            return;
        }

        const res = calculateRecipe(ingredients, portionSize, extraConstituents);
        setResult(applyManualMicronutrientOverrides(res, manualMicronutrients, portionSize));
    }, [
        enablePreparationSimulator,
        extraConstituents,
        fopReferenceMode,
        ingredients,
        portionSize,
        preparationIngredients,
        preparationInstructions,
        preparationPowderBatch,
        preparationPowderPortion,
        preparationReadyPortion,
        preparationYield,
        manualMicronutrients,
    ]);

    useEffect(() => {
        if (!tableUiStorageKey) return;
        if (initialData?.uiState) return;
        try {
            const raw = window.localStorage.getItem(tableUiStorageKey);
            if (!raw) return;
            const persisted = toTableUiState(JSON.parse(raw));

            if (typeof persisted.selectedGroup === "string") setSelectedGroup(persisted.selectedGroup);
            if (typeof persisted.selectedProduct === "string") setSelectedProduct(persisted.selectedProduct);
            if (typeof persisted.productDescription === "string") setProductDescription(persisted.productDescription);
            if (typeof persisted.packageContent === "number" && Number.isFinite(persisted.packageContent)) {
                setPackageContent(persisted.packageContent);
            }

            if (persisted.servingsDeclarationMode) setServingsDeclarationMode(persisted.servingsDeclarationMode);
            if (typeof persisted.servingsPerPackageManual === "string") setServingsPerPackageManual(persisted.servingsPerPackageManual);
            if (typeof persisted.useIndividualPackagePortion === "boolean") setUseIndividualPackagePortion(persisted.useIndividualPackagePortion);
            if (typeof persisted.useUnitFractionMeasure === "boolean") setUseUnitFractionMeasure(persisted.useUnitFractionMeasure);
            if (typeof persisted.unitWeightForFraction === "string") setUnitWeightForFraction(persisted.unitWeightForFraction);
            if (persisted.regulatoryScenario) {
                setRegulatoryScenario(persisted.regulatoryScenario);
                setPopGroup((current) => normalizePopulationGroupForScenario(persisted.regulatoryScenario!, current));
            }
            if (persisted.regulatoryCategory) setRegulatoryCategory(persisted.regulatoryCategory);
            if (Array.isArray(persisted.extraConstituents)) setExtraConstituents(persisted.extraConstituents);
            if (typeof persisted.enablePreparationSimulator === "boolean") setEnablePreparationSimulator(persisted.enablePreparationSimulator);
            if (typeof persisted.preparationSectionOpen === "boolean") setPreparationSectionOpen(persisted.preparationSectionOpen);
            if (typeof persisted.preparationInstructions === "string") setPreparationInstructions(persisted.preparationInstructions);
            if (typeof persisted.preparationReadyPortionSize === "string") setPreparationReadyPortionSize(persisted.preparationReadyPortionSize);
            if (typeof persisted.preparationPowderBatchWeight === "string") setPreparationPowderBatchWeight(persisted.preparationPowderBatchWeight);
            if (typeof persisted.preparationPowderPortionSize === "string") setPreparationPowderPortionSize(persisted.preparationPowderPortionSize);
            if (typeof persisted.preparationFinalYield === "string") setPreparationFinalYield(persisted.preparationFinalYield);
            if (Array.isArray(persisted.preparationIngredients)) setPreparationIngredients(persisted.preparationIngredients);
            if (typeof persisted.isSupplement === "boolean") {
                setIsSupplement(persisted.isSupplement);
                if (persisted.isSupplement) {
                    setRegulatoryScenario("specific");
                    setPopGroup((current) => normalizePopulationGroupForScenario("specific", current));
                }
            }

            if (Array.isArray(persisted.selectedNutrients)) setSelectedNutrients(persisted.selectedNutrients);
            if (persisted.manualMicronutrients) setManualMicronutrients(normalizeManualMicronutrients(persisted.manualMicronutrients));
            if (Array.isArray(persisted.selectedTableTypes) && persisted.selectedTableTypes.length > 0) {
                setSelectedTableTypes(persisted.selectedTableTypes);
            }
            if (Array.isArray(persisted.selectedImageFormats) && persisted.selectedImageFormats.length > 0) {
                setSelectedImageFormats(normalizeImageExportFormats(persisted.selectedImageFormats));
            }

            if (typeof persisted.includeFopSealOnImageExport === "boolean") {
                setIncludeFopSealOnImageExport(persisted.includeFopSealOnImageExport);
            }
            if (typeof persisted.enableFopLupa === "boolean") setEnableFopLupa(persisted.enableFopLupa);
            if (persisted.previewTableType) setPreviewTableType(persisted.previewTableType);
            if (typeof persisted.enableStrictCompliance === "boolean") setEnableStrictCompliance(persisted.enableStrictCompliance);
            if (persisted.complianceProfile) setComplianceProfile(persisted.complianceProfile);
            if (persisted.fopFoodType) setFopFoodType(persisted.fopFoodType);
            if (persisted.fopReferenceMode) setFopReferenceMode(persisted.fopReferenceMode);

            if (typeof persisted.preparedSugarAdded === "number") setPreparedSugarAdded(persisted.preparedSugarAdded);
            if (typeof persisted.preparedFatSat === "number") setPreparedFatSat(persisted.preparedFatSat);
            if (typeof persisted.preparedSodium === "number") setPreparedSodium(persisted.preparedSodium);

            if (typeof persisted.iodizedSaltStatement === "string") setIodizedSaltStatement(persisted.iodizedSaltStatement);
            if (typeof persisted.flourStatement === "string") setFlourStatement(persisted.flourStatement);
            if (persisted.aminoAcidProfile) setAminoAcidProfile(toAminoAcidProfileInput(persisted.aminoAcidProfile));
            if (typeof persisted.aminoAcidProteinOverride === "string") setAminoAcidProteinOverride(persisted.aminoAcidProteinOverride);
            if (typeof persisted.aminoAcidNotApplicable === "boolean") setAminoAcidNotApplicable(persisted.aminoAcidNotApplicable);
            if (typeof persisted.aminoAcidSectionOpen === "boolean") setAminoAcidSectionOpen(persisted.aminoAcidSectionOpen);
        } catch {
            // ignore invalid local state
        }
    }, [initialData?.uiState, tableUiStorageKey]);

    useEffect(() => {
        if (!initialData) return;
        if (initialData.suggestedFoodGroup && initialData.suggestedProduct) {
            setSelectedGroup(initialData.suggestedFoodGroup);
            setSelectedProduct(initialData.suggestedProduct);
            return;
        }

        if (!initialData.uiState && tableUiStorageKey) {
            try {
                const raw = window.localStorage.getItem(tableUiStorageKey);
                if (raw) {
                    const persisted = toTableUiState(JSON.parse(raw));
                    if (persisted.selectedGroup && persisted.selectedProduct) {
                        setSelectedGroup(persisted.selectedGroup);
                        setSelectedProduct(persisted.selectedProduct);
                        return;
                    }
                }
            } catch {
                // ignore invalid local storage payload
            }
        }

        const initialTitle = normalizeText(initialData.title || "");
        const initialMeasure = normalizeText(initialData.householdMeasure || "");
        const initialPortion = initialData.portionSize || 0;

        let resolvedGroup = "";
        let resolvedProduct = "";

        for (const group of FOOD_GROUPS) {
            const exactByTitle = group.products.find(
                (product) => normalizeText(product.name) === initialTitle
            );

            if (exactByTitle) {
                resolvedGroup = group.group;
                resolvedProduct = exactByTitle.name;
                break;
            }

            const byMeasureAndPortion = group.products.find((product) => {
                const productMeasure = normalizeText(product.measure || "");
                return (
                    Math.abs(product.portion - initialPortion) < 0.0001 &&
                    productMeasure === initialMeasure
                );
            });

            if (byMeasureAndPortion && !resolvedProduct) {
                resolvedGroup = group.group;
                resolvedProduct = byMeasureAndPortion.name;
            }
        }

        if (resolvedGroup && resolvedProduct) {
            setSelectedGroup(resolvedGroup);
            setSelectedProduct(resolvedProduct);
        }
    }, [initialData, tableUiStorageKey]);

    useEffect(() => {
        if (lastSavedSnapshotRef.current === null) {
            lastSavedSnapshotRef.current = currentTableSnapshot;
            return;
        }

        setHasUnsavedChanges(lastSavedSnapshotRef.current !== currentTableSnapshot);
    }, [currentTableSnapshot]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (suppressBeforeUnloadRef.current || (!hasUnsavedChanges && !saving)) return;
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [hasUnsavedChanges, saving]);

    useEffect(() => {
        const handleDocumentClick = (event: MouseEvent) => {
            if (!hasUnsavedChanges || saving || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            if (!(event.target instanceof Element)) return;

            const link = event.target.closest("a[href]") as HTMLAnchorElement | null;
            if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

            const destination = new URL(link.href, window.location.href);
            if (destination.href === window.location.href) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            event.stopPropagation();
            suppressBeforeUnloadRef.current = true;
            setPendingExitUrl(destination.href);
            setExitDialogOpen(true);
        };

        window.addEventListener("click", handleDocumentClick, true);
        return () => window.removeEventListener("click", handleDocumentClick, true);
    }, [hasUnsavedChanges, saving]);

    const handleSave = async ({ showSuccess = true }: { showSuccess?: boolean } = {}): Promise<string | null> => {
        const snapshotAtSave = currentTableSnapshot;
        setSaving(true);
        try {
            if (Object.values(manualMicronutrients).some((value) => parseManualMicronutrientValue(value) === null)) {
                toast.error("Informe valores manuais válidos, iguais ou maiores que zero.");
                return null;
            }
            const normalizedManualMicronutrients = normalizeManualMicronutrients(manualMicronutrients);
            const response = await saveTable({
                id: tableId || undefined,
                title,
                portion: portionSize,
                uom: "g",
                householdMeasure: householdMeasure || "medida caseira",
                popGroup,
                ingredients,
                packageContent,
                servingsPerPackage,
                suggestedFoodGroup: selectedGroup || undefined,
                suggestedProduct: selectedProduct || undefined,
                uiState: {
                    productDescription,
                    selectedGroup,
                    selectedProduct,
                    packageContent,
                    servingsDeclarationMode,
                    servingsPerPackageManual,
                    useIndividualPackagePortion,
                    useUnitFractionMeasure,
                    unitWeightForFraction,
                    regulatoryScenario,
                    regulatoryCategory,
                    isSupplement,
                    extraConstituents,
                    enablePreparationSimulator,
                    preparationSectionOpen,
                    preparationInstructions,
                    preparationReadyPortionSize,
                    preparationPowderBatchWeight,
                    preparationPowderPortionSize,
                    preparationFinalYield,
                    preparationIngredients,
                    lupaStyle: savedUiState.lupaStyle,
                    selectedNutrients,
                    manualMicronutrients: normalizedManualMicronutrients,
                    selectedTableTypes,
                    selectedImageFormats,
                    includeFopSealOnImageExport,
                    enableFopLupa,
                    previewTableType,
                    enableStrictCompliance,
                    complianceProfile,
                    fopFoodType,
                    fopReferenceMode,
                    preparedSugarAdded,
                    preparedFatSat,
                    preparedSodium,
                    iodizedSaltStatement,
                    flourStatement,
                    aminoAcidProfile,
                    aminoAcidProteinOverride,
                    aminoAcidSectionOpen,
                    aminoAcidNotApplicable,
                },
            });
            if (response?.error) {
                toast.error(response.error);
                return null;
            }

            const savedId = response?.id;
            if (savedId) {
                const wasNewTable = !tableId;
                setTableId(savedId);
                if (wasNewTable) {
                    window.history.replaceState(null, "", `/dashboard/edit/${savedId}`);
                }
            }

            const storageKey = savedId ? `table-generator-ui:${savedId}` : tableUiStorageKey;
            if (storageKey) {
                const persisted: TableUiState = {
                    productDescription,
                    selectedGroup,
                    selectedProduct,
                    packageContent,
                    servingsDeclarationMode,
                    servingsPerPackageManual,
                    useIndividualPackagePortion,
                    useUnitFractionMeasure,
                    unitWeightForFraction,
                    regulatoryScenario,
                    regulatoryCategory,
                    isSupplement,
                    extraConstituents,
                    enablePreparationSimulator,
                    preparationSectionOpen,
                    preparationInstructions,
                    preparationReadyPortionSize,
                    preparationPowderBatchWeight,
                    preparationPowderPortionSize,
                    preparationFinalYield,
                    preparationIngredients,
                    lupaStyle: savedUiState.lupaStyle,
                    selectedNutrients,
                    manualMicronutrients: normalizedManualMicronutrients,
                    selectedTableTypes,
                    selectedImageFormats,
                    includeFopSealOnImageExport,
                    enableFopLupa,
                    previewTableType,
                    enableStrictCompliance,
                    complianceProfile,
                    fopFoodType,
                    fopReferenceMode,
                    preparedSugarAdded,
                    preparedFatSat,
                    preparedSodium,
                    iodizedSaltStatement,
                    flourStatement,
                    aminoAcidProfile,
                    aminoAcidProteinOverride,
                    aminoAcidSectionOpen,
                    aminoAcidNotApplicable,
                };
                window.localStorage.setItem(storageKey, JSON.stringify(persisted));
            }
            lastSavedSnapshotRef.current = snapshotAtSave;
            setHasUnsavedChanges(snapshotAtSave !== currentTableSnapshotRef.current);
            if (showSuccess) toast.success("Tabela salva com sucesso!");
            return savedId ?? null;
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar tabela.");
            return null;
        } finally {
            setSaving(false);
        }
    };

    const handleOpenLupaEditor = async () => {
        const savedId = await handleSave({ showSuccess: false });
        if (!savedId) return;

        window.location.assign(`/dashboard/edit/${savedId}/lupa`);
    };

    const handleSaveAndExit = async () => {
        const savedId = await handleSave({ showSuccess: false });
        if (!savedId || !pendingExitUrl) return;
        window.location.assign(pendingExitUrl);
    };

    const handleExitWithoutSaving = () => {
        if (pendingExitUrl) window.location.assign(pendingExitUrl);
    };

    const resolveExportElement = (elementId: string | string[] = "nutrition-label-container") => {
        const candidateIds = Array.isArray(elementId) ? elementId : [elementId];
        const resolvedElementId = candidateIds.find((id) => !!document.getElementById(id));
        const element = resolvedElementId ? document.getElementById(resolvedElementId) : null;
        if (!element) {
            throw new Error("Não foi possível localizar a tabela na tela para exportar.");
        }

        return element as HTMLElement;
    };

    const prepareElementForExport = async (element: HTMLElement) => {

        if (document.fonts?.ready) {
            await document.fonts.ready;
        }

        const images = Array.from(element.querySelectorAll("img"));
        await Promise.all(
            images.map(
                (img) =>
                    new Promise<void>((resolve) => {
                        if (img.complete) {
                            resolve();
                            return;
                        }
                        img.addEventListener("load", () => resolve(), { once: true });
                        img.addEventListener("error", () => resolve(), { once: true });
                    })
            )
        );

        // Ensure fonts are loaded
        if (document.fonts?.ready) {
            await document.fonts.ready;
        }

        // Small delay to ensure all CSS calculations are done
        await new Promise(resolve => setTimeout(resolve, 500));
    };

    const renderLabelCanvas = async (elementId: string | string[] = "nutrition-label-container") => {
        const element = resolveExportElement(elementId);
        await prepareElementForExport(element);

        const captureWidth = Math.ceil(element.scrollWidth || element.clientWidth || 0);
        const captureHeight = Math.ceil(element.scrollHeight || element.clientHeight || 0);

        const exportWidth = captureWidth > 0 ? captureWidth : element.scrollWidth;
        const exportHeight = captureHeight > 0 ? captureHeight : element.scrollHeight;

        return toCanvas(element as HTMLElement, {
            pixelRatio: 3,
            cacheBust: true,
            backgroundColor: "#ffffff",
            width: exportWidth,
            height: exportHeight,
            style: {
                backgroundColor: "#ffffff",
            },
        });
    };

    const renderLabelSvg = async (elementId: string | string[] = "nutrition-label-container") => {
        const element = resolveExportElement(elementId);
        await prepareElementForExport(element);
        return renderElementAsSvg(element, `Tabela nutricional editável — ${title || "SoIZI"}`);
    };

    const waitForPreviewRender = () =>
        new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => resolve());
            });
        });

    const downloadBlob = (blob: Blob, fileName: string) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };

    const canvasToBlob = (canvas: HTMLCanvasElement, mime: string, quality?: number) =>
        new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error("Falha ao gerar imagem da tabela."));
                    return;
                }
                resolve(blob);
            }, mime, quality);
        });

    const addElementImageExportsToFiles = async (
        files: ExportFile[],
        elementId: string | string[],
        baseName: string,
        formats: ImageExportFormat[]
    ) => {
        let canvas: HTMLCanvasElement | null = null;
        let svg: string | null = null;

        for (const format of formats) {
            if (format === "svg") {
                svg = svg ?? await renderLabelSvg(elementId);
                files.push({
                    fileName: `${baseName}.svg`,
                    blob: new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
                });
                continue;
            }

            if (isRasterImageExportFormat(format)) {
                canvas = canvas ?? await renderLabelCanvas(elementId);
                const blob = await canvasToBlob(canvas, getRasterImageMime(format), 0.92);
                files.push({
                    fileName: `${baseName}.${format}`,
                    blob,
                });
            }
        }
    };

    const getPreparationMemorialText = () => {
        const memorial = result?.memorial;
        if (!enablePreparationSimulator || !memorial) return null;

        const powderIngredientsText = ingredients
            .filter((item) => item.quantity > 0)
            .map((item) => `- ${item.ingredient.name}: ${formatWeight(item.quantity)} g`)
            .join("\n") || "- Sem ingredientes de mistura informados.";
        const addedIngredientsText = memorial.addedIngredients
            .map((item) => `- ${item.name}: ${formatWeight(item.quantity)} g`)
            .join("\n") || "- Sem ingredientes adicionados.";

        return [
            "MEMORIAL DE CÁLCULO - PRODUTO COM TRANSFORMAÇÃO",
            "",
            `Produto: ${title || "-"}`,
            "",
            "Instrução de preparo informada:",
            memorial.preparationInstructions || "-",
            "",
            "Mistura como exposta à venda (pó):",
            powderIngredientsText,
            "",
            "Ingredientes adicionados no preparo:",
            addedIngredientsText,
            "",
            "Rendimento e perdas:",
            `- Pó usado no preparo: ${formatWeight(memorial.powderBatchWeight)} g`,
            `- Ingredientes adicionados: ${formatWeight(memorial.addedIngredientsWeight)} g`,
            `- Massa antes do preparo: ${formatWeight(memorial.totalBeforePreparation)} g`,
            `- Rendimento final: ${formatWeight(memorial.finalYield)} g`,
            `- Perda no preparo: ${formatWeight(memorial.preparationLoss)} g (${memorial.preparationLossPercent.toFixed(2).replace(".", ",")}%)`,
            "",
            "Proporcionalidade da porção:",
            `- Porção de referência do produto pronto: ${formatWeight(memorial.readyPortionSize)} g`,
            `- Pó equivalente declarado na coluna da porção: ${formatWeight(memorial.powderPortionSize)} g`,
            `- Relação pó/produto pronto: ${memorial.powderPortionRatio.toFixed(6).replace(".", ",")}`,
            "",
            "Proporcionalidade da coluna de 100 g do produto pronto:",
            `- Fator aplicado ao lote preparado: ${memorial.per100PreparedRatio.toFixed(6).replace(".", ",")}`,
            "",
            "Critério aplicado:",
            "- Coluna da porção: nutrientes somente da mistura em pó, na quantidade de pó necessária para preparar a porção de referência do produto pronto.",
            "- Coluna de 100 g: nutrientes da mistura em pó mais ingredientes adicionados, proporcionais ao rendimento final preparado.",
        ].join("\n");
    };

    const addPreparationMemorialToFiles = (files: ExportFile[]) => {
        const text = getPreparationMemorialText();
        if (!text) return;

        files.push({
            fileName: "memorial_calculo_preparo.txt",
            blob: new Blob([text], { type: "text/plain;charset=utf-8" }),
        });
    };

    const addPreparationMemorialToZip = (zip: { file: (fileName: string, data: string) => unknown }) => {
        const text = getPreparationMemorialText();
        if (!text) return;

        zip.file("memorial_calculo_preparo.txt", text);
    };

    const handleExportImage = async (formats?: ImageExportFormat[]) => {
        if (!canExport) return;
        const targetFormats = formats ?? selectedImageFormats;
        const formatsToExport = targetFormats.length > 0 ? targetFormats : DEFAULT_IMAGE_EXPORT_FORMATS;
        if (targetFormats.length === 0) {
            toast.info("Nenhum formato selecionado. Exportando em PNG.");
        }

        try {
            await waitForPreviewRender();

            const tableTargets = imageExportTableTypes.map((tableType) => ({
                tableType,
                elementId: `nutrition-label-container-export-${tableType}`,
            }));
            const files: ExportFile[] = [];

            for (const target of tableTargets) {
                await addElementImageExportsToFiles(
                    files,
                    [target.elementId, "nutrition-label-container"],
                    `tabela_${target.tableType.toLowerCase()}`,
                    formatsToExport
                );
            }

            if (shouldShowFopSeal && includeFopSealOnImageExport) {
                const fopElement = document.getElementById("nutrition-fop-seal-export");
                if (fopElement) {
                    await addElementImageExportsToFiles(files, "nutrition-fop-seal-export", "selo_fop", formatsToExport);
                }
            }
            addPreparationMemorialToFiles(files);

            if (files.length === 1) {
                downloadBlob(files[0].blob, files[0].fileName);
                return;
            }

            const JSZipModule = await import("jszip");
            const JSZip = JSZipModule.default;
            const zip = new JSZip();
            files.forEach((file) => zip.file(file.fileName, file.blob));

            const zipBlob = await zip.generateAsync({ type: "blob" });
            downloadBlob(zipBlob, `imagens_tabela_nutricional_${Date.now()}.zip`);
            toast.success("Imagens exportadas com sucesso.");
        } catch (error) {
            console.error(error);
            toast.error("Não foi possível exportar a tabela em imagem.");
        }
    };

    const handleExportCompleteZip = async () => {
        if (!canExport) return;
        if (!result) {
            toast.error("Gere a tabela antes de exportar.");
            return;
        }
        if (selectedTableTypes.length === 0) {
            toast.error("Selecione pelo menos um tipo de modelo para exportar.");
            return;
        }

        const toastId = toast.loading("Gerando pacote completo...");

        try {
            // 1. Get JSZip (dynamic import to avoid bundle issues)
            const JSZipModule = await import("jszip");
            const JSZip = JSZipModule.default;
            const zip = new JSZip();

            // 2. Capture Images
            await waitForPreviewRender();
            const imageFormatsToExport = selectedImageFormats.length > 0 ? selectedImageFormats : DEFAULT_IMAGE_EXPORT_FORMATS;
            const imageFiles: ExportFile[] = [];
            for (const tableType of selectedTableTypes) {
                const exportElementId = `nutrition-label-container-export-${tableType}`;
                await addElementImageExportsToFiles(
                    imageFiles,
                    exportElementId,
                    `tabela_${tableType.toLowerCase()}`,
                    imageFormatsToExport
                );
            }

            if (shouldShowFopSeal && includeFopSealOnImageExport) {
                await addElementImageExportsToFiles(imageFiles, "nutrition-fop-seal-export", "selo_fop", imageFormatsToExport);
            }
            imageFiles.forEach((file) => zip.file(file.fileName, file.blob));
            addPreparationMemorialToZip(zip);

            // 3. Get Excel Blob from Server
            const excelResponse = await fetch("/api/export/excel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    per100g: result.per100g,
                    perPortion: result.perPortion,
                    portionSize,
                    householdMeasure: householdMeasure || "medida caseira",
                    popGroup,
                    isSupplement,
                    servingsPerPackage,
                    selectedNutrients,
                    extraConstituents,
                    showDailyValue,
                    selectedTableTypes,
                }),
            });

            if (!excelResponse.ok) throw new Error("Erro ao gerar planilha Excel.");
            const excelBlob = await excelResponse.blob();
            zip.file("planilha_nutricional.xlsx", excelBlob);

            // 4. Generate and Download ZIP
            const zipContent = await zip.generateAsync({ type: "blob" });
            const zipUrl = URL.createObjectURL(zipContent);
            const link = document.createElement("a");
            link.href = zipUrl;
            link.download = `exportacao_${Date.now()}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(zipUrl);

            toast.success("Pacote exportado com sucesso!", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Erro na exportação.", { id: toastId });
        }
    };

    const handleDownloadDocument = (documentType: "memorial" | "technical", format: "pdf" | "xlsx") => {
        if (!tableId) {
            toast.info("Salve o projeto antes de baixar os documentos técnicos.");
            return;
        }

        const link = document.createElement("a");
        link.href = `/api/export/memorial?tableId=${encodeURIComponent(tableId)}&document=${documentType}&format=${format}`;
        link.download = `${documentType === "technical" ? "ficha_tecnica" : "memorial_de_calculo"}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-w-0 space-y-5">
            <div className="app-panel px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <p className={PANEL_EYEBROW_CLASS}>Editor de tabela nutricional</p>
                        <h1 className="mt-1 line-clamp-2 break-words text-xl font-semibold text-foreground [overflow-wrap:anywhere] lg:truncate">
                            {title.trim() || "Nova tabela nutricional"}
                        </h1>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs lg:flex lg:flex-wrap lg:justify-end">
                        <div className="app-metric">
                            <div className="app-metric-label">Porção</div>
                            <div className="mt-0.5 font-semibold text-foreground">{formatWeight(portionSize)} g</div>
                        </div>
                        <div className="app-metric">
                            <div className="app-metric-label">Ingredientes</div>
                            <div className="mt-0.5 font-semibold text-foreground">{ingredients.length}</div>
                        </div>
                        <div className={`app-metric ${shouldShowFopSeal ? "border-warning/55 bg-warning/15 text-warning dark:border-warning/70 dark:bg-warning/20" : "text-muted-foreground"}`}>
                            <div className={`app-metric-label ${shouldShowFopSeal ? "text-warning" : ""}`}>Lupa</div>
                            <div className={`mt-0.5 font-semibold ${shouldShowFopSeal ? "text-warning" : ""}`}>{shouldShowFopSeal ? "Ativa" : effectiveHasFopSeal ? "Desativada" : "Inativa"}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(22rem,0.82fr)_minmax(34rem,1.18fr)] lg:items-start">
            <div className="space-y-5">
                <Card className="app-panel overflow-hidden">
                    <CardHeader className="app-panel-header px-5 py-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className={PANEL_EYEBROW_CLASS}>Etapa principal</p>
                                <CardTitle className="mt-1 text-base font-semibold text-foreground">
                                    Dados do Produto
                                </CardTitle>
                            </div>
                            <Badge variant="secondary">
                                {selectedOfficialProduct ? "Base oficial" : "Dados livres"}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5 bg-muted/20 p-4 sm:p-5">

                        <div className={`${PANEL_CLASS} space-y-2 p-4`}>
                            <Label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Denominação de venda</Label>
                            <Textarea
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="ex: Barra de cereais com até 10% de gordura"
                                rows={2}
                                className="min-h-12 resize-y leading-relaxed"
                            />
                            <Collapsible defaultOpen={Boolean(productDescription)}>
                                <div className="flex items-center justify-between gap-3 pt-2">
                                    <Label htmlFor="product-description">Adicionar descrição</Label>
                                    <CollapsibleTrigger asChild><Button type="button" variant="ghost" size="sm">Opcional<ChevronDown data-icon="inline-end" /></Button></CollapsibleTrigger>
                                </div>
                                <CollapsibleContent className="pt-3"><Textarea id="product-description" value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="Descreva brevemente o produto ou sua apresentação." rows={2} maxLength={500} className="resize-y leading-relaxed" /></CollapsibleContent>
                            </Collapsible>
                        </div>

                        <Collapsible defaultOpen={Boolean(selectedGroup || selectedProduct)}>
                            <div className={`${PANEL_CLASS} flex items-center justify-between gap-4 p-4`}>
                                <div><p className={PANEL_EYEBROW_CLASS}>Referência oficial</p><p className="mt-1 text-sm text-muted-foreground">Use para preencher dados sugeridos.</p></div>
                                <CollapsibleTrigger asChild><Button type="button" variant="outline" size="sm">{selectedOfficialProduct ? "Revisar referência" : "Adicionar referência"}<ChevronDown data-icon="inline-end" /></Button></CollapsibleTrigger>
                            </div>
                            <CollapsibleContent className="pt-3">
                                <div className={`${PANEL_CLASS} grid grid-cols-1 gap-4 p-4`}>
                                    <div className="space-y-2"><Label className="inline-flex items-center gap-1.5">Grupo de alimentos<HelpTip>Use quando quiser partir de uma categoria oficial. Isso ajuda a preencher produto, porção e medida com mais consistência.</HelpTip></Label><Select value={selectedGroup} onValueChange={handleGroupChange}><SelectTrigger className="w-full min-w-0 h-auto min-h-10 py-2 data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:whitespace-normal *:data-[slot=select-value]:break-words *:data-[slot=select-value]:text-left *:data-[slot=select-value]:leading-relaxed"><SelectValue placeholder="Selecione um grupo" /></SelectTrigger><SelectContent position="popper" className="min-w-[var(--radix-select-trigger-width)] w-max max-w-[min(92vw,72rem)] p-1.5 [&_[data-slot=select-item]]:px-3 [&_[data-slot=select-item]]:py-3 [&_[data-slot=select-item]]:pr-10"><SelectGroup>{FOOD_GROUPS.map((g, i) => <SelectItem key={i} value={g.group} className="max-w-full">{g.group}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
                                    <div className="space-y-2"><Label className="inline-flex items-center gap-1.5">Produto sugerido<HelpTip>Preenche nome, porção e medida caseira. Você ainda pode editar tudo depois.</HelpTip></Label><Select value={selectedProduct} onValueChange={handleProductChange} disabled={!selectedGroup}><SelectTrigger className="w-full min-w-0 h-auto min-h-10 py-2 data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:whitespace-normal *:data-[slot=select-value]:break-words *:data-[slot=select-value]:text-left *:data-[slot=select-value]:leading-relaxed"><SelectValue placeholder="Selecione um produto" /></SelectTrigger><SelectContent position="popper" className="min-w-[var(--radix-select-trigger-width)] w-max max-w-[min(92vw,72rem)] p-1.5 [&_[data-slot=select-item]]:px-3 [&_[data-slot=select-item]]:py-3 [&_[data-slot=select-item]]:pr-10"><SelectGroup>{FOOD_GROUPS.find(g => g.group === selectedGroup)?.products.map((p, i) => <SelectItem key={i} value={p.name} className="max-w-full">{p.name}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>

                        <div className={`${PANEL_CLASS} grid grid-cols-1 gap-4 p-4 md:grid-cols-2`}>
                            <div className={`${PANEL_EYEBROW_CLASS} md:col-span-2`}>
                                Porção e medida caseira
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <Label className="inline-flex items-center gap-1.5">
                                        Porção (g)
                                        <HelpTip>Quantidade de alimento usada como referência no rótulo. Ela aparece na tabela e define o cálculo por porção.</HelpTip>
                                    </Label>
                                    {isUsingIndividualPackagePortion ? (
                                        <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600/80" />
                                            Embalagem individual
                                        </span>
                                    ) : isUsingSuggestedPortion && (
                                        <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600/80" />
                                            Padrão oficial
                                        </span>
                                    )}
                                    {!useIndividualPackagePortion && currentMeasureSuggestedPortion && currentMeasureSuggestedPortion !== portionSize && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-auto rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/60"
                                            onClick={() => setPortionSize(currentMeasureSuggestedPortion)}
                                        >
                                            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-red-600/80" />
                                            Usar padrão ({currentMeasureSuggestedPortion} g)
                                        </Button>
                                    )}
                                </div>
                                <Input
                                    type="number"
                                    value={portionSize || ''}
                                    onChange={e => setPortionSize(parseDecimalInput(e.target.value))}
                                    placeholder="ex: 20"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="inline-flex items-center gap-1.5">
                                    Medida Caseira
                                    <HelpTip>Forma simples de explicar a porção para o consumidor, como colher, fatia, unidade ou copo.</HelpTip>
                                </Label>
                                <Select value={householdMeasureCode} onValueChange={handleHouseholdMeasureCodeChange}>
                                    <SelectTrigger className="w-full min-w-0 h-auto min-h-10 py-2 data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:whitespace-normal *:data-[slot=select-value]:break-words *:data-[slot=select-value]:text-left *:data-[slot=select-value]:leading-relaxed">
                                        <SelectValue placeholder="Selecione a medida caseira" />
                                    </SelectTrigger>
                                    <SelectContent
                                        position="popper"
                                        className="min-w-[var(--radix-select-trigger-width)] w-max max-w-[min(92vw,34rem)] p-1.5 [&_[data-slot=select-item]]:px-3 [&_[data-slot=select-item]]:py-2.5 [&_[data-slot=select-item]]:pr-10"
                                    >
                                      <SelectGroup>
                                        {HOUSEHOLD_MEASURE_OPTIONS.map((measure) => (
                                            <SelectItem key={measure.code} value={measure.code}>
                                                <span className="block max-w-full break-words whitespace-normal leading-relaxed">
                                                    {measure.label}
                                                </span>
                                            </SelectItem>
                                        ))}
                                      </SelectGroup>
                                    </SelectContent>
                                </Select>
                                {householdMeasureCode === HOUSEHOLD_MEASURE_CODES.OTHER && (
                                    <Input
                                        value={householdMeasureCustom}
                                        onChange={(e) => setHouseholdMeasureCustom(e.target.value)}
                                        placeholder="Digite a medida caseira (ex: 2 colheres rasas)"
                                    />
                                )}
                                <div className="rounded-lg border bg-card p-3">
                                    <div className="flex items-start gap-2">
                                        <Checkbox
                                            id="unit-fraction-measure"
                                            checked={useUnitFractionMeasure}
                                            onCheckedChange={(value) => setUseUnitFractionMeasure(!!value)}
                                            className="mt-0.5"
                                        />
                                        <label htmlFor="unit-fraction-measure" className="cursor-pointer space-y-1 text-xs leading-tight">
                                            <span className="font-medium">Expressar como fração da unidade</span>
                                            <span className="block text-muted-foreground">Calcula a fração irredutível pela porção e pelo peso/volume de uma unidade.</span>
                                        </label>
                                    </div>
                                    {useUnitFractionMeasure && (
                                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                                            <Input
                                                type="text"
                                                inputMode="decimal"
                                                value={unitWeightForFraction}
                                                onChange={(e) => setUnitWeightForFraction(e.target.value)}
                                                placeholder="Peso/volume de 1 unidade"
                                            />
                                            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
                                                {unitFractionLabel || "-"}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {suggestedMeasuresForCurrentPortion.length > 0 && measureSuggestionsExpanded && (
                                    <div className="space-y-1.5">
                                        {suggestedMeasuresForCurrentPortion.map((suggestion) => (
                                            <Button
                                                key={suggestion.code}
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-auto w-full justify-start rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/60"
                                                onClick={() => applySuggestedMeasureForCurrentPortion(suggestion)}
                                            >
                                                <span className="mr-1 h-1.5 w-1.5 rounded-full bg-red-600/80" />
                                                Sugerir medida: {suggestion.label} ({suggestion.suggestedPortion} g)
                                            </Button>
                                        ))}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-auto w-full justify-start px-1.5 py-0.5 text-[11px] text-muted-foreground/90 hover:bg-transparent hover:text-foreground"
                                            onClick={() => setMeasureSuggestionsExpanded(false)}
                                        >
                                            Recolher sugestões
                                        </Button>
                                    </div>
                                )}
                                {suggestedMeasuresForCurrentPortion.length > 0 && !measureSuggestionsExpanded && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-auto w-full justify-start rounded-md border border-border/70 bg-muted/20 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/40"
                                        onClick={() => setMeasureSuggestionsExpanded(true)}
                                    >
                                        Mostrar sugestões de medida ({suggestedMeasuresForCurrentPortion.length})
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className={`${PANEL_CLASS} grid grid-cols-1 gap-4 p-4 md:grid-cols-2`}>
                            <div className={`${PANEL_EYEBROW_CLASS} md:col-span-2`}>
                                Embalagem e declaração de porções
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="package-content" className="inline-flex items-center gap-1.5">
                                    Conteúdo da embalagem (g ou ml)
                                    <HelpTip>Peso ou volume total vendido na embalagem. O sistema usa esse valor para calcular quantas porções existem no pacote.</HelpTip>
                                </Label>
                                <Input
                                    id="package-content"
                                    type="number"
                                    value={packageContent || ""}
                                    onChange={(e) => setPackageContent(parseDecimalInput(e.target.value))}
                                    placeholder="ex: 500"
                                />
                            </div>
                            <div className="space-y-2 rounded-lg border bg-card p-3 md:col-span-2">
                                <div className="flex items-start gap-2">
                                    <Checkbox
                                        id="individual-package-portion"
                                        checked={useIndividualPackagePortion}
                                        onCheckedChange={(value) => setUseIndividualPackagePortion(!!value)}
                                        className="mt-0.5"
                                    />
                                    <label htmlFor="individual-package-portion" className="cursor-pointer space-y-1 text-xs leading-tight">
                                        <span className="font-medium">Usar porção da embalagem individual</span>
                                        <span className="block text-muted-foreground">
                                            Menor que 2 porções oficiais, usa 1 unidade; com 2 porções ou mais, usa a porção oficial como fração.
                                        </span>
                                    </label>
                                </div>
                                <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                                    {individualPackagePortion
                                        ? `Aplicado: ${formatWeight(individualPackagePortion.portion)} g (${individualPackagePortion.measure}). Referência: ${formatWeight(currentMeasureSuggestedPortion || 0)} g.`
                                        : "Selecione um produto oficial e informe o conteúdo da embalagem."}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="inline-flex items-center gap-1.5">
                                    Porções por embalagem (declaração)
                                    <HelpTip>Texto que aparece no rótulo. No automático, divide o conteúdo total pela porção. No manual, você pode escrever como o cliente quer declarar.</HelpTip>
                                </Label>
                                <Select
                                    value={servingsDeclarationMode}
                                    onValueChange={(value) => setServingsDeclarationMode(value as ServingsDeclarationMode)}
                                >
                                    <SelectTrigger className="w-full min-w-0 h-auto min-h-10 py-2 data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:whitespace-normal *:data-[slot=select-value]:break-words *:data-[slot=select-value]:text-left *:data-[slot=select-value]:leading-relaxed">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectGroup>
                                        <SelectItem value="auto">Automático (ANVISA)</SelectItem>
                                        <SelectItem value="manual">Manual (cliente)</SelectItem>
                                      </SelectGroup>
                                    </SelectContent>
                                </Select>
                                {servingsDeclarationMode === "manual" ? (
                                    <Input
                                        value={servingsPerPackageManual}
                                        onChange={(e) => setServingsPerPackageManual(e.target.value)}
                                        placeholder='ex: Cerca de 3'
                                    />
                                ) : (
                                    <div className="rounded-lg border bg-card px-3 py-2 text-sm">
                                        {servingsPerPackageAuto}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/10">
                            <div className="flex items-center justify-between gap-2">
                                <Label className="inline-flex items-center gap-1.5 text-sm font-semibold">
                                    Conformidade ANVISA
                                    <HelpTip>Área para ajustar regras especiais do rótulo, como lupa frontal, suplementos e categorias com declarações obrigatórias.</HelpTip>
                                </Label>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="strict-compliance"
                                        checked={enableStrictCompliance}
                                        onCheckedChange={(value) => setEnableStrictCompliance(!!value)}
                                    />
                                    <label htmlFor="strict-compliance" className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium leading-none">
                                        Modo conformidade
                                        <HelpTip>Quando ligado, o sistema mostra avisos de atenção sobre regras da ANVISA que podem exigir ajuste antes de exportar o rótulo.</HelpTip>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="inline-flex items-center gap-1.5">
                                        Categoria regulatória
                                        <HelpTip>Define se o produto é alimento geral, suplemento ou outra categoria com regra própria de rotulagem.</HelpTip>
                                    </Label>
                                    <Select value={regulatoryCategory} onValueChange={handleRegulatoryCategoryChange}>
                                        <SelectTrigger className="w-full min-w-0 h-auto min-h-10 py-2 data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:whitespace-normal *:data-[slot=select-value]:break-words *:data-[slot=select-value]:text-left *:data-[slot=select-value]:leading-relaxed">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectGroup>
                                            {REGULATORY_CATEGORY_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                          </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="inline-flex items-center gap-1.5">
                                        Exceção à rotulagem frontal
                                        <HelpTip>Use para casos especiais, como sal iodado, farinha enriquecida ou produtos que não devem exibir lupa frontal.</HelpTip>
                                    </Label>
                                    <Select value={complianceProfile} onValueChange={(value) => setComplianceProfile(value as ComplianceProfile)}>
                                        <SelectTrigger className="w-full min-w-0 h-auto min-h-10 py-2 data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:whitespace-normal *:data-[slot=select-value]:break-words *:data-[slot=select-value]:text-left *:data-[slot=select-value]:leading-relaxed">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectGroup>
                                            {COMPLIANCE_PROFILE_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                          </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="inline-flex items-center gap-1.5">
                                        Classificação da base da lupa
                                        <HelpTip>Escolhe se os limites da lupa serão avaliados como alimento sólido/semissólido ou líquido.</HelpTip>
                                    </Label>
                                    <Select value={fopFoodType} onValueChange={(value) => setFopFoodType(value as FOPFoodType)}>
                                        <SelectTrigger className="w-full min-w-0 h-auto min-h-10 py-2 data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:whitespace-normal *:data-[slot=select-value]:break-words *:data-[slot=select-value]:text-left *:data-[slot=select-value]:leading-relaxed">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectGroup>
                                            <SelectItem value="solid">Sólido/Semissólido (100 g)</SelectItem>
                                            <SelectItem value="liquid">Líquido (100 ml)</SelectItem>
                                          </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="inline-flex items-center gap-1.5">
                                        Base de cálculo da lupa
                                        <HelpTip>Normalmente é o produto como vendido. Use pronto para consumo quando a regra exigir avaliação após preparo.</HelpTip>
                                    </Label>
                                    <Select value={fopReferenceMode} onValueChange={(value) => setFopReferenceMode(value as FopReferenceMode)}>
                                        <SelectTrigger className="w-full min-w-0 h-auto min-h-10 py-2 data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:whitespace-normal *:data-[slot=select-value]:break-words *:data-[slot=select-value]:text-left *:data-[slot=select-value]:leading-relaxed">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectGroup>
                                            <SelectItem value="as-sold">Como exposto à venda</SelectItem>
                                            <SelectItem value="prepared">Pronto para consumo (Art. 19)</SelectItem>
                                          </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-xs">
                                    <span>{effectiveHasFopSeal ? "Lupa disponível para este produto." : "Lupa não aplicável para este produto."}</span>
                                    <div className="flex items-center justify-between gap-3">
                                        <label htmlFor="enable-fop-lupa" className="cursor-pointer font-medium text-foreground">Exibir lupa frontal</label>
                                        <Switch
                                            id="enable-fop-lupa"
                                            checked={enableFopLupa}
                                            disabled={!effectiveHasFopSeal}
                                            onCheckedChange={setEnableFopLupa}
                                        />
                                    </div>
                                </div>
                            </div>

                            {fopReferenceMode === "prepared" && enablePreparationSimulator && result && (
                                <div className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-3 text-xs md:grid-cols-3">
                                    <div>
                                        <div className="font-semibold text-foreground">Açúcares adicionados</div>
                                        <div className="mt-1 text-muted-foreground">{formatWeight(result.per100g.sugarAdded)} g/100 g pronto</div>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-foreground">Gordura saturada</div>
                                        <div className="mt-1 text-muted-foreground">{formatWeight(result.per100g.fatSat)} g/100 g pronto</div>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-foreground">Sódio</div>
                                        <div className="mt-1 text-muted-foreground">{formatWeight(result.per100g.sodium)} mg/100 g pronto</div>
                                    </div>
                                </div>
                            )}

                            {fopReferenceMode === "prepared" && !enablePreparationSimulator && (
                                <div className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-3 md:grid-cols-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="prepared-sugar">Açúcares adicionados (g/100)</Label>
                                        <Input
                                            id="prepared-sugar"
                                            type="number"
                                            value={preparedSugarAdded || ""}
                                            onChange={(e) => setPreparedSugarAdded(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="prepared-fat">Gordura saturada (g/100)</Label>
                                        <Input
                                            id="prepared-fat"
                                            type="number"
                                            value={preparedFatSat || ""}
                                            onChange={(e) => setPreparedFatSat(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="prepared-sodium">Sódio (mg/100)</Label>
                                        <Input
                                            id="prepared-sodium"
                                            type="number"
                                            value={preparedSodium || ""}
                                            onChange={(e) => setPreparedSodium(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                            )}

                            {requiresIodizedSaltStatement && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="statement-salt">Frase obrigatória (sal iodado)</Label>
                                    <Input
                                        id="statement-salt"
                                        value={iodizedSaltStatement}
                                        onChange={(e) => setIodizedSaltStatement(e.target.value)}
                                    />
                                </div>
                            )}

                            {requiresFlourStatement && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="statement-flour">Frase obrigatória (farinha enriquecida)</Label>
                                    <Input
                                        id="statement-flour"
                                        value={flourStatement}
                                        onChange={(e) => setFlourStatement(e.target.value)}
                                    />
                                </div>
                            )}

                            {enableStrictCompliance && complianceWarnings.length > 0 && (
                                <div className="space-y-1 rounded-lg border border-stone-300 bg-stone-50 p-3 text-xs text-stone-700 dark:border-stone-700 dark:bg-stone-950/20 dark:text-stone-300">
                                    {complianceWarnings.map((warning) => (
                                        <p key={warning}>- {warning}</p>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                            <div className={PANEL_HEADER_CLASS}>
                                <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <h3 className="inline-flex min-w-0 items-center gap-1.5 break-words text-sm font-semibold [overflow-wrap:anywhere]">
                                        Ingredientes / Formulação
                                        <HelpTip>
                                            {canUseOpenFoodFacts
                                                ? "Monte a receita com ingredientes da base, ingredientes próprios ou produtos importados do Open Food Facts."
                                                : "Monte a receita com ingredientes da base ou ingredientes próprios."}
                                        </HelpTip>
                                    </h3>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="w-full whitespace-normal sm:w-auto"
                                        onClick={clearIngredients}
                                        disabled={ingredients.length === 0}
                                    >
                                        Limpar selecionados
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-4 p-4">
                                <IngredientSelector onSelect={handleAddIngredient} />
                                {canUseOpenFoodFacts ? <OpenFoodFactsImporter onSelect={handleAddIngredient} /> : null}

                                <div className="space-y-2">
                                    {ingredients.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="grid min-w-0 gap-3 rounded-lg border bg-muted/30 p-3 sm:flex sm:items-end"
                                        >
                                            <div className="flex-1 space-y-1">
                                                <div className="break-words text-sm font-medium [overflow-wrap:anywhere]">{item.ingredient.name}</div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="w-24 shrink-0">
                                                        <Input
                                                            type="number"
                                                            step={INGREDIENT_QUANTITY_STEP}
                                                            inputMode="decimal"
                                                            placeholder="Qtd (g)"
                                                            value={formatQuantityInput(item.quantity)}
                                                            onChange={e => updateIngredient(idx, 'quantity', parseDecimalInput(e.target.value))}
                                                            className="h-8"
                                                        />
                                                    </div>
                                                    <div className="flex min-w-0 items-start gap-2">
                                                        <Checkbox
                                                            id={`added-sugar-${idx}`}
                                                            checked={item.isAddedSugar}
                                                            onCheckedChange={(c) => updateIngredient(idx, 'isAddedSugar', !!c)}
                                                            className="mt-0.5"
                                                        />
                                                        <label
                                                            htmlFor={`added-sugar-${idx}`}
                                                            className="min-w-0 cursor-pointer space-y-0.5 text-xs leading-tight"
                                                        >
                                                            <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5 font-medium">
                                                                Conta como açúcar adicionado
                                                                <HelpTip>Marque quando o ingrediente for açúcar, mel, xarope, maltodextrina ou similar. Isso entra no cálculo de açúcares adicionados e pode ativar lupa.</HelpTip>
                                                            </span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="justify-self-end sm:shrink-0"
                                                onClick={() => removeIngredient(idx)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {ingredients.length === 0 && (
                                        <div className="rounded-lg border border-dashed bg-card py-4 text-center text-sm text-muted-foreground">
                                            Adicione ingredientes para começar.
                                        </div>
                                    )}
                                </div>
                                {ingredients.length > 0 && (
                                    <div className="mt-4 flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                                        <span className="font-semibold text-sm">Peso Total dos Ingredientes:</span>
                                        <span className="font-bold text-lg text-primary">{formatWeight(ingredients.reduce((acc, item) => acc + (item.quantity || 0), 0))} g</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={`${PANEL_MUTED_CLASS} overflow-hidden`}>
                            <div className={PANEL_HEADER_CLASS}>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="inline-flex min-w-0 items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 shrink-0"
                                            onClick={() => setPreparationSectionOpen((current) => !current)}
                                        >
                                            <ChevronDown className={`h-4 w-4 transition-transform ${preparationSectionOpen ? "rotate-0" : "-rotate-90"}`} />
                                        </Button>
                                        <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold">
                                            Simulador de Preparo
                                            <HelpTip>Use para misturas para bolo e outros produtos transformados. A porção usa somente o pó; a coluna de 100 g usa o produto pronto com os ingredientes adicionados e o rendimento final.</HelpTip>
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="preparation-simulator"
                                            checked={enablePreparationSimulator}
                                            onCheckedChange={(value) => {
                                                const checked = !!value;
                                                setEnablePreparationSimulator(checked);
                                                setPreparationSectionOpen(checked);
                                            }}
                                        />
                                        <label htmlFor="preparation-simulator" className="cursor-pointer text-xs font-medium text-muted-foreground">
                                            Produto com transformação
                                        </label>
                                    </div>
                                </div>
                            </div>
                            {preparationSectionOpen && (
                                <div className="space-y-4 p-4">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-1.5 md:col-span-2">
                                            <Label htmlFor="preparation-instructions">Instrução de preparo</Label>
                                            <Textarea
                                                id="preparation-instructions"
                                                value={preparationInstructions}
                                                onChange={(event) => setPreparationInstructions(event.target.value)}
                                                placeholder="ex: Misturar o conteúdo do pacote com 2 ovos, 150 ml de leite e 40 g de manteiga. Assar até obter 420 g de bolo pronto."
                                                rows={3}
                                                className="min-h-20 resize-y leading-relaxed"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="ready-portion-size">Porção de referência pronta (g)</Label>
                                            <Input
                                                id="ready-portion-size"
                                                type="text"
                                                inputMode="decimal"
                                                value={preparationReadyPortionSize}
                                                onChange={(event) => setPreparationReadyPortionSize(event.target.value)}
                                                placeholder="ex: 60"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="powder-batch-weight">Pó usado no preparo (g)</Label>
                                            <Input
                                                id="powder-batch-weight"
                                                type="text"
                                                inputMode="decimal"
                                                value={preparationPowderBatchWeight}
                                                onChange={(event) => setPreparationPowderBatchWeight(event.target.value)}
                                                placeholder="ex: 200"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="prepared-final-yield">Rendimento final pronto (g)</Label>
                                            <Input
                                                id="prepared-final-yield"
                                                type="text"
                                                inputMode="decimal"
                                                value={preparationFinalYield}
                                                onChange={(event) => setPreparationFinalYield(event.target.value)}
                                                placeholder="ex: 414"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="powder-portion-size">Pó equivalente por porção (g)</Label>
                                            <Input
                                                id="powder-portion-size"
                                                type="text"
                                                inputMode="decimal"
                                                value={preparationPowderPortionSize}
                                                onChange={(event) => setPreparationPowderPortionSize(event.target.value)}
                                                placeholder={calculatedPowderPortion > 0 ? formatWeight(calculatedPowderPortion) : "ex: 29"}
                                            />
                                            <div className="text-[11px] text-muted-foreground">
                                                {calculatedPowderPortion > 0
                                                    ? `Automático: ${formatWeight(calculatedPowderPortion)} g de pó para ${formatWeight(preparationReadyPortion)} g pronto.`
                                                    : "Se vazio, calcula pelo pó usado, porção pronta e rendimento final."}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border bg-card p-3">
                                        <div className="mb-3 flex items-center justify-between gap-2">
                                            <div className="text-sm font-semibold">Ingredientes adicionados no preparo</div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearPreparationIngredients}
                                                disabled={preparationIngredients.length === 0}
                                            >
                                                Limpar
                                            </Button>
                                        </div>
                                        <IngredientSelector onSelect={handleAddPreparationIngredient} />
                                        <div className="mt-3 space-y-2">
                                            {preparationIngredients.map((item, idx) => (
                                                <div
                                                    key={`prep-${idx}`}
                                                    className="flex items-end gap-3 rounded-lg border bg-muted/30 p-3"
                                                >
                                                    <div className="flex-1 space-y-1">
                                                        <div className="font-medium text-sm">{item.ingredient.name}</div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24">
                                                                <Input
                                                                    type="number"
                                                                    step={INGREDIENT_QUANTITY_STEP}
                                                                    inputMode="decimal"
                                                                    placeholder="Qtd (g)"
                                                                    value={formatQuantityInput(item.quantity)}
                                                                    onChange={event => updatePreparationIngredient(idx, "quantity", parseDecimalInput(event.target.value))}
                                                                    className="h-8"
                                                                />
                                                            </div>
                                                            <div className="flex items-start gap-2">
                                                                <Checkbox
                                                                    id={`prep-added-sugar-${idx}`}
                                                                    checked={item.isAddedSugar}
                                                                    onCheckedChange={(value) => updatePreparationIngredient(idx, "isAddedSugar", !!value)}
                                                                    className="mt-0.5"
                                                                />
                                                                <label htmlFor={`prep-added-sugar-${idx}`} className="cursor-pointer text-xs font-medium leading-tight">
                                                                    Conta como açúcar adicionado
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="destructive"
                                                        size="icon"
                                                        onClick={() => removePreparationIngredient(idx)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            {preparationIngredients.length === 0 && (
                                                <div className="rounded-lg border border-dashed bg-card py-4 text-center text-sm text-muted-foreground">
                                                    Adicione ovo, leite, manteiga, água ou outros ingredientes do preparo.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-3 text-xs md:grid-cols-2">
                                        <div>
                                            <div className="font-semibold text-foreground">Memorial de cálculo</div>
                                            <div className="mt-1 text-muted-foreground">
                                                Massa antes do preparo: {formatWeight(preparationTotalBeforeHeat)} g. Perda: {formatWeight(preparationLoss)} g ({preparationLossPercent.toFixed(2).replace(".", ",")}%). Rendimento: {formatWeight(preparationYield)} g.
                                            </div>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-foreground">Aplicação na tabela</div>
                                            <div className="mt-1 text-muted-foreground">
                                                Porção: {formatWeight(preparationPowderPortion)} g de pó. Coluna 100 g: produto pronto com ingredientes adicionados e rendimento final.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={`${PANEL_MUTED_CLASS} overflow-hidden`}>
                            <div className={PANEL_HEADER_CLASS}>
                                <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 flex-1 items-start gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 shrink-0"
                                            onClick={() => setAminoAcidSectionOpen((current) => !current)}
                                            disabled={aminoAcidNotApplicable}
                                        >
                                            <ChevronDown
                                                className={`h-4 w-4 transition-transform ${aminoAcidSectionOpen && !aminoAcidNotApplicable ? "rotate-0" : "-rotate-90"}`}
                                            />
                                        </Button>
                                        <h3 className="flex min-w-0 items-start gap-1.5 text-sm font-semibold">
                                            <span className="min-w-0 break-words [overflow-wrap:anywhere]">Perfil de Aminoácidos - Anexo XXI</span>
                                            <HelpTip>Informe o perfil teórico em mg de aminoácido por 100 g de produto. O sistema divide pela proteína em g/100 g e compara com a referência em mg/g de proteína.</HelpTip>
                                        </h3>
                                    </div>
                                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="amino-acid-not-applicable"
                                                checked={aminoAcidNotApplicable}
                                                onCheckedChange={(value) => handleAminoAcidNotApplicableChange(!!value)}
                                            />
                                            <label htmlFor="amino-acid-not-applicable" className="cursor-pointer text-xs font-medium text-muted-foreground">
                                                Não se aplica
                                            </label>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearAminoAcidProfile}
                                            disabled={aminoAcidNotApplicable || (!hasAminoAcidInput && aminoAcidProteinOverride.trim().length === 0)}
                                        >
                                            Limpar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            {aminoAcidSectionOpen && !aminoAcidNotApplicable && (
                            <div className="space-y-4 p-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr]">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="amino-acid-protein" className="inline-flex items-center gap-1.5">
                                            Proteína usada no cálculo (g/100 g)
                                            <HelpTip>Se vazio, usa a proteína calculada pela receita. Preencha quando o laudo do perfil usar outro valor de proteína.</HelpTip>
                                        </Label>
                                        <Input
                                            id="amino-acid-protein"
                                            type="text"
                                            inputMode="decimal"
                                            value={aminoAcidProteinOverride}
                                            onChange={(event) => setAminoAcidProteinOverride(event.target.value)}
                                            placeholder={result ? result.per100g.protein.toFixed(2) : "ex: 18,5"}
                                        />
                                    </div>
                                    <div className="rounded-lg border bg-card px-3 py-2 text-xs">
                                        <div className="font-semibold text-foreground">{aminoAcidProfileStatus}</div>
                                        <div className="mt-1 text-muted-foreground">
                                            Base: {aminoAcidProteinPer100g > 0 ? `${aminoAcidProteinPer100g.toFixed(2)} g de proteína/100 g` : "sem proteína calculada"}
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto rounded-lg border bg-card">
                                    <Table className="min-w-[42rem]">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Aminoácido</TableHead>
                                                <TableHead className="text-right">Perfil (mg/100 g)</TableHead>
                                                <TableHead className="text-right">Anexo XXI (mg/g prot.)</TableHead>
                                                <TableHead className="text-right">Calculado</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {AMINO_ACID_REFERENCE_PROFILE.map((reference) => {
                                                const row = aminoAcidResults.find((item) => item.key === reference.key);
                                                const calculated = row?.calculatedMgPerGProtein;
                                                return (
                                                    <TableRow key={reference.key}>
                                                        <TableCell className="font-medium">{reference.label}</TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="text"
                                                                inputMode="decimal"
                                                                value={aminoAcidProfile[reference.key]}
                                                                onChange={(event) => updateAminoAcidProfile(reference.key, event.target.value)}
                                                                placeholder="0"
                                                                className="h-8 text-right"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right">{reference.referenceMgPerGProtein}</TableCell>
                                                        <TableCell className="text-right">
                                                            {calculated === null || calculated === undefined ? "-" : calculated.toFixed(1)}
                                                        </TableCell>
                                                        <TableCell>
                                                            {row?.compliant === null ? (
                                                                <Badge variant="secondary">Sem dado</Badge>
                                                            ) : row?.compliant ? (
                                                                <Badge variant="success">Dentro</Badge>
                                                            ) : (
                                                                <Badge variant="destructive">Fora</Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                            )}
                        </div>

                        <Collapsible
                            open={nutritionClaimsSectionOpen}
                            onOpenChange={setNutritionClaimsSectionOpen}
                            className={`${PANEL_MUTED_CLASS} overflow-hidden`}
                        >
                            <div className={PANEL_HEADER_CLASS}>
                                <div className="inline-flex min-w-0 items-center gap-2">
                                    <CollapsibleTrigger asChild>
                                        <Button type="button" variant="ghost" size="icon-sm" aria-label="Alternar alegações nutricionais">
                                            <ChevronDown className={`transition-transform ${nutritionClaimsSectionOpen ? "rotate-0" : "-rotate-90"}`} />
                                        </Button>
                                    </CollapsibleTrigger>
                                    <h3 className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                                        Alegações Nutricionais - Anexo XX
                                        <HelpTip>Confere alegações de conteúdo absoluto mais comuns. Alegações comparativas e de sem adição exigem dados de referência ou formulação que não estão só na tabela nutricional.</HelpTip>
                                    </h3>
                                </div>
                            </div>
                            <CollapsibleContent className="flex flex-col gap-3 p-4">
                                {nutritionClaims.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border bg-card">
                                        <Table className="min-w-[46rem]">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Alegação</TableHead>
                                                    <TableHead>Critério</TableHead>
                                                    <TableHead>Resultado</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {nutritionClaims.map((claim) => {
                                                    const style = CLAIM_STATUS_STYLES[claim.status];
                                                    return (
                                                        <TableRow key={claim.key}>
                                                            <TableCell>
                                                                <div className="font-medium">{claim.label}</div>
                                                                <div className="text-xs text-muted-foreground">{claim.group}</div>
                                                            </TableCell>
                                                            <TableCell className="text-xs leading-relaxed">{claim.criterion}</TableCell>
                                                            <TableCell className="text-xs leading-relaxed">
                                                                <div>{claim.evidence}</div>
                                                                {claim.note && <div className="mt-1 text-muted-foreground">{claim.note}</div>}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className={style.className}>
                                                                    {style.label}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <Empty className="min-h-24 border">
                                        <EmptyHeader>
                                            <EmptyTitle>Sem alegações para avaliar</EmptyTitle>
                                            <EmptyDescription>Adicione ingredientes para iniciar a avaliação.</EmptyDescription>
                                        </EmptyHeader>
                                    </Empty>
                                )}
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Para embalagem individual, alegações também precisam atender o conteúdo total da embalagem quando aplicável.
                                </p>
                            </CollapsibleContent>
                        </Collapsible>

                        <div className={`${PANEL_MUTED_CLASS} overflow-hidden`}>
                            <div className={PANEL_HEADER_CLASS}>
                                <div className="flex items-center justify-between gap-3">
                                    <div className="inline-flex min-w-0 items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 shrink-0"
                                            onClick={() => setVdrSectionOpen((current) => !current)}
                                        >
                                            <ChevronDown className={`h-4 w-4 transition-transform ${vdrSectionOpen ? "rotate-0" : "-rotate-90"}`} />
                                        </Button>
                                        <h3 className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                                            Base de referência VDR
                                            <HelpTip>Define qual tabela de valores diários será usada para calcular o %VD no rótulo.</HelpTip>
                                        </h3>
                                    </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="is-supplement"
                                        checked={isSupplement}
                                        onCheckedChange={(c) => handleSupplementChange(!!c)}
                                    />
                                    <label
                                        htmlFor="is-supplement"
                                        className="cursor-pointer text-sm font-medium leading-none"
                                    >
                                        Suplemento alimentar
                                    </label>
                                </div>
                            </div>
                            </div>
                            {vdrSectionOpen && (
                            <div className="space-y-3 p-4">
                            <Select value={regulatoryScenario} onValueChange={handleRegulatoryScenarioChange}>
                                <SelectTrigger className="w-full min-w-0 h-auto min-h-10 py-2 data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:whitespace-normal *:data-[slot=select-value]:break-words *:data-[slot=select-value]:text-left *:data-[slot=select-value]:leading-relaxed">
                                    <SelectValue placeholder="Selecione a base regulatória" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    <SelectItem value="general">População geral - alimentos em geral (Anexo II)</SelectItem>
                                    <SelectItem value="specific">Grupo populacional específico / suplementos (Anexo VIII)</SelectItem>
                                  </SelectGroup>
                                </SelectContent>
                            </Select>

                            {regulatoryScenario === "specific" && (
                                <Select
                                    value={normalizePopulationGroupForScenario("specific", popGroup)}
                                    onValueChange={(v) => setPopGroup(v as PopGroup)}
                                >
                                <SelectTrigger className="w-full min-w-0 h-auto min-h-10 py-2 data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:whitespace-normal *:data-[slot=select-value]:break-words *:data-[slot=select-value]:text-left *:data-[slot=select-value]:leading-relaxed">
                                    <SelectValue
                                        placeholder="Selecione o grupo populacional"
                                        className="block max-w-[calc(100%-1.5rem)] whitespace-normal text-left leading-relaxed"
                                    />
                                </SelectTrigger>
                                <SelectContent
                                    position="popper"
                                    className="min-w-[var(--radix-select-trigger-width)] w-max max-w-[min(92vw,72rem)] p-1.5 [&_[data-slot=select-item]]:px-3 [&_[data-slot=select-item]]:py-2.5 [&_[data-slot=select-item]]:pr-10"
                                >
                                  <SelectGroup>
                                    {Object.entries(SPECIFIC_POPULATION_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            <span className="block max-w-full break-words whitespace-normal leading-relaxed">
                                                {label}
                                            </span>
                                        </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                                </Select>
                            )}
                            </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-card px-5 py-4">
                        <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="inline-flex min-w-0 items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    onClick={() => setMicronutrientsSectionOpen((current) => !current)}
                                >
                                    <ChevronDown className={`h-4 w-4 transition-transform ${micronutrientsSectionOpen ? "rotate-0" : "-rotate-90"}`} />
                                </Button>
                                <CardTitle className="inline-flex min-w-0 items-center gap-1.5 break-words text-base [overflow-wrap:anywhere]">
                                    Micronutrientes Opcionais
                                    <HelpTip>Marque o que deve aparecer na tabela. Deixe o valor manual em branco para usar o cálculo dos ingredientes; quando informado, ele vale por 100 g/ml e a porção é calculada automaticamente.</HelpTip>
                                </CardTitle>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full whitespace-normal sm:w-auto"
                                onClick={clearSelectedMicronutrients}
                                disabled={selectedNutrients.length === 0}
                            >
                                Limpar selecionados
                            </Button>
                        </div>
                    </CardHeader>
                    {micronutrientsSectionOpen && (
                    <CardContent className="max-h-96 overflow-y-auto bg-muted/20 pt-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {MICRONUTRIENTS_A_TO_Z.map(m => {
                                const isSelected = selectedNutrients.includes(m.name);
                                return (
                                <div key={m.name} className={`rounded-md px-2 py-1.5 transition-colors ${isSelected ? "bg-background shadow-sm" : ""}`}>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`micro-${m.name}`}
                                            checked={isSelected}
                                            onCheckedChange={() => toggleNutrient(m.name)}
                                        />
                                        <label
                                            htmlFor={`micro-${m.name}`}
                                            className="cursor-pointer text-sm font-medium leading-none text-muted-foreground"
                                        >
                                            {m.label} <span className="text-xs text-muted-foreground/80">({m.unit})</span>
                                        </label>
                                    </div>
                                    {isSelected && (
                                        <div className="ml-6 mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                                            <Input
                                                type="text"
                                                inputMode="decimal"
                                                value={manualMicronutrients[m.name] || ""}
                                                onChange={(event) => updateManualMicronutrient(m.name, event.target.value)}
                                                placeholder="Calculado pelos ingredientes"
                                                aria-label={`Valor manual de ${m.label} por 100 g ou ml`}
                                                className="h-8 text-sm"
                                            />
                                            <span className="text-[11px] whitespace-nowrap text-muted-foreground">por 100 g/ml</span>
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    </CardContent>
                    )}
                </Card>

                <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-card px-5 py-4">
                        <div className="flex items-center justify-between gap-2">
                            <div className="inline-flex min-w-0 items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    onClick={() => setExtraConstituentsSectionOpen((current) => !current)}
                                >
                                    <ChevronDown className={`h-4 w-4 transition-transform ${extraConstituentsSectionOpen ? "rotate-0" : "-rotate-90"}`} />
                                </Button>
                                <CardTitle className="inline-flex items-center gap-1.5 text-base">
                                    Constituintes Extras
                                    <HelpTip>Use para informações que não são nutrientes padrão da tabela, como lactose, galactose, creatina, cafeína, probióticos e enzimas.</HelpTip>
                                </CardTitle>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setExtraConstituentsSectionOpen(true);
                                    addExtraConstituent();
                                }}
                            >
                                Adicionar
                            </Button>
                        </div>
                    </CardHeader>
                    {extraConstituentsSectionOpen && (
                    <CardContent className="space-y-3 bg-muted/20 p-4">
                        {extraConstituents.length === 0 && (
                            <div className="rounded-lg border border-dashed bg-card py-4 text-center text-sm text-muted-foreground">
                                Use para lactose, galactose, creatina, cafeína, probióticos, enzimas e substâncias bioativas.
                            </div>
                        )}
                        {extraConstituents.map((item) => (
                            <div key={item.id} className="grid grid-cols-1 items-end gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[1fr_7rem_6rem_2.5rem]">
                                <div className="space-y-1">
                                    <Label className="text-xs">Nome</Label>
                                    <Input
                                        value={item.name}
                                        onChange={(event) => updateExtraConstituent(item.id, "name", event.target.value)}
                                        placeholder="ex: Creatina"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Porção</Label>
                                    <Input
                                        value={item.amount}
                                        onChange={(event) => updateExtraConstituent(item.id, "amount", event.target.value)}
                                        placeholder="ex: 3"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Unid.</Label>
                                    <Input
                                        value={item.unit}
                                        onChange={(event) => updateExtraConstituent(item.id, "unit", event.target.value)}
                                        placeholder="mg"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => removeExtraConstituent(item.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => addExtraConstituent({ name: "Lactose", unit: "g" })}>
                                Lactose
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => addExtraConstituent({ name: "Galactose", unit: "g" })}>
                                Galactose
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => addExtraConstituent({ name: "Creatina", unit: "g" })}>
                                Creatina
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => addExtraConstituent({ name: "Polióis", unit: "g" })}>
                                Polióis
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => addExtraConstituent({ name: "Maltitol", unit: "g" })}>
                                Maltitol
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => addExtraConstituent({ name: "Lactitol", unit: "g" })}>
                                Lactitol
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => addExtraConstituent({ name: "Xilitol", unit: "g" })}>
                                Xilitol
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => addExtraConstituent({ name: "Sorbitol", unit: "g" })}>
                                Sorbitol
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => addExtraConstituent({ name: "Manitol", unit: "g" })}>
                                Manitol
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => addExtraConstituent({ name: "Isomalt", unit: "g" })}>
                                Isomalt
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => addExtraConstituent({ name: "Eritritol", unit: "g" })}>
                                Eritritol
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => addExtraConstituent({ name: "Tagatose", unit: "g" })}>
                                Tagatose
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => addExtraConstituent({ name: "Polidextrose", unit: "g" })}>
                                Polidextrose
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => addExtraConstituent({ name: "Cafeína", unit: "mg" })}>
                                Cafeína
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => addExtraConstituent({ name: "Probióticos", unit: "UFC" })}>
                                Probióticos
                            </Button>
                        </div>
                    </CardContent>
                    )}
                </Card>

            </div>

            <div className="space-y-5 lg:sticky lg:self-start" style={{ top: "4rem" }}>
                <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-card px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className={PANEL_EYEBROW_CLASS}>Saída</p>
                                <CardTitle className="mt-1 inline-flex items-center gap-1.5 text-base">
                                    Pré-visualização
                                    <HelpTip>Mostra como a tabela ficará com os dados atuais. Use essa área para conferir antes de exportar ou salvar.</HelpTip>
                                </CardTitle>
                            </div>
                            <Badge variant={result ? "success" : "secondary"}>
                                {result ? "Calculada" : "Sem dados"}
                            </Badge>
                        </div>
                        <div className="space-y-2 pt-2">
                            <Label className="inline-flex items-center gap-1.5">
                                Modelo Oficial Pré-selecionado para Exportação
                                <HelpTip>Escolhe o modelo de tabela usado na prévia e já sincroniza a seleção do exportador de Excel.</HelpTip>
                            </Label>
                                <Select value={previewTableType} onValueChange={handlePreviewTypeChange}>
                                    <SelectTrigger className="w-full min-w-0 h-auto min-h-10 py-2 data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:whitespace-normal *:data-[slot=select-value]:break-words *:data-[slot=select-value]:text-left *:data-[slot=select-value]:leading-relaxed">
                                        <SelectValue placeholder="Selecione o modelo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectGroup>
                                        {previewTableOptions.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                        </SelectItem>
                                    ))}
                                      </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="flex min-w-0 flex-col items-center gap-8 overflow-visible bg-muted/35 px-4 py-8">
                        {result ? (
                            <>
                                <div ref={previewViewportRef} className="w-full min-w-0 overflow-x-auto overflow-y-visible">
                                    <div
                                        className="flex w-full justify-center pb-2"
                                    >
                                        <div
                                            ref={previewContentRef}
                                            className="origin-top"
                                            style={{ transform: `scale(${previewScale})`, transformOrigin: "top center" }}
                                        >
                                            <NutritionalLabel
                                                per100g={result.per100g}
                                                perPortion={result.perPortion}
                                                portionSize={portionSize}
                                                householdMeasure={householdMeasure || "..."}
                                                servingsPerPackage={servingsPerPackage}
                                                popGroup={popGroup}
                                                selectedNutrients={selectedNutrients}
                                                extraConstituents={extraConstituents}
                                                showDailyValue={showDailyValue}
                                                isSupplement={isSupplement}
                                                fop={undefined}
                                                previewType={previewTableType}
                                            />
                                        </div>
                                    </div>
                                </div>
                                {mandatoryStatements.length > 0 && (
                                    <div className="w-full max-w-[64rem] rounded-md border border-border/70 bg-background px-3 py-2 text-[11px] leading-snug">
                                        {mandatoryStatements.map((statement) => (
                                            <p key={`preview-statement-${statement}`}>{statement}</p>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex min-h-[320px] max-w-xs items-center text-center text-muted-foreground">
                                Preencha os dados e adicione ingredientes para visualizar a tabela ANVISA.
                            </div>
                        )}
                    </CardContent>

                    {result && shouldShowFopSeal && fopStatus && (
                        <div className="flex w-full shrink-0 flex-col items-center gap-3 bg-muted/[0.25] px-4 py-4">
                            <div className="inline-flex max-w-full justify-center rounded-lg border bg-background p-3 leading-none">
                                <MagnifyingGlassLabel
                                    id="nutrition-fop-seal-preview"
                                    highSugar={!!fopStatus.highSugar}
                                    highFat={!!fopStatus.highFat}
                                    highSodium={!!fopStatus.highSodium}
                                    config={effectiveLupaStyle}
                                />
                            </div>
                            <Button variant="outline" size="sm" onClick={handleOpenLupaEditor} disabled={saving}>
                                {saving ? "Salvando..." : tableId ? "Alterar lupa" : "Salvar e alterar lupa"}
                            </Button>
                        </div>
                    )}

                    {result && canExport && (
                        <div className="shrink-0 border-t bg-card p-4 sm:p-5">
                            <div className="space-y-5">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className={PANEL_EYEBROW_CLASS}>Central de exportação</p>
                                        <h2 className="mt-1 text-base font-semibold text-foreground">Baixar arquivos</h2>
                                        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                                            Escolha uma saída rápida ou baixe os documentos técnicos completos do projeto.
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className="w-fit shrink-0">
                                        4 arquivos técnicos
                                    </Badge>
                                </div>

                                <section className="space-y-3" aria-labelledby="label-export-heading">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                            <ImageIcon className="size-4" aria-hidden="true" />
                                        </div>
                                        <div>
                                            <h3 id="label-export-heading" className="text-sm font-semibold text-foreground">Rótulo nutricional</h3>
                                            <p className="mt-0.5 text-xs text-muted-foreground">Imagens para uso rápido ou pacote com Excel.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        <DropdownMenu>
                                            <ButtonGroup className="w-full">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => handleExportImage()}
                                                    className="min-w-0 flex-1 justify-start"
                                                >
                                                    <Download data-icon="inline-start" />
                                                    <span className="truncate">Exportar imagem</span>
                                                </Button>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        aria-label="Opções de exportação de imagem"
                                                    >
                                                        <ChevronDown aria-hidden="true" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                            </ButtonGroup>
                                            <DropdownMenuContent align="end" className="max-h-[70vh] w-64 overflow-y-auto">
                                                <DropdownMenuGroup>
                                                    <DropdownMenuLabel>Modelos para imagem</DropdownMenuLabel>
                                                    {availableTableOptions.map((item) => (
                                                        <DropdownMenuCheckboxItem
                                                            key={`img-type-${item.value}`}
                                                            checked={selectedTableTypes.includes(item.value)}
                                                            onSelect={(e) => e.preventDefault()}
                                                            onCheckedChange={() => toggleTableType(item.value)}
                                                        >
                                                            {item.label}
                                                        </DropdownMenuCheckboxItem>
                                                    ))}
                                                </DropdownMenuGroup>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuGroup>
                                                    <DropdownMenuLabel>Formato da imagem</DropdownMenuLabel>
                                                    {IMAGE_EXPORT_FORMAT_OPTIONS.map((item) => (
                                                        <DropdownMenuCheckboxItem
                                                            key={`img-format-${item.value}`}
                                                            checked={selectedImageFormats.includes(item.value)}
                                                            onSelect={(e) => e.preventDefault()}
                                                            onCheckedChange={() => toggleImageFormat(item.value)}
                                                        >
                                                            {item.label}
                                                        </DropdownMenuCheckboxItem>
                                                    ))}
                                                </DropdownMenuGroup>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuGroup>
                                                    <DropdownMenuCheckboxItem
                                                        checked={shouldShowFopSeal && includeFopSealOnImageExport}
                                                        onSelect={(e) => e.preventDefault()}
                                                        disabled
                                                    >
                                                        Lupa vetorial no ZIP
                                                    </DropdownMenuCheckboxItem>
                                                </DropdownMenuGroup>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuGroup>
                                                    <DropdownMenuItem onClick={() => setSelectedTableTypes(availableTableOptions.map((item) => item.value))}>
                                                        Selecionar todas as tabelas
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setSelectedTableTypes([previewTableType])}>
                                                        Usar só modelo da prévia
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setSelectedImageFormats([])}>
                                                        Limpar formatos
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setSelectedImageFormats(DEFAULT_IMAGE_EXPORT_FORMATS)}>
                                                        Restaurar padrão (PNG)
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleExportImage(selectedImageFormats)}>
                                                        Exportar agora ({selectedImageTableCount} tabela(s))
                                                    </DropdownMenuItem>
                                                </DropdownMenuGroup>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <DropdownMenu>
                                            <ButtonGroup className="w-full">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={handleExportCompleteZip}
                                                    className="min-w-0 flex-1 justify-start"
                                                >
                                                    <Download data-icon="inline-start" />
                                                    <span className="truncate">Pacote: imagem + Excel</span>
                                                </Button>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        aria-label="Opções de exportação do pacote"
                                                    >
                                                        <ChevronDown aria-hidden="true" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                            </ButtonGroup>
                                            <DropdownMenuContent align="end" className="max-h-[70vh] w-72 overflow-y-auto">
                                                <DropdownMenuGroup>
                                                    <DropdownMenuLabel>Modelos para o Excel</DropdownMenuLabel>
                                                    {availableTableOptions.map((item) => (
                                                        <DropdownMenuCheckboxItem
                                                            key={item.value}
                                                            checked={selectedTableTypes.includes(item.value)}
                                                            onSelect={(e) => e.preventDefault()}
                                                            onCheckedChange={() => toggleTableType(item.value)}
                                                        >
                                                            {item.label}
                                                        </DropdownMenuCheckboxItem>
                                                    ))}
                                                </DropdownMenuGroup>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuGroup>
                                                    <DropdownMenuLabel>Formato da imagem no pacote</DropdownMenuLabel>
                                                    {IMAGE_EXPORT_FORMAT_OPTIONS.map((item) => (
                                                        <DropdownMenuCheckboxItem
                                                            key={`zip-img-format-${item.value}`}
                                                            checked={selectedImageFormats.includes(item.value)}
                                                            onSelect={(e) => e.preventDefault()}
                                                            onCheckedChange={() => toggleImageFormat(item.value)}
                                                        >
                                                            {item.label}
                                                        </DropdownMenuCheckboxItem>
                                                    ))}
                                                </DropdownMenuGroup>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuGroup>
                                                    <DropdownMenuItem onClick={() => setSelectedTableTypes(availableTableOptions.map((item) => item.value))}>
                                                        Selecionar todas
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setSelectedTableTypes([])}>
                                                        Limpar seleção
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={handleExportCompleteZip}>
                                                        Exportar pacote ({selectedTableTypes.length})
                                                    </DropdownMenuItem>
                                                </DropdownMenuGroup>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </section>

                                <section className="space-y-3 border-t border-border/60 pt-4" aria-labelledby="technical-export-heading">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                            <FileText className="size-4" aria-hidden="true" />
                                        </div>
                                        <div>
                                            <h3 id="technical-export-heading" className="text-sm font-semibold text-foreground">Documentos técnicos</h3>
                                            <p className="mt-0.5 text-xs text-muted-foreground">Arquivos completos para consulta, revisão e compartilhamento.</p>
                                        </div>
                                    </div>

                                    <div className="divide-y overflow-hidden rounded-lg border border-border/70 bg-muted/20">
                                        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex min-w-0 items-start gap-3">
                                                <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-medium text-foreground">Memorial de cálculo</h4>
                                                    <p className="mt-0.5 text-xs text-muted-foreground">Rastreabilidade, composição e valores consolidados.</p>
                                                </div>
                                            </div>
                                            <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                                                <Button type="button" variant="outline" size="sm" onClick={() => handleDownloadDocument("memorial", "pdf")}>
                                                    <FileText aria-hidden="true" />
                                                    PDF
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => handleDownloadDocument("memorial", "xlsx")}>
                                                    <FileSpreadsheet aria-hidden="true" />
                                                    XLSX
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex min-w-0 items-start gap-3">
                                                <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-medium text-foreground">Ficha técnica</h4>
                                                    <p className="mt-0.5 text-xs text-muted-foreground">Características do produto, nutrição e logística.</p>
                                                </div>
                                            </div>
                                            <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                                                <Button type="button" variant="outline" size="sm" onClick={() => handleDownloadDocument("technical", "pdf")}>
                                                    <FileText aria-hidden="true" />
                                                    PDF
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => handleDownloadDocument("technical", "xlsx")}>
                                                    <FileSpreadsheet aria-hidden="true" />
                                                    XLSX
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <div className="flex flex-col gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-foreground">Mais formatos</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">SVG editável para ajustes fora do sistema.</p>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => handleExportImage(["svg"])} className="justify-start sm:justify-center">
                                        <Download data-icon="inline-start" />
                                        Exportar SVG editável
                                    </Button>
                                </div>

                                <Button onClick={() => void handleSave()} disabled={saving} className="h-10 w-full">
                                    {saving ? "Salvando..." : (
                                        <>
                                            <Save data-icon="inline-start" />
                                            <span>Salvar projeto</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {result && (
                <div className="pointer-events-none absolute left-0 top-0 opacity-0 z-[-100] w-[1200px] overflow-hidden bg-white" aria-hidden>
                    <div className="flex flex-col items-center gap-12 p-20 bg-white">
                        {imageExportTableTypes.map((tableType) => (
                            <div 
                                key={`export-hidden-${tableType}`} 
                                className="flex justify-center bg-white rounded-xl border border-border/40 p-8 shadow-sm"
                                style={{ width: 'fit-content' }}
                            >
                                <NutritionalLabel
                                    per100g={result.per100g}
                                    perPortion={result.perPortion}
                                    portionSize={portionSize}
                                    householdMeasure={householdMeasure || "..."}
                                    servingsPerPackage={servingsPerPackage}
                                    popGroup={popGroup}
                                    selectedNutrients={selectedNutrients}
                                    extraConstituents={extraConstituents}
                                    showDailyValue={showDailyValue}
                                    isSupplement={isSupplement}
                                    fop={undefined}
                                    previewType={tableType}
                                    id={`nutrition-label-container-export-${tableType}`}
                                />
                                {mandatoryStatements.length > 0 && (
                                    <div className="mt-2 text-[11px] leading-snug text-black">
                                        {mandatoryStatements.map((statement) => (
                                            <p key={`export-statement-${tableType}-${statement}`}>{statement}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {shouldShowFopSeal && includeFopSealOnImageExport && (
                            <div
                                key="export-hidden-fop-seal"
                                id="nutrition-fop-seal-export"
                                className="flex justify-center bg-white rounded-xl border border-border/40 p-6 shadow-sm"
                                style={{ width: "fit-content" }}
                            >
                                <div className="inline-block rounded-lg border bg-white p-3 leading-none">
                                    <MagnifyingGlassLabel
                                        highSugar={!!fopStatus?.highSugar}
                                        highFat={!!fopStatus?.highFat}
                                        highSodium={!!fopStatus?.highSodium}
                                        config={effectiveLupaStyle}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <AlertDialog open={exitDialogOpen} onOpenChange={(open) => {
                setExitDialogOpen(open);
                if (!open) {
                    suppressBeforeUnloadRef.current = false;
                    setPendingExitUrl(null);
                }
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Salvar alterações antes de sair?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você tem alterações na tabela que ainda não foram salvas. Salve agora para manter seu trabalho ou saia sem salvar.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={saving}>Continuar editando</AlertDialogCancel>
                        <Button type="button" variant="outline" onClick={() => void handleSaveAndExit()} disabled={saving}>
                            {saving ? "Salvando..." : "Salvar e sair"}
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleExitWithoutSaving} disabled={saving}>
                            Sair sem salvar
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            </div>
        </div>
    );
}
