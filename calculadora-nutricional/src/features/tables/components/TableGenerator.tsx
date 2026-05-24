'use client'

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IngredientSelector } from "@/features/ingredients/components/IngredientSelector";
import { OpenFoodFactsImporter } from "@/features/open-food-facts/components/OpenFoodFactsImporter";
import {
    SelectedIngredient,
    calculateRecipe,
    CalculatedNutrients,
    isLikelyAddedSugarIngredient,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { HelpTip } from "@/components/ui/help-tip";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trash2, Download, Save, ChevronDown } from "lucide-react";
import { saveTable } from "@/features/tables/actions/table-actions";
import { toast } from "sonner";
import { toCanvas } from "html-to-image";
import { MICRONUTRIENTS_A_TO_Z } from "@/features/tables/domain/micronutrients";
import { FOOD_GROUPS } from "@/features/tables/domain/food-groups";
import {
    HOUSEHOLD_MEASURE_CODES,
    HOUSEHOLD_MEASURE_OPTIONS,
    HouseholdMeasureCode,
    parseHouseholdMeasureValue,
    toHouseholdMeasureLabel,
} from "@/features/tables/domain/household-measures";

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

type ImageExportFormat = "png" | "jpeg" | "webp";
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
type TableUiState = {
    selectedGroup?: string;
    selectedProduct?: string;
    packageContent?: number;
    servingsDeclarationMode?: ServingsDeclarationMode;
    servingsPerPackageManual?: string;
    regulatoryScenario?: RegulatoryScenario;
    regulatoryCategory?: RegulatoryCategory;
    isSupplement?: boolean;
    extraConstituents?: ExtraConstituent[];
    selectedNutrients?: string[];
    selectedTableTypes?: ExcelTableType[];
    selectedImageFormats?: ImageExportFormat[];
    includeFopSealOnImageExport?: boolean;
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

const NO_DAILY_VALUE_CATEGORIES: RegulatoryCategory[] = [
    "infant-formula",
    "enteral-formula",
    "metabolic-formula",
];

function median(values: number[]) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function normalizeText(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
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

export function TableGenerator({ initialData }: TableGeneratorProps) {
    const router = useRouter();
    const initialMeasure = initialData?.householdMeasure || "";
    const savedUiState: TableUiState = toTableUiState(initialData?.uiState);
    const [tableId, setTableId] = useState(initialData?.id || "");
    const [title, setTitle] = useState(initialData?.title || "");
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
    const [isSupplement, setIsSupplement] = useState(!!savedUiState.isSupplement);
    const [regulatoryCategory, setRegulatoryCategory] = useState<RegulatoryCategory>(
        savedUiState.regulatoryCategory || (savedUiState.isSupplement ? "supplement" : "general-food")
    );
    const [extraConstituents, setExtraConstituents] = useState<ExtraConstituent[]>(
        Array.isArray(savedUiState.extraConstituents) ? savedUiState.extraConstituents : []
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
    const [selectedTableTypes, setSelectedTableTypes] = useState<ExcelTableType[]>(
        savedUiState.selectedTableTypes && savedUiState.selectedTableTypes.length > 0
            ? savedUiState.selectedTableTypes
            : EXCEL_TABLE_OPTIONS.filter((item) => !SUPPLEMENT_TABLE_TYPES.includes(item.value)).map((item) => item.value)
    );
    const [selectedImageFormats, setSelectedImageFormats] = useState<ImageExportFormat[]>(savedUiState.selectedImageFormats || ["png"]);
    const [includeFopSealOnImageExport, setIncludeFopSealOnImageExport] = useState(
        savedUiState.includeFopSealOnImageExport ?? true
    );
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
    const [previewTableType, setPreviewTableType] = useState<ExcelTableType>(savedUiState.previewTableType || "VERT");
    const [saving, setSaving] = useState(false);
    const [measureSuggestionsExpanded, setMeasureSuggestionsExpanded] = useState(true);

    // New state for selectors
    const [selectedGroup, setSelectedGroup] = useState<string>(initialData?.suggestedFoodGroup || savedUiState.selectedGroup || "");
    const [selectedProduct, setSelectedProduct] = useState<string>(initialData?.suggestedProduct || savedUiState.selectedProduct || "");

    const [result, setResult] = useState<{
        per100g: CalculatedNutrients;
        perPortion: CalculatedNutrients;
    } | null>(null);
    const tableUiStorageKey = React.useMemo(
        () => (tableId ? `table-generator-ui:${tableId}` : ""),
        [tableId]
    );

    const suggestedPortionByMeasure = React.useMemo(() => {
        const grouped: Partial<Record<HouseholdMeasureCode, number[]>> = {};

        for (const group of FOOD_GROUPS) {
            for (const product of group.products) {
                const code = parseHouseholdMeasureValue(product.measure).code;
                if (code === HOUSEHOLD_MEASURE_CODES.OTHER) continue;
                grouped[code] = [...(grouped[code] ?? []), product.portion];
            }
        }

        const suggestions: Partial<Record<HouseholdMeasureCode, number>> = {};
        for (const [code, values] of Object.entries(grouped) as [HouseholdMeasureCode, number[]][]) {
            suggestions[code] = Math.round(median(values));
        }

        return suggestions;
    }, []);

    const currentMeasureSuggestedPortion =
        householdMeasureCode !== HOUSEHOLD_MEASURE_CODES.OTHER
            ? suggestedPortionByMeasure[householdMeasureCode]
            : undefined;
    const isUsingSuggestedPortion =
        typeof currentMeasureSuggestedPortion === "number" &&
        Math.abs(portionSize - currentMeasureSuggestedPortion) < 0.0001;
    const suggestedMeasuresForCurrentPortion = React.useMemo(() => {
        if (portionSize <= 0) return [];

        const entries = Object.entries(suggestedPortionByMeasure) as [HouseholdMeasureCode, number][];
        const candidates = entries
            .filter(([code]) => code !== HOUSEHOLD_MEASURE_CODES.OTHER && code !== householdMeasureCode)
            .map(([code, suggestedPortion]) => ({
                code,
                suggestedPortion,
                diff: Math.abs(portionSize - suggestedPortion),
            }))
            .sort((a, b) => a.diff - b.diff);

        if (candidates.length === 0) return [];

        const tolerance = Math.max(3, portionSize * 0.12);
        return candidates
            .filter((item) => item.diff <= tolerance)
            .slice(0, 4)
            .map((item) => {
                const label = HOUSEHOLD_MEASURE_OPTIONS.find((option) => option.code === item.code)?.label ?? "";
                return {
                    ...item,
                    label,
                };
            })
            .filter((item) => item.label.length > 0);
    }, [householdMeasureCode, portionSize, suggestedPortionByMeasure]);

    const householdMeasure = toHouseholdMeasureLabel(householdMeasureCode, householdMeasureCustom);
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

    const preparedReference = React.useMemo(
        () => ({
            sugarAdded: preparedSugarAdded,
            fatSat: preparedFatSat,
            sodium: preparedSodium,
        }),
        [preparedSugarAdded, preparedFatSat, preparedSodium]
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
    const activeFopSealCount = effectiveHasFopSeal && fopStatus
        ? [fopStatus.highSugar, fopStatus.highFat, fopStatus.highSodium].filter(Boolean).length
        : 0;
    const previewFopLayout: "horizontal" | "rectangular" = activeFopSealCount > 1 ? "rectangular" : "horizontal";
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
            const suggested = suggestedPortionByMeasure[code];
            if (suggested && suggested > 0) {
                setPortionSize(suggested);
            }
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

    const toggleNutrient = (name: string) => {
        setSelectedNutrients(prev =>
            prev.includes(name)
                ? prev.filter(n => n !== name)
                : [...prev, name]
        );
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

    const removeIngredient = (index: number) => {
        setIngredients(prev => prev.filter((_, i) => i !== index));
    };

    const clearIngredients = () => {
        if (ingredients.length === 0) return;
        setIngredients([]);
        toast.success("Ingredientes limpos.");
    };

    const clearSelectedMicronutrients = () => {
        if (selectedNutrients.length === 0) return;
        setSelectedNutrients([]);
        toast.success("Micronutrientes desmarcados.");
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
        const res = calculateRecipe(ingredients, portionSize);
        setResult(res);
    }, [ingredients, portionSize]);

    useEffect(() => {
        if (!tableUiStorageKey) return;
        if (initialData?.uiState) return;
        try {
            const raw = window.localStorage.getItem(tableUiStorageKey);
            if (!raw) return;
            const persisted = toTableUiState(JSON.parse(raw));

            if (typeof persisted.selectedGroup === "string") setSelectedGroup(persisted.selectedGroup);
            if (typeof persisted.selectedProduct === "string") setSelectedProduct(persisted.selectedProduct);
            if (typeof persisted.packageContent === "number" && Number.isFinite(persisted.packageContent)) {
                setPackageContent(persisted.packageContent);
            }

            if (persisted.servingsDeclarationMode) setServingsDeclarationMode(persisted.servingsDeclarationMode);
            if (typeof persisted.servingsPerPackageManual === "string") setServingsPerPackageManual(persisted.servingsPerPackageManual);
            if (persisted.regulatoryScenario) {
                setRegulatoryScenario(persisted.regulatoryScenario);
                setPopGroup((current) => normalizePopulationGroupForScenario(persisted.regulatoryScenario!, current));
            }
            if (persisted.regulatoryCategory) setRegulatoryCategory(persisted.regulatoryCategory);
            if (Array.isArray(persisted.extraConstituents)) setExtraConstituents(persisted.extraConstituents);
            if (typeof persisted.isSupplement === "boolean") {
                setIsSupplement(persisted.isSupplement);
                if (persisted.isSupplement) {
                    setRegulatoryScenario("specific");
                    setPopGroup((current) => normalizePopulationGroupForScenario("specific", current));
                }
            }

            if (Array.isArray(persisted.selectedNutrients)) setSelectedNutrients(persisted.selectedNutrients);
            if (Array.isArray(persisted.selectedTableTypes) && persisted.selectedTableTypes.length > 0) {
                setSelectedTableTypes(persisted.selectedTableTypes);
            }
            if (Array.isArray(persisted.selectedImageFormats) && persisted.selectedImageFormats.length > 0) {
                setSelectedImageFormats(persisted.selectedImageFormats);
            }

            if (typeof persisted.includeFopSealOnImageExport === "boolean") {
                setIncludeFopSealOnImageExport(persisted.includeFopSealOnImageExport);
            }
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

    const handleSave = async () => {
        setSaving(true);
        try {
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
                    selectedGroup,
                    selectedProduct,
                    packageContent,
                    servingsDeclarationMode,
                    servingsPerPackageManual,
                    regulatoryScenario,
                    regulatoryCategory,
                    isSupplement,
                    extraConstituents,
                    selectedNutrients,
                    selectedTableTypes,
                    selectedImageFormats,
                    includeFopSealOnImageExport,
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
                },
            });
            if (response?.error) {
                toast.error(response.error);
                return;
            }

            const savedId = response?.id;
            if (savedId) {
                const wasNewTable = !tableId;
                setTableId(savedId);
                if (wasNewTable) {
                    router.replace(`/dashboard/edit/${savedId}`);
                }
            }

            const storageKey = savedId ? `table-generator-ui:${savedId}` : tableUiStorageKey;
            if (storageKey) {
                const persisted: TableUiState = {
                    selectedGroup,
                    selectedProduct,
                    packageContent,
                    servingsDeclarationMode,
                    servingsPerPackageManual,
                    regulatoryScenario,
                    regulatoryCategory,
                    isSupplement,
                    extraConstituents,
                    selectedNutrients,
                    selectedTableTypes,
                    selectedImageFormats,
                    includeFopSealOnImageExport,
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
                };
                window.localStorage.setItem(storageKey, JSON.stringify(persisted));
            }
            toast.success("Tabela salva com sucesso!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar tabela.");
        } finally {
            setSaving(false);
        }
    };

    const renderLabelCanvas = async (elementId: string | string[] = "nutrition-label-container") => {
        const candidateIds = Array.isArray(elementId) ? elementId : [elementId];
        const resolvedElementId = candidateIds.find((id) => !!document.getElementById(id));
        const element = resolvedElementId ? document.getElementById(resolvedElementId) : null;
        if (!element) {
            throw new Error("Não foi possível localizar a tabela na tela para exportar.");
        }

        if (document.fonts?.ready) {
            await document.fonts.ready;
        }

        const captureWidth = Math.ceil(element.scrollWidth || element.clientWidth || 0);
        const captureHeight = Math.ceil(element.scrollHeight || element.clientHeight || 0);

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

    const handleExportImage = async (formats?: ImageExportFormat[]) => {
        const targetFormats = formats ?? selectedImageFormats;
        const formatsToExport = targetFormats.length > 0 ? targetFormats : ["png"];
        if (targetFormats.length === 0) {
            toast.info("Nenhum formato selecionado. Exportando em PNG.");
        }

        try {
            await waitForPreviewRender();

            const tableTargets = imageExportTableTypes.map((tableType) => ({
                tableType,
                elementId: `nutrition-label-container-export-${tableType}`,
            }));
            const files: Array<{ fileName: string; blob: Blob }> = [];

            for (const target of tableTargets) {
                const canvas = await renderLabelCanvas([target.elementId, "nutrition-label-container"]);

                for (const format of formatsToExport) {
                    const mime = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
                    const blob = await canvasToBlob(canvas, mime, 0.92);
                    files.push({
                        fileName: `tabela_${target.tableType.toLowerCase()}.${format}`,
                        blob,
                    });
                }
            }

            if (includeFopSealOnImageExport && effectiveHasFopSeal) {
                const fopElement = document.getElementById("nutrition-fop-seal-export");
                if (fopElement) {
                    const fopCanvas = await renderLabelCanvas("nutrition-fop-seal-export");
                    for (const format of formatsToExport) {
                        const mime = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
                        const blob = await canvasToBlob(fopCanvas, mime, 0.92);
                        files.push({
                            fileName: `selo_fop.${format}`,
                            blob,
                        });
                    }
                }
            }

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
            for (const tableType of selectedTableTypes) {
                const exportElementId = `nutrition-label-container-export-${tableType}`;
                const canvas = await renderLabelCanvas(exportElementId);
                const base64Data = canvas.toDataURL("image/png").split(",")[1];
                zip.file(`tabela_${tableType.toLowerCase()}.png`, base64Data, { base64: true });
            }

            if (effectiveHasFopSeal) {
                const fopCanvas = await renderLabelCanvas("nutrition-fop-seal-export");
                const fopBase64Data = fopCanvas.toDataURL("image/png").split(",")[1];
                zip.file("selo_fop.png", fopBase64Data, { base64: true });
            }

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

    return (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
            <div className="space-y-6">
                <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
                    <CardHeader className="border-b border-border/60">
                        <CardTitle>Configurações da Receita</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">

                        {/* Group and Product Selectors */}
                        {/* Group and Product Selectors */}
                        <div className="mb-4 grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/20">
                            <div className="space-y-2">
                                <Label className="inline-flex items-center gap-1.5">
                                    Grupo de Alimentos (Opcional)
                                    <HelpTip>Use quando quiser partir de uma categoria oficial. Isso ajuda a preencher produto, porção e medida com mais consistência.</HelpTip>
                                </Label>
                                <Select value={selectedGroup} onValueChange={handleGroupChange}>
                                    <SelectTrigger className="w-full min-w-0 h-auto min-h-10 py-2 data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:whitespace-normal *:data-[slot=select-value]:break-words *:data-[slot=select-value]:text-left *:data-[slot=select-value]:leading-relaxed">
                                        <SelectValue placeholder="Selecione um grupo" />
                                    </SelectTrigger>
                                    <SelectContent
                                        position="popper"
                                        className="min-w-[var(--radix-select-trigger-width)] w-max max-w-[min(92vw,72rem)] p-1.5 [&_[data-slot=select-item]]:px-3 [&_[data-slot=select-item]]:py-3 [&_[data-slot=select-item]]:pr-10"
                                    >
                                        {FOOD_GROUPS.map((g, i) => (
                                            <SelectItem key={i} value={g.group} className="max-w-full">
                                                {g.group}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="inline-flex items-center gap-1.5">
                                    Produto (Sugestão)
                                    <HelpTip>Ao selecionar um produto sugerido, o sistema preenche automaticamente nome, porção e medida caseira. Você ainda pode editar tudo depois.</HelpTip>
                                </Label>
                                <Select value={selectedProduct} onValueChange={handleProductChange} disabled={!selectedGroup}>
                                    <SelectTrigger className="w-full min-w-0 h-auto min-h-10 py-2 data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:whitespace-normal *:data-[slot=select-value]:break-words *:data-[slot=select-value]:text-left *:data-[slot=select-value]:leading-relaxed">
                                        <SelectValue placeholder="Selecione um produto" />
                                    </SelectTrigger>
                                    <SelectContent
                                        position="popper"
                                        className="min-w-[var(--radix-select-trigger-width)] w-max max-w-[min(92vw,72rem)] p-1.5 [&_[data-slot=select-item]]:px-3 [&_[data-slot=select-item]]:py-3 [&_[data-slot=select-item]]:pr-10"
                                    >
                                        {FOOD_GROUPS.find(g => g.group === selectedGroup)?.products.map((p, i) => (
                                            <SelectItem key={i} value={p.name} className="max-w-full">
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Nome do Produto / Título</Label>
                            <textarea
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="ex: Bolo de Cenoura"
                                rows={2}
                                className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base leading-relaxed shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive min-h-12 resize-y"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <Label className="inline-flex items-center gap-1.5">
                                        Porção (g)
                                        <HelpTip>Quantidade de alimento usada como referência no rótulo. Ela aparece na tabela e define o cálculo por porção.</HelpTip>
                                    </Label>
                                    {isUsingSuggestedPortion && (
                                        <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600/80" />
                                            Padrão oficial
                                        </span>
                                    )}
                                    {currentMeasureSuggestedPortion && currentMeasureSuggestedPortion !== portionSize && (
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
                                    onChange={e => setPortionSize(parseFloat(e.target.value) || 0)}
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
                                        {HOUSEHOLD_MEASURE_OPTIONS.map((measure) => (
                                            <SelectItem key={measure.code} value={measure.code}>
                                                <span className="block max-w-full break-words whitespace-normal leading-relaxed">
                                                    {measure.label}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {householdMeasureCode === HOUSEHOLD_MEASURE_CODES.OTHER && (
                                    <Input
                                        value={householdMeasureCustom}
                                        onChange={(e) => setHouseholdMeasureCustom(e.target.value)}
                                        placeholder="Digite a medida caseira (ex: 2 colheres rasas)"
                                    />
                                )}
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

                        <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/20 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="package-content" className="inline-flex items-center gap-1.5">
                                    Conteúdo da embalagem (g ou ml)
                                    <HelpTip>Peso ou volume total vendido na embalagem. O sistema usa esse valor para calcular quantas porções existem no pacote.</HelpTip>
                                </Label>
                                <Input
                                    id="package-content"
                                    type="number"
                                    value={packageContent || ""}
                                    onChange={(e) => setPackageContent(parseFloat(e.target.value) || 0)}
                                    placeholder="ex: 500"
                                />
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
                                        <SelectItem value="auto">Automático (ANVISA)</SelectItem>
                                        <SelectItem value="manual">Manual (cliente)</SelectItem>
                                    </SelectContent>
                                </Select>
                                {servingsDeclarationMode === "manual" ? (
                                    <Input
                                        value={servingsPerPackageManual}
                                        onChange={(e) => setServingsPerPackageManual(e.target.value)}
                                        placeholder='ex: Cerca de 3'
                                    />
                                ) : (
                                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950/20">
                                        {servingsPerPackageAuto}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/20">
                            <div className="flex items-center justify-between gap-2">
                                <Label className="inline-flex items-center gap-1.5 text-sm font-semibold">
                                    Conformidade ANVISA (RDC 429/IN 75)
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
                                            {REGULATORY_CATEGORY_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="inline-flex items-center gap-1.5">
                                        Perfil regulatório do produto
                                        <HelpTip>Use para casos especiais, como sal iodado, farinha enriquecida ou produtos que não devem exibir lupa frontal.</HelpTip>
                                    </Label>
                                    <Select value={complianceProfile} onValueChange={(value) => setComplianceProfile(value as ComplianceProfile)}>
                                        <SelectTrigger className="w-full min-w-0 h-auto min-h-10 py-2 data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:whitespace-normal *:data-[slot=select-value]:break-words *:data-[slot=select-value]:text-left *:data-[slot=select-value]:leading-relaxed">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {COMPLIANCE_PROFILE_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
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
                                            <SelectItem value="solid">Sólido/Semissólido (100 g)</SelectItem>
                                            <SelectItem value="liquid">Líquido (100 ml)</SelectItem>
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
                                            <SelectItem value="as-sold">Como exposto à venda</SelectItem>
                                            <SelectItem value="prepared">Pronto para consumo (Art. 19)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950/20">
                                    {effectiveHasFopSeal ? "Lupa ativa para este produto." : "Lupa inativa para este produto."}
                                </div>
                            </div>

                            {fopReferenceMode === "prepared" && (
                                <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-950/20 md:grid-cols-3">
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

                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <Label className="inline-flex items-center gap-1.5">
                                    Base de referência VDR
                                    <HelpTip>Define qual tabela de valores diários será usada para calcular o %VD no rótulo.</HelpTip>
                                </Label>
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
                            <Select value={regulatoryScenario} onValueChange={handleRegulatoryScenarioChange}>
                                <SelectTrigger className="w-full min-w-0 h-auto min-h-10 py-2 data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:whitespace-normal *:data-[slot=select-value]:break-words *:data-[slot=select-value]:text-left *:data-[slot=select-value]:leading-relaxed">
                                    <SelectValue placeholder="Selecione a base regulatória" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general">População geral - alimentos em geral (Anexo II)</SelectItem>
                                    <SelectItem value="specific">Grupo populacional específico / suplementos (Anexo VIII)</SelectItem>
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
                                    {Object.entries(SPECIFIC_POPULATION_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            <span className="block max-w-full break-words whitespace-normal leading-relaxed">
                                                {label}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
                    {/* ... Ingredients Card Content ... */}
                    <CardHeader className="border-b border-border/60">
                        <div className="flex items-center justify-between gap-2">
                            <CardTitle className="inline-flex items-center gap-1.5">
                                Ingredientes
                                <HelpTip>Monte a receita com ingredientes da base, ingredientes próprios ou produtos importados do Open Food Facts.</HelpTip>
                            </CardTitle>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearIngredients}
                                disabled={ingredients.length === 0}
                            >
                                Limpar selecionados
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <IngredientSelector onSelect={handleAddIngredient} />
                        <OpenFoodFactsImporter onSelect={handleAddIngredient} />

                        <div className="space-y-2">
                            {ingredients.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-end gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/20"
                                >
                                    <div className="flex-1 space-y-1">
                                        <div className="font-medium text-sm">{item.ingredient.name}</div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24">
                                                <Input
                                                    type="number"
                                                    placeholder="Qtd (g)"
                                                    value={item.quantity || ''}
                                                    onChange={e => updateIngredient(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                    className="h-8"
                                                />
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <Checkbox
                                                    id={`added-sugar-${idx}`}
                                                    checked={item.isAddedSugar}
                                                    onCheckedChange={(c) => updateIngredient(idx, 'isAddedSugar', !!c)}
                                                    className="mt-0.5"
                                                />
                                                <label
                                                    htmlFor={`added-sugar-${idx}`}
                                                    className="cursor-pointer space-y-0.5 text-xs leading-tight"
                                                >
                                                    <span className="inline-flex items-center gap-1.5 font-medium">
                                                        Conta como açúcar adicionado
                                                        <HelpTip>Marque quando o ingrediente for açúcar, mel, xarope, maltodextrina ou similar. Isso entra no cálculo de açúcares adicionados e pode ativar lupa.</HelpTip>
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeIngredient(idx)}
                                        className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {ingredients.length === 0 && (
                                <div className="rounded-lg border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950/20 py-4 text-center text-sm text-muted-foreground">
                                    Adicione ingredientes para começar.
                                </div>
                            )}
                        </div>
                        {ingredients.length > 0 && (
                            <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/20">
                                <span className="font-semibold text-sm">Peso Total dos Ingredientes:</span>
                                <span className="font-bold text-lg text-primary">{ingredients.reduce((acc, item) => acc + (item.quantity || 0), 0).toFixed(1)} g</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
                    <CardHeader className="border-b border-border/60">
                        <div className="flex items-center justify-between gap-2">
                            <CardTitle className="inline-flex items-center gap-1.5">
                                Micronutrientes Opcionais
                                <HelpTip>Marque apenas os micronutrientes que precisam aparecer na tabela. Os valores vêm dos ingredientes cadastrados.</HelpTip>
                            </CardTitle>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearSelectedMicronutrients}
                                disabled={selectedNutrients.length === 0}
                            >
                                Limpar selecionados
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="h-60 overflow-y-auto pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {MICRONUTRIENTS_A_TO_Z.map(m => (
                                <div key={m.name} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`micro-${m.name}`}
                                        checked={selectedNutrients.includes(m.name)}
                                        onCheckedChange={() => toggleNutrient(m.name)}
                                    />
                                    <label
                                        htmlFor={`micro-${m.name}`}
                                        className="text-sm font-medium leading-none cursor-pointer text-muted-foreground"
                                    >
                                        {m.label} <span className="text-xs text-muted-foreground/80">({m.unit})</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
                    <CardHeader className="border-b border-border/60">
                        <div className="flex items-center justify-between gap-2">
                            <CardTitle className="inline-flex items-center gap-1.5">
                                Constituintes Extras
                                <HelpTip>Use para informações que não são nutrientes padrão da tabela, como lactose, galactose, creatina, cafeína, probióticos e enzimas.</HelpTip>
                            </CardTitle>
                            <Button type="button" variant="ghost" size="sm" onClick={() => addExtraConstituent()}>
                                Adicionar
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {extraConstituents.length === 0 && (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950/20 py-4 text-center text-sm text-muted-foreground">
                                Use para lactose, galactose, creatina, cafeína, probióticos, enzimas e substâncias bioativas.
                            </div>
                        )}
                        {extraConstituents.map((item) => (
                            <div key={item.id} className="grid grid-cols-1 items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/20 sm:grid-cols-[1fr_7rem_6rem_2.5rem]">
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
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeExtraConstituent(item.id)}
                                    className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
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
                            <Button type="button" variant="outline" size="sm" onClick={() => addExtraConstituent({ name: "Cafeína", unit: "mg" })}>
                                Cafeína
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => addExtraConstituent({ name: "Probióticos", unit: "UFC" })}>
                                Probióticos
                            </Button>
                        </div>
                    </CardContent>
                </Card>

            </div>

            <div className="space-y-6 lg:self-stretch">
                <Card className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
                    <CardHeader className="border-b border-border/60">
                        <CardTitle className="inline-flex items-center gap-1.5">
                            Pré-visualização
                            <HelpTip>Mostra como a tabela ficará com os dados atuais. Use essa área para conferir antes de exportar ou salvar.</HelpTip>
                        </CardTitle>
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
                                        {previewTableOptions.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="flex min-h-[400px] min-w-0 flex-col items-center gap-8 overflow-visible rounded-b-xl bg-muted/[0.25] px-4 py-8 dark:bg-muted/[0.18]">
                        {result ? (
                            <>
                                <div ref={previewViewportRef} className="w-full min-w-0 overflow-visible">
                                    <div
                                        className="flex w-full justify-center"
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
                            <div className="text-muted-foreground text-center max-w-xs">
                                Preencha os dados e adicione ingredientes para visualizar a tabela ANVISA.
                            </div>
                        )}
                    </CardContent>

                    {result && effectiveHasFopSeal && fopStatus && (
                        <div className="flex w-full justify-center bg-muted/[0.25] px-1 py-1 dark:bg-muted/[0.18]">
                            <div
                                className="inline-flex max-w-full justify-center rounded-[10px] border-[4px] p-[2px] leading-none"
                                style={{ borderColor: "#000000", backgroundColor: "#ffffff" }}
                            >
                                <MagnifyingGlassLabel
                                    id="nutrition-fop-seal-preview"
                                    highSugar={!!fopStatus.highSugar}
                                    highFat={!!fopStatus.highFat}
                                    highSodium={!!fopStatus.highSodium}
                                    layout={previewFopLayout}
                                />
                            </div>
                        </div>
                    )}

                    {result && (
                        <div className="space-y-4 border-t border-border/60 p-6">
                            <div className="grid grid-cols-2 gap-4 items-stretch">
                                <DropdownMenu>
                                    <div className="inline-flex w-full h-10 min-w-0 rounded-md border border-input overflow-hidden bg-background shadow-sm">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => handleExportImage()}
                                            className="h-full min-w-0 flex-1 justify-center gap-1.5 rounded-none border-0 px-2 text-[12px] font-semibold hover:bg-accent/60 whitespace-nowrap"
                                        >
                                            <Download className="h-3.5 w-3.5 shrink-0" />
                                            <span>Exportar Só Imagem</span>
                                        </Button>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-full w-10 shrink-0 rounded-none border-0 border-l border-input text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                                            >
                                                <ChevronDown className="h-4 w-4 shrink-0" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                    </div>
                                    <DropdownMenuContent align="end" className="w-64 max-h-[70vh] overflow-y-auto">
                                        <DropdownMenuLabel>Modelos para Imagem</DropdownMenuLabel>
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
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel>Formato da Imagem</DropdownMenuLabel>
                                        <DropdownMenuCheckboxItem
                                            checked={selectedImageFormats.includes("png")}
                                            onSelect={(e) => e.preventDefault()}
                                            onCheckedChange={() => toggleImageFormat("png")}
                                        >
                                            PNG (Recomendado)
                                        </DropdownMenuCheckboxItem>
                                        <DropdownMenuCheckboxItem
                                            checked={selectedImageFormats.includes("jpeg")}
                                            onSelect={(e) => e.preventDefault()}
                                            onCheckedChange={() => toggleImageFormat("jpeg")}
                                        >
                                            JPEG
                                        </DropdownMenuCheckboxItem>
                                        <DropdownMenuCheckboxItem
                                            checked={selectedImageFormats.includes("webp")}
                                            onSelect={(e) => e.preventDefault()}
                                            onCheckedChange={() => toggleImageFormat("webp")}
                                        >
                                            WEBP
                                        </DropdownMenuCheckboxItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuCheckboxItem
                                            checked={includeFopSealOnImageExport}
                                            onSelect={(e) => e.preventDefault()}
                                            onCheckedChange={() => setIncludeFopSealOnImageExport((prev) => !prev)}
                                            disabled={!effectiveHasFopSeal}
                                        >
                                            Incluir selo FOP separado
                                        </DropdownMenuCheckboxItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => setSelectedTableTypes(availableTableOptions.map((item) => item.value))}
                                        >
                                            Selecionar todas as tabelas
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setSelectedTableTypes([previewTableType])}>
                                            Usar só modelo da prévia
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setSelectedImageFormats([])}>
                                            Limpar formatos
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setSelectedImageFormats(["png"])}>
                                            Restaurar padrão (PNG)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleExportImage(selectedImageFormats)}>
                                            Exportar agora ({selectedImageTableCount} tabela(s))
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <DropdownMenu>
                                    <div className="inline-flex w-full h-10 min-w-0 rounded-md border border-input overflow-hidden bg-background shadow-sm">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={handleExportCompleteZip}
                                            className="h-full min-w-0 flex-1 justify-center gap-1.5 rounded-none border-0 px-2 text-[12px] font-semibold hover:bg-accent/60 whitespace-nowrap"
                                        >
                                            <Download className="h-3.5 w-3.5 shrink-0" />
                                            <span>Exportar Imagem + Excel</span>
                                        </Button>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-full w-10 shrink-0 rounded-none border-0 border-l border-input text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                                            >
                                                <ChevronDown className="h-4 w-4 shrink-0" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                    </div>
                                    <DropdownMenuContent align="end" className="w-72 max-h-[70vh] overflow-y-auto">
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
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => setSelectedTableTypes(availableTableOptions.map((item) => item.value))}
                                        >
                                            Selecionar todas
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setSelectedTableTypes([])}>
                                            Limpar seleção
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleExportCompleteZip}>
                                            Exportar ZIP (Excel + imagem) ({selectedTableTypes.length})
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <Button onClick={handleSave} disabled={saving} className="w-full h-10 text-[13px] font-semibold">
                                {saving ? "Salvando..." : (
                                    <>
                                        <Save className="h-3.5 w-3.5 shrink-0" />
                                        <span>Salvar Projeto</span>
                                    </>
                                )}
                            </Button>

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
                        {effectiveHasFopSeal && (
                            <div
                                key="export-hidden-fop-seal"
                                id="nutrition-fop-seal-export"
                                className="flex justify-center bg-white rounded-xl border border-border/40 p-6 shadow-sm"
                                style={{ width: "fit-content" }}
                            >
                                <div
                                    className="border-[4px] rounded-[10px] p-[2px] inline-block leading-none"
                                    style={{ borderColor: "#000000", backgroundColor: "#ffffff" }}
                                >
                                    <MagnifyingGlassLabel
                                        highSugar={!!fopStatus?.highSugar}
                                        highFat={!!fopStatus?.highFat}
                                        highSodium={!!fopStatus?.highSodium}
                                        layout="horizontal"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
