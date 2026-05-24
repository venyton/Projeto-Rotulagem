'use client'

import { useActionState } from "react";
import { createCustomIngredient, updateCustomIngredient } from "@/features/ingredients/actions/custom-ingredient-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

// Initial state for useActionState
const initialState: { error?: string; success?: boolean } = {};
const DECIMAL_INPUT_STEP = "any";
const nutrientInputClass = "h-9 text-sm";
const nutrientLabelClass = "flex min-h-8 items-end text-xs leading-tight text-muted-foreground";
const nutrientGridClass = "grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4";
type MicroViewMode = "grouped" | "az";
type NutrientField = {
    name: string;
    label: string;
    unit: string;
};

const MAIN_NUTRIENTS = [
    { name: "energy", label: "Valor energético", unit: "kcal" },
    { name: "carbs", label: "Carboidratos", unit: "g" },
    { name: "sugarTotal", label: "Açúcares totais", unit: "g" },
    { name: "sugarAdded", label: "Açúcares adicionados", unit: "g" },
    { name: "protein", label: "Proteínas", unit: "g" },
    { name: "fiber", label: "Fibras alimentares", unit: "g" },
    { name: "sodium", label: "Sódio", unit: "mg" },
] as const;

const FAT_NUTRIENTS = [
    { name: "fatTotal", label: "Gorduras totais", unit: "g" },
    { name: "fatSat", label: "Gorduras saturadas", unit: "g" },
    { name: "fatTrans", label: "Gorduras trans", unit: "g" },
] as const;

const MICRONUTRIENT_GROUPS: Array<{ title: string; items: NutrientField[] }> = [
    {
        title: "Gorduras e lipideos",
        items: [
            { name: "fatMono", label: "Gord. Mono", unit: "g" },
            { name: "fatPoly", label: "Gord. Poli", unit: "g" },
            { name: "omega6", label: "Ômega 6", unit: "g" },
            { name: "omega3", label: "Ômega 3", unit: "mg" },
            { name: "cholesterol", label: "Colesterol", unit: "mg" },
        ],
    },
    {
        title: "Minerais",
        items: [
            { name: "calcium", label: "Cálcio", unit: "mg" },
            { name: "chloride", label: "Cloreto", unit: "mg" },
            { name: "magnesium", label: "Magnésio", unit: "mg" },
            { name: "manganese", label: "Manganês", unit: "mg" },
            { name: "phosphorus", label: "Fósforo", unit: "mg" },
            { name: "iron", label: "Ferro", unit: "mg" },
            { name: "potassium", label: "Potássio", unit: "mg" },
            { name: "copper", label: "Cobre", unit: "mcg" },
            { name: "zinc", label: "Zinco", unit: "mg" },
            { name: "selenium", label: "Selênio", unit: "mcg" },
            { name: "chromium", label: "Cromo", unit: "mcg" },
            { name: "molybdenum", label: "Molibdênio", unit: "mcg" },
            { name: "iodine", label: "Iodo", unit: "mcg" },
            { name: "fluoride", label: "Flúor", unit: "mg" },
        ],
    },
    {
        title: "Vitaminas",
        items: [
            { name: "vitaminA", label: "Vit. A", unit: "mcg" },
            { name: "vitaminD", label: "Vit. D", unit: "mcg" },
            { name: "vitaminE", label: "Vit. E", unit: "mg" },
            { name: "vitaminK", label: "Vit. K", unit: "mcg" },
            { name: "vitaminC", label: "Vit. C", unit: "mg" },
            { name: "thiamin", label: "Tiamina B1", unit: "mg" },
            { name: "riboflavin", label: "Riboflavina B2", unit: "mg" },
            { name: "niacin", label: "Niacina B3", unit: "mg" },
            { name: "vitaminB6", label: "Vit. B6", unit: "mg" },
            { name: "biotin", label: "Biotina", unit: "mcg" },
            { name: "folicAcid", label: "Ác. Fólico", unit: "mcg" },
            { name: "pantothenicAcid", label: "Ác. Pantot. B5", unit: "mg" },
            { name: "vitaminB12", label: "Vit. B12", unit: "mcg" },
            { name: "choline", label: "Colina", unit: "mg" },
        ],
    },
];

const MICRONUTRIENTS_A_TO_Z = MICRONUTRIENT_GROUPS.flatMap((group) => group.items).sort((a, b) =>
    a.label.localeCompare(b.label, "pt-BR")
);

