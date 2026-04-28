'use client'

import React, { useState, useEffect } from "react";
import { IngredientSelector } from "@/features/ingredients/components/IngredientSelector";
import { SelectedIngredient, calculateRecipe, CalculatedNutrients } from "@/features/tables/domain/nutrients";
import { NutritionalLabel } from "@/features/tables/components/NutritionalLabel";
import { MagnifyingGlassLabel } from "@/features/tables/components/MagnifyingGlassLabel";
import { POPULATION_GROUPS, PopGroup, POPULATION_LABELS } from "@/features/tables/domain/constants";
import { checkFOP, inferFopFoodType } from "@/features/tables/domain/anvisa";
import { Ingredient } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import html2canvas from "html2canvas";
import { MICRONUTRIENTS_A_TO_Z as MICRONUTRIENTS } from "@/features/tables/domain/micronutrients";
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

interface TableGeneratorProps {
    initialData?: {
        id: string;
        title: string;
        portionSize: number;
        householdMeasure: string;
        popGroup: string;
        ingredients: SelectedIngredient[];
    };
}

export function TableGenerator({ initialData }: TableGeneratorProps) {
    const initialMeasure = initialData?.householdMeasure || "";
    const [title, setTitle] = useState(initialData?.title || "");
    const [ingredients, setIngredients] = useState<SelectedIngredient[]>(initialData?.ingredients || []);
    const [portionSize, setPortionSize] = useState<number>(initialData?.portionSize || 0);
    const [householdMeasureCode, setHouseholdMeasureCode] = useState<HouseholdMeasureCode>(
        () => parseHouseholdMeasureValue(initialMeasure).code
    );
    const [householdMeasureCustom, setHouseholdMeasureCustom] = useState(
        () => parseHouseholdMeasureValue(initialMeasure).customValue
    );
    const [popGroup, setPopGroup] = useState<PopGroup>((initialData?.popGroup as PopGroup) || POPULATION_GROUPS.ADULTS);
    const [isSupplement, setIsSupplement] = useState(false);
    const [selectedNutrients, setSelectedNutrients] = useState<string[]>([]);
    const [selectedTableTypes, setSelectedTableTypes] = useState<ExcelTableType[]>(
        EXCEL_TABLE_OPTIONS.filter((item) => !SUPPLEMENT_TABLE_TYPES.includes(item.value)).map((item) => item.value)
    );
    const [selectedImageFormats, setSelectedImageFormats] = useState<ImageExportFormat[]>(["png"]);
    const [previewTableType, setPreviewTableType] = useState<ExcelTableType>("VERT");
    const [saving, setSaving] = useState(false);
    const [measureSuggestionsExpanded, setMeasureSuggestionsExpanded] = useState(true);

    // New state for selectors
    const [selectedGroup, setSelectedGroup] = useState<string>("");
    const [selectedProduct, setSelectedProduct] = useState<string>("");

    const [result, setResult] = useState<{
        per100g: CalculatedNutrients;
        perPortion: CalculatedNutrients;
    } | null>(null);

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
    const fopStatus = result ? checkFOP(result.per100g, inferFopFoodType(householdMeasure)) : null;
    const availableTableOptions = React.useMemo(
        () =>
            EXCEL_TABLE_OPTIONS.filter((item) =>
                isSupplement ? SUPPLEMENT_TABLE_TYPES.includes(item.value) : !SUPPLEMENT_TABLE_TYPES.includes(item.value)
            ),
        [isSupplement]
    );

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
        if (!availableTableOptions.some((item) => item.value === selected)) {
            return;
        }
        setPreviewTableType(selected);
        setSelectedTableTypes([selected]);
    };

    const handleAddIngredient = (ing: Ingredient) => {
        setIngredients(prev => [...prev, { ingredient: ing, quantity: 0, isAddedSugar: false }]);
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
        if (!initialData) return;

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
    }, [initialData]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveTable({
                id: initialData?.id,
                title,
                portion: portionSize,
                uom: "g",
                householdMeasure: householdMeasure || "medida caseira",
                popGroup,
                ingredients
            });
            toast.success("Tabela salva com sucesso!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar tabela.");
        } finally {
            setSaving(false);
        }
    };

    const renderLabelCanvas = async (elementId = "nutrition-label-container") => {
        const element = document.getElementById(elementId);
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

        return html2canvas(element, {
            backgroundColor: "#ffffff",
            scale: 3,
            pixelRatio: window.devicePixelRatio || 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            width: captureWidth > 0 ? captureWidth : element.scrollWidth,
            height: captureHeight > 0 ? captureHeight : element.scrollHeight,
            onclone: (clonedDoc: Document) => {
                const root = clonedDoc.documentElement;
                
                // Force Light Theme Colors (Hex only)
                const safeVars: Record<string, string> = {
                    "--background": "#ffffff",
                    "--foreground": "#111111",
                    "--primary": "#16a34a",
                    "--border": "#d1d5db",
                    "--input": "#d1d5db",
                };

                Object.entries(safeVars).forEach(([token, value]) => {
                    root.style.setProperty(token, value);
                });

                const neutralize = clonedDoc.createElement("style");
                neutralize.textContent = `
                  * {
                    letter-spacing: normal !important;
                    word-spacing: normal !important;
                    -webkit-font-smoothing: antialiased !important;
                    -moz-osx-font-smoothing: grayscale !important;
                    text-rendering: auto !important;
                    /* Kill modern color functions that break html2canvas */
                    border-color: #d1d5db !important; 
                    outline-color: transparent !important;
                  }
                  [id^="nutrition-label-container"], [id^="nutrition-label-container"] * {
                    outline: none !important;
                    box-shadow: none !important;
                    text-shadow: none !important;
                    filter: none !important;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
                    background-color: transparent;
                  }
                  [id^="nutrition-label-container"] {
                    background-color: #ffffff !important;
                  }
                  h1, h2, h3, h4, h5, h6 {
                    font-weight: bold !important;
                    color: #000000 !important;
                  }
                  table { border-collapse: collapse !important; border-color: #000000 !important; }
                  td, th { border-color: #d1d5db !important; color: #000000 !important; vertical-align: middle !important; }
                  hr, .h-\\[4px\\] { min-height: 4px !important; background-color: #000000 !important; }
                `;
                clonedDoc.head.appendChild(neutralize);

                clonedDoc.documentElement.classList.remove("dark");
                clonedDoc.documentElement.style.colorScheme = "light";
                clonedDoc.body.style.background = "#ffffff";
            },
        } as never);
    };

    const waitForPreviewRender = () =>
        new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => resolve());
            });
        });

    const downloadBlobResponse = async (response: Response, fallbackFileName: string) => {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;

        const disposition = response.headers.get("Content-Disposition") || "";
        const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
        link.download = match?.[1] || fallbackFileName;

        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };

    const handleExportImage = async (formats?: ImageExportFormat[]) => {
        const targetFormats = formats ?? selectedImageFormats;
        const formatsToExport = targetFormats.length > 0 ? targetFormats : ["png"];
        if (targetFormats.length === 0) {
            toast.info("Nenhum formato selecionado. Exportando em PNG.");
        }

        try {
            const canvas = await renderLabelCanvas();

            for (const format of formatsToExport) {
                const mime = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
                const data = canvas.toDataURL(mime, 0.92);
                const link = document.createElement("a");
                link.href = data;
                link.download = `tabela-nutricional.${format}`;
                link.click();
            }
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
            const JSZip = (JSZipModule as any).default || JSZipModule;
            const zip = new JSZip();

            // 2. Capture Images
            await waitForPreviewRender();
            for (const tableType of selectedTableTypes) {
                const exportElementId = `nutrition-label-container-export-${tableType}`;
                const canvas = await renderLabelCanvas(exportElementId);
                const base64Data = canvas.toDataURL("image/png").split(",")[1];
                zip.file(`tabela_${tableType.toLowerCase()}.png`, base64Data, { base64: true });
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
                    selectedNutrients,
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
        <div className="grid grid-cols-1 gap-8 pb-20 lg:grid-cols-2">
            <div className="space-y-6">
                <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
                    <CardHeader className="border-b border-border/60">
                        <CardTitle>Configurações da Receita</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">

                        {/* Group and Product Selectors */}
                        {/* Group and Product Selectors */}
                        <div className="mb-4 grid grid-cols-1 gap-4 rounded-xl border border-border/70 bg-muted/[0.22] p-4">
                            <div className="space-y-2">
                                <Label>Grupo de Alimentos (Opcional)</Label>
                                <Select value={selectedGroup} onValueChange={handleGroupChange}>
                                    <SelectTrigger className="w-full min-w-0 h-auto min-h-12 py-2 whitespace-normal">
                                        <SelectValue
                                            placeholder="Selecione um grupo"
                                            className="block max-w-[calc(100%-1.5rem)] whitespace-normal text-left leading-relaxed"
                                        />
                                    </SelectTrigger>
                                    <SelectContent
                                        position="popper"
                                        className="min-w-[var(--radix-select-trigger-width)] w-max max-w-[min(92vw,72rem)] p-1.5 [&_[data-slot=select-item]]:px-3 [&_[data-slot=select-item]]:py-3 [&_[data-slot=select-item]]:pr-10"
                                    >
                                        {FOOD_GROUPS.map((g, i) => (
                                            <SelectItem key={i} value={g.group} className="max-w-full">
                                                <span className="block max-w-full break-words whitespace-normal leading-relaxed">
                                                    {g.group}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Produto (Sugestão)</Label>
                                <Select value={selectedProduct} onValueChange={handleProductChange} disabled={!selectedGroup}>
                                    <SelectTrigger className="w-full min-w-0 h-auto min-h-12 py-2 whitespace-normal">
                                        <SelectValue
                                            placeholder="Selecione um produto"
                                            className="block max-w-[calc(100%-1.5rem)] whitespace-normal text-left leading-relaxed"
                                        />
                                    </SelectTrigger>
                                    <SelectContent
                                        position="popper"
                                        className="min-w-[var(--radix-select-trigger-width)] w-max max-w-[min(92vw,72rem)] p-1.5 [&_[data-slot=select-item]]:px-3 [&_[data-slot=select-item]]:py-3 [&_[data-slot=select-item]]:pr-10"
                                    >
                                        {FOOD_GROUPS.find(g => g.group === selectedGroup)?.products.map((p, i) => (
                                            <SelectItem key={i} value={p.name} className="max-w-full">
                                                <span className="block max-w-full break-words whitespace-normal leading-relaxed">
                                                    {p.name}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-full text-xs text-muted-foreground">
                                *Selecione para preencher automaticamente nome, porção e medida.
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
                                    <Label>Porção (g)</Label>
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
                                {currentMeasureSuggestedPortion && (
                                    <p className="text-xs text-muted-foreground">
                                        Sugestão oficial para esta medida: {currentMeasureSuggestedPortion} g. Você pode editar manualmente.
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Medida Caseira</Label>
                                <Select value={householdMeasureCode} onValueChange={handleHouseholdMeasureCodeChange}>
                                    <SelectTrigger className="w-full min-w-0 h-10">
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
                                <p className="text-xs text-muted-foreground">
                                    Use uma medida oficial para padronizar. Se não se aplicar, escolha &quot;Outra (digitar)&quot;.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Grupo Populacional</Label>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="is-supplement"
                                        checked={isSupplement}
                                        onCheckedChange={(c) => setIsSupplement(!!c)}
                                    />
                                    <label
                                        htmlFor="is-supplement"
                                        className="text-sm font-medium leading-none cursor-pointer"
                                    >
                                        Suplemento Alimentar
                                    </label>
                                </div>
                            </div>
                            <Select value={popGroup} onValueChange={(v) => setPopGroup(v as PopGroup)}>
                                <SelectTrigger className="w-full min-w-0 h-auto min-h-12 py-2 whitespace-normal">
                                    <SelectValue
                                        placeholder="Selecione"
                                        className="block max-w-[calc(100%-1.5rem)] whitespace-normal text-left leading-relaxed"
                                    />
                                </SelectTrigger>
                                <SelectContent
                                    position="popper"
                                    className="min-w-[var(--radix-select-trigger-width)] w-max max-w-[min(92vw,72rem)] p-1.5 [&_[data-slot=select-item]]:px-3 [&_[data-slot=select-item]]:py-2.5 [&_[data-slot=select-item]]:pr-10"
                                >
                                    {Object.entries(POPULATION_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            <span className="block max-w-full break-words whitespace-normal leading-relaxed">
                                                {label}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
                    {/* ... Ingredients Card Content ... */}
                    <CardHeader className="border-b border-border/60">
                        <div className="flex items-center justify-between gap-2">
                            <CardTitle>Ingredientes</CardTitle>
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

                        <div className="space-y-2">
                            {ingredients.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-end gap-3 rounded-xl border border-border/70 bg-muted/[0.22] p-3"
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
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`added-sugar-${idx}`}
                                                    checked={item.isAddedSugar}
                                                    onCheckedChange={(c) => updateIngredient(idx, 'isAddedSugar', !!c)}
                                                />
                                                <label
                                                    htmlFor={`added-sugar-${idx}`}
                                                    className="text-xs font-medium leading-none cursor-pointer"
                                                >
                                                    É açúcar adicionado
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
                                <div className="rounded-xl border-2 border-dashed border-border/70 bg-muted/[0.2] py-4 text-center text-sm text-muted-foreground">
                                    Adicione ingredientes para começar.
                                </div>
                            )}
                        </div>
                        {ingredients.length > 0 && (
                            <div className="mt-4 flex items-center justify-between rounded-xl border border-border/70 bg-muted/[0.3] p-4">
                                <span className="font-semibold text-sm">Peso Total dos Ingredientes:</span>
                                <span className="font-bold text-lg text-primary">{ingredients.reduce((acc, item) => acc + (item.quantity || 0), 0).toFixed(1)} g</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
                    <CardHeader className="border-b border-border/60">
                        <div className="flex items-center justify-between gap-2">
                            <CardTitle>Micronutrientes Opcionais</CardTitle>
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
                            {MICRONUTRIENTS.map(m => (
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

            </div>

            <div className="space-y-6">
                <Card className="sticky top-6 border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
                    <CardHeader className="border-b border-border/60">
                        <CardTitle>Pré-visualização</CardTitle>
                        <div className="space-y-2 pt-2">
                            <Label>Modelo Oficial Pré-selecionado para Exportação</Label>
                                <Select value={previewTableType} onValueChange={handlePreviewTypeChange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Selecione o modelo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableTableOptions.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                A seleção acima já ajusta os tipos marcados no exportador de Excel.
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent className="flex min-h-[400px] flex-col items-center gap-8 rounded-b-xl bg-muted/[0.25] py-8 dark:bg-muted/[0.18]">
                        {result ? (
                            <>
                                <NutritionalLabel
                                    per100g={result.per100g}
                                    perPortion={result.perPortion}
                                    portionSize={portionSize}
                                    householdMeasure={householdMeasure || "..."}
                                    popGroup={popGroup}
                                    selectedNutrients={selectedNutrients}
                                    fop={fopStatus || undefined}
                                    previewType={previewTableType}
                                />
                            </>
                        ) : (
                            <div className="text-muted-foreground text-center max-w-xs">
                                Preencha os dados e adicione ingredientes para visualizar a tabela ANVISA.
                            </div>
                        )}
                    </CardContent>

                    {result && (
                        <div className="space-y-4 border-t border-border/60 p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
                                <DropdownMenu>
                                    <div className="inline-flex w-full h-10 min-w-0 rounded-md border border-input overflow-hidden bg-background shadow-sm">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => handleExportImage()}
                                            className="h-full min-w-0 flex-1 justify-center gap-1.5 rounded-none border-0 px-2.5 text-[13px] font-medium hover:bg-accent/60"
                                        >
                                            <Download className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">Exportar Tabela</span>
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
                                    <DropdownMenuContent align="end" className="w-64">
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
                                        <DropdownMenuItem onClick={() => setSelectedImageFormats([])}>
                                            Limpar seleção
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setSelectedImageFormats(["png"])}>
                                            Restaurar padrão (PNG)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleExportImage(selectedImageFormats)}>
                                            Exportar agora ({selectedImageFormats.length})
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <DropdownMenu>
                                    <div className="inline-flex w-full h-10 min-w-0 rounded-md border border-input overflow-hidden bg-background shadow-sm">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={handleExportCompleteZip}
                                            className="h-full min-w-0 flex-1 justify-center gap-1.5 rounded-none border-0 px-2.5 text-[13px] font-medium hover:bg-accent/60"
                                        >
                                            <Download className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">Exportar Completo</span>
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
                                    <DropdownMenuContent align="end" className="w-72">
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

                                <Button onClick={handleSave} disabled={saving} className="w-full h-10 text-[13px] font-semibold">
                                    {saving ? "Salvando..." : (
                                        <>
                                            <Save className="h-3.5 w-3.5 shrink-0" />
                                            <span>Salvar Projeto</span>
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
                        {selectedTableTypes.map((tableType) => (
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
                                    popGroup={popGroup}
                                    selectedNutrients={selectedNutrients}
                                    fop={fopStatus || undefined}
                                    previewType={tableType}
                                    id={`nutrition-label-container-export-${tableType}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