export type IngredientFormProps = {
    initialData?: {
        id: string;
        name: string;
        energy: number;
        carbs: number;
        protein: number;
        fatTotal: number;
        fatSat: number;
        fatTrans: number;
        fiber: number;
        sodium: number;
        sugarTotal: number;
        sugarAdded: number;
        [key: string]: unknown; // Allow dynamic access for micronutrients
    };
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function AddIngredientForm({ initialData, trigger, open: controlledOpen, onOpenChange }: IngredientFormProps) {
    const updateAction = initialData?.id ? updateCustomIngredient.bind(null, initialData.id) : createCustomIngredient;
    const [state, formAction] = useActionState(updateAction, initialState);
    const [internalOpen, setInternalOpen] = useState(false);
    const [showMicros, setShowMicros] = useState(false);
    const [microViewMode, setMicroViewMode] = useState<MicroViewMode>("grouped");

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? onOpenChange! : setInternalOpen;
    const renderNutrientField = (nutrient: NutrientField) => (
        <div key={nutrient.name} className="space-y-1.5">
            <Label className={nutrientLabelClass}>{nutrient.label}</Label>
            <Input
                className={nutrientInputClass}
                name={nutrient.name}
                type="number"
                step={DECIMAL_INPUT_STEP}
                defaultValue={(() => {
                    const raw = initialData?.[nutrient.name];
                    return typeof raw === "number" || typeof raw === "string" ? raw : "";
                })()}
                placeholder={nutrient.unit}
            />
        </div>
    );

    useEffect(() => {
        if (state?.error) {
            toast.error(state.error);
        }
        if (state?.success) {
            toast.success(initialData ? "Ingrediente atualizado!" : "Ingrediente criado com sucesso!");
            setOpen(false);
        }
    }, [initialData, setOpen, state]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {(trigger || !isControlled) && (
                <DialogTrigger asChild>
                    {trigger || <Button><Plus className="mr-2 h-4 w-4" /> Novo Ingrediente</Button>}
                </DialogTrigger>
            )}
            <DialogContent className="flex max-h-[92vh] w-[min(94vw,52rem)] max-w-none flex-col overflow-hidden p-0">
                <DialogHeader>
                    <DialogTitle className="px-6 pt-6">{initialData ? "Editar Ingrediente" : "Adicionar Ingrediente"}</DialogTitle>
                </DialogHeader>
                <form action={formAction} className="mt-4 flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4">
                    <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input name="name" defaultValue={initialData?.name} required />
                    </div>

                    <h3 className="mt-4 border-b border-border/70 pb-2 text-sm font-semibold text-foreground">Macronutrientes (por 100g)</h3>
                    <div className="rounded-lg border border-stone-300 bg-stone-50 p-3 text-xs leading-relaxed text-stone-700 dark:border-stone-700 dark:bg-stone-950/20 dark:text-stone-300">
                        Açúcares naturais de frutas, vegetais, leites e derivados entram em totais. Açúcar, mel, xaropes, maltodextrina e similares entram também em adicionados.
                    </div>
                    <div className={nutrientGridClass}>
                        {MAIN_NUTRIENTS.map(renderNutrientField)}
                    </div>

                    <h3 className="mt-4 border-b border-border/70 pb-2 text-sm font-semibold text-foreground">Gorduras (por 100g)</h3>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
                        {FAT_NUTRIENTS.map(renderNutrientField)}
                    </div>

                    <div className="pt-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowMicros(!showMicros)} className="w-full">
                            {showMicros ? "Ocultar Micronutrientes" : "Mostrar Micronutrientes e Outros"}
                        </Button>
                    </div>

                    {showMicros && (
                        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/20">
                            <div className="flex rounded-md border border-input bg-background p-1">
                                <Button
                                    type="button"
                                    variant={microViewMode === "grouped" ? "secondary" : "ghost"}
                                    size="sm"
                                    className="h-8 flex-1 rounded-sm text-xs"
                                    onClick={() => setMicroViewMode("grouped")}
                                >
                                    Por tipo
                                </Button>
                                <Button
                                    type="button"
                                    variant={microViewMode === "az" ? "secondary" : "ghost"}
                                    size="sm"
                                    className="h-8 flex-1 rounded-sm text-xs"
                                    onClick={() => setMicroViewMode("az")}
                                >
                                    A a Z
                                </Button>
                            </div>
                            {microViewMode === "grouped" ? (
                                MICRONUTRIENT_GROUPS.map((group) => (
                                    <section key={group.title} className="space-y-3 rounded-lg border border-border/60 bg-background/70 p-3">
                                        <h4 className="border-b border-border/60 pb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                                            {group.title}
                                        </h4>
                                        <div className={nutrientGridClass}>
                                            {group.items.map(renderNutrientField)}
                                        </div>
                                    </section>
                                ))
                            ) : (
                                <section className="space-y-3 rounded-lg border border-border/60 bg-background/70 p-3">
                                    <h4 className="border-b border-border/60 pb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                                        Micronutrientes A a Z
                                    </h4>
                                    <div className={nutrientGridClass}>
                                        {MICRONUTRIENTS_A_TO_Z.map(renderNutrientField)}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}

                    {!initialData && <p className="text-xs text-muted-foreground">Valores por 100g de alimento.</p>}
                    {initialData && <p className="text-xs text-stone-600 dark:text-stone-400">Atenção: As alterações afetam todas as tabelas.</p>}
                    </div>

                    <div className="space-y-3 border-t border-border/70 bg-background px-6 py-4">
                        <div className="rounded-lg border border-stone-300 bg-stone-50 p-3 text-xs text-stone-700 dark:border-stone-700 dark:bg-stone-950/20 dark:text-stone-300">
                            <strong>Aviso:</strong> Verifique sempre as informações nas embalagens ou fontes confiáveis.
                        </div>

                        <Button type="submit" className="w-full">Salvar</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
