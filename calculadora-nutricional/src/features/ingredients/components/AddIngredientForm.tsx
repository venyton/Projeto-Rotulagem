'use client'

import { useActionState } from "react";
import { createCustomIngredient, updateCustomIngredient } from "@/features/ingredients/actions/custom-ingredient-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, X } from "lucide-react";


const initialState: { error?: string; success?: boolean } = {};
const DECIMAL_INPUT_STEP = "any";
const nutrientInputClass = "h-9 text-sm";
const nutrientLabelClass = "flex min-h-8 items-end text-xs leading-tight text-muted-foreground";
const nutrientGridClass = "grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4";
type MicroViewMode = "grouped" | "az";
type NutrientField = { name: string; label: string; unit: string; required?: boolean };
type CustomNutrientsInput = Record<string, { value: number; unit: string }>;
type IngredientFormData = Record<string, unknown> & {
    id?: string;
    name?: string;
    customNutrients?: unknown;
    ingredientsText?: string | null;
    allergensText?: string | null;
    containsGluten?: boolean | null;
    glutenText?: string | null;
};

function readInitialCustomNutrients(value: unknown): CustomNutrientsInput {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).flatMap(([name, raw]) => {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
        const item = raw as Record<string, unknown>;
        if (typeof item.value !== "number" || !Number.isFinite(item.value) || typeof item.unit !== "string") return [];
        return [[name, { value: item.value, unit: item.unit }]];
    }));
}

const MAIN_NUTRIENTS: NutrientField[] = [
    { name: "energy", label: "Valor energético", unit: "kcal", required: true },
    { name: "carbs", label: "Carboidratos", unit: "g", required: true },
    { name: "sugarTotal", label: "Açúcares totais", unit: "g" },
    { name: "sugarAdded", label: "Açúcares adicionados", unit: "g" },
    { name: "protein", label: "Proteínas", unit: "g", required: true },
    { name: "fiber", label: "Fibras alimentares", unit: "g", required: true },
    { name: "sodium", label: "Sódio", unit: "mg", required: true },
];

const FAT_NUTRIENTS: NutrientField[] = [
    { name: "fatTotal", label: "Gorduras totais", unit: "g", required: true },
    { name: "fatSat", label: "Gorduras saturadas", unit: "g", required: true },
    { name: "fatTrans", label: "Gorduras trans", unit: "g", required: true },
];

const MICRONUTRIENT_GROUPS = [
    {
        title: "Gorduras e lipídeos (Anexo II)",
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
            { name: "copper", label: "Cobre", unit: "µg" },
            { name: "zinc", label: "Zinco", unit: "mg" },
            { name: "selenium", label: "Selênio", unit: "µg" },
            { name: "chromium", label: "Cromo", unit: "µg" },
            { name: "molybdenum", label: "Molibdênio", unit: "µg" },
            { name: "iodine", label: "Iodo", unit: "µg" },
            { name: "fluoride", label: "Flúor", unit: "mg" },
        ],
    },
    {
        title: "Vitaminas",
        items: [
            { name: "vitaminA", label: "Vit. A", unit: "µg" },
            { name: "vitaminD", label: "Vit. D", unit: "µg" },
            { name: "vitaminE", label: "Vit. E", unit: "mg" },
            { name: "vitaminK", label: "Vit. K", unit: "µg" },
            { name: "vitaminC", label: "Vit. C", unit: "mg" },
            { name: "thiamin", label: "Tiamina B1", unit: "mg" },
            { name: "riboflavin", label: "Riboflavina B2", unit: "mg" },
            { name: "niacin", label: "Niacina B3", unit: "mg" },
            { name: "vitaminB6", label: "Vit. B6", unit: "mg" },
            { name: "biotin", label: "Biotina", unit: "µg" },
            { name: "folicAcid", label: "Ác. Fólico", unit: "µg" },
            { name: "pantothenicAcid", label: "Ác. Pantot. B5", unit: "mg" },
            { name: "vitaminB12", label: "Vit. B12", unit: "µg" },
            { name: "choline", label: "Colina", unit: "mg" },
        ],
    },
];

const MICRONUTRIENTS_A_TO_Z = MICRONUTRIENT_GROUPS.flatMap((group) => group.items).sort((a, b) =>
    a.label.localeCompare(b.label, "pt-BR")
);

function parseDecimalInput(value: string) {
    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
}

export type IngredientFormProps = {
    initialData?: IngredientFormData;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function AddIngredientForm({ initialData, trigger, open: controlledOpen, onOpenChange }: IngredientFormProps) {
    const updateAction = initialData?.id ? updateCustomIngredient.bind(null, initialData.id) : createCustomIngredient;
    const [state, formAction, pending] = useActionState(updateAction, initialState);
    const [internalOpen, setInternalOpen] = useState(false);
    const [showMicros, setShowMicros] = useState(false);
    const [microViewMode, setMicroViewMode] = useState<MicroViewMode>("grouped");
    const [activeTab, setActiveTab] = useState<"nutrients" | "info">("nutrients");

    // Dynamic custom nutrients
    const [customNutrients, setCustomNutrients] = useState<Record<string, { value: number; unit: string }>>(
        readInitialCustomNutrients(initialData?.customNutrients)
    );
    const [newCustomName, setNewCustomName] = useState("");
    const [newCustomValue, setNewCustomValue] = useState("");
    const [newCustomUnit, setNewCustomUnit] = useState("g");

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? onOpenChange! : setInternalOpen;

    const addCustomNutrient = () => {
        if (!newCustomName.trim() || !newCustomValue) return;
        setCustomNutrients(prev => ({
            ...prev,
            [newCustomName.trim()]: { value: parseDecimalInput(newCustomValue), unit: newCustomUnit.trim() }
        }));
        setNewCustomName("");
        setNewCustomValue("");
        setNewCustomUnit("g");
    };

    const removeCustomNutrient = (key: string) => {
        setCustomNutrients(prev => {
            const copy = { ...prev };
            delete copy[key];
            return copy;
        });
    };

    const renderNutrientField = (nutrient: NutrientField) => (
        <Field key={nutrient.name} className="gap-1.5">
            <FieldLabel htmlFor={`nutrient-${nutrient.name}`} className={nutrientLabelClass}>{nutrient.label}</FieldLabel>
            <Input
                id={`nutrient-${nutrient.name}`}
                className={nutrientInputClass}
                name={nutrient.name}
                type="number"
                step={DECIMAL_INPUT_STEP}
                required={nutrient.required}
                defaultValue={(() => {
                    const raw = initialData?.[nutrient.name];
                    return typeof raw === "number" || typeof raw === "string" ? raw : "";
                })()}
                placeholder={nutrient.unit}
            />
        </Field>
    );

    useEffect(() => {
        if (state?.error) toast.error(state.error);
        if (state?.success) {
            toast.success(initialData ? "Ingrediente atualizado!" : "Ingrediente criado com sucesso!");
            setOpen(false);
        }
    }, [initialData, setOpen, state]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {(trigger || !isControlled) && (
                <DialogTrigger asChild>
                    {trigger || <Button><Plus data-icon="inline-start" />Novo ingrediente</Button>}
                </DialogTrigger>
            )}
            <DialogContent className="flex max-h-[92vh] w-[min(94vw,52rem)] max-w-none flex-col overflow-hidden p-0">
                <DialogHeader>
                    <DialogTitle className="px-6 pt-6">{initialData ? "Editar Ingrediente" : "Adicionar Ingrediente"}</DialogTitle>
                </DialogHeader>
                <form action={formAction} className="mt-4 flex min-h-0 flex-1 flex-col">
                    <input type="hidden" name="customNutrients" value={JSON.stringify(customNutrients)} />
                    
                    <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
                        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "nutrients" | "info")} className="w-full">
                            <TabsList variant="line" className="w-full justify-start border-b">
                                <TabsTrigger value="nutrients">Nutricional</TabsTrigger>
                                <TabsTrigger value="info">Informações opcionais</TabsTrigger>
                            </TabsList>

                            <TabsContent value="nutrients" forceMount className="flex flex-col gap-4 pt-4 data-[state=inactive]:hidden">
                                <Field>
                                    <FieldLabel htmlFor="ingredient-name">Nome do ingrediente</FieldLabel>
                                    <Input id="ingredient-name" name="name" defaultValue={initialData?.name} required placeholder="Ex: Farinha de trigo" />
                                </Field>

                                <h3 className="mt-4 border-b border-border/70 pb-2 text-sm font-semibold text-foreground">Macronutrientes (por 100g)</h3>
                                <Alert><AlertDescription>Os campos obrigatórios estão marcados. Açúcares totais e adicionados podem ficar vazios se não declarados.</AlertDescription></Alert>
                                <div className={nutrientGridClass}>
                                    {MAIN_NUTRIENTS.map(renderNutrientField)}
                                </div>

                                <h3 className="mt-4 border-b border-border/70 pb-2 text-sm font-semibold text-foreground">Gorduras (por 100g)</h3>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
                                    {FAT_NUTRIENTS.map(renderNutrientField)}
                                </div>

                                <div className="pt-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => setShowMicros(!showMicros)} className="w-full">
                                        {showMicros ? "Ocultar Micronutrientes e Outros" : "Mostrar Micronutrientes e Outros"}
                                    </Button>
                                </div>

                                {showMicros && (
                                    <div className="flex flex-col gap-4 rounded-lg border bg-muted/35 p-4">
                                        <ToggleGroup type="single" value={microViewMode} onValueChange={(value) => value && setMicroViewMode(value as MicroViewMode)} variant="outline" className="w-full">
                                            <ToggleGroupItem value="grouped" className="flex-1">Por tipo</ToggleGroupItem>
                                            <ToggleGroupItem value="az" className="flex-1">A a Z</ToggleGroupItem>
                                        </ToggleGroup>
                                        {microViewMode === "grouped" ? (
                                            MICRONUTRIENT_GROUPS.map((group) => (
                                                <section key={group.title} className="space-y-3 rounded-lg border border-border/60 bg-background/70 p-3">
                                                    <h4 className="border-b border-border/60 pb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">{group.title}</h4>
                                                    <div className={nutrientGridClass}>{group.items.map(renderNutrientField)}</div>
                                                </section>
                                            ))
                                        ) : (
                                            <section className="space-y-3 rounded-lg border border-border/60 bg-background/70 p-3">
                                                <h4 className="border-b border-border/60 pb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">Micronutrientes A a Z</h4>
                                                <div className={nutrientGridClass}>{MICRONUTRIENTS_A_TO_Z.map(renderNutrientField)}</div>
                                            </section>
                                        )}

                                        <section className="space-y-3 rounded-lg border border-border/60 bg-background/70 p-3 mt-4">
                                            <h4 className="border-b border-border/60 pb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">Outros (Linha Dinâmica)</h4>
                                            <p className="text-xs text-muted-foreground">Adicione constituintes customizados (ex: Polióis, Cafeína, Creatina) que não estão na lista padrão.</p>
                                            
                                            <div className="space-y-2">
                                                {Object.entries(customNutrients).map(([key, data]) => (
                                                    <div key={key} className="flex items-center gap-2 bg-background p-2 rounded-md border">
                                                        <span className="flex-1 text-sm font-medium">{key}</span>
                                                        <span className="text-sm text-muted-foreground">{data.value} {data.unit}</span>
                                                        <Button type="button" variant="destructive" size="icon" className="h-6 w-6" onClick={() => removeCustomNutrient(key)}><X className="h-4 w-4" /></Button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex items-end gap-2 mt-2">
                                                <div className="flex-1 space-y-1">
                                                    <Label className="text-xs">Nome</Label>
                                                    <Input className="h-8 text-sm" value={newCustomName} onChange={e => setNewCustomName(e.target.value)} placeholder="Ex: Polióis" />
                                                </div>
                                                <div className="w-20 space-y-1">
                                                    <Label className="text-xs">Qtd</Label>
                                                    <Input className="h-8 text-sm" type="number" step="any" value={newCustomValue} onChange={e => setNewCustomValue(e.target.value)} placeholder="0" />
                                                </div>
                                                <div className="w-16 space-y-1">
                                                    <Label className="text-xs">Unid</Label>
                                                    <Input className="h-8 text-sm" value={newCustomUnit} onChange={e => setNewCustomUnit(e.target.value)} placeholder="g" />
                                                </div>
                                                <Button type="button" onClick={addCustomNutrient} size="sm" className="h-8 px-2"><Plus className="h-4 w-4" /></Button>
                                            </div>
                                        </section>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="info" forceMount className="flex flex-col gap-4 pt-4 data-[state=inactive]:hidden">
                                <Alert><AlertDescription>Estes campos organizam as informações da ficha técnica e não alteram os cálculos nutricionais.</AlertDescription></Alert>
                                <FieldGroup className="gap-4">
                                    <Field>
                                        <FieldLabel htmlFor="ingredients-text">Lista de ingredientes</FieldLabel>
                                        <Textarea id="ingredients-text" name="ingredientsText" defaultValue={initialData?.ingredientsText || ""} placeholder="Ex: Farinha de trigo enriquecida com ferro e ácido fólico..." rows={3} />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="allergens-text">Declaração de alergênicos</FieldLabel>
                                        <Textarea id="allergens-text" name="allergensText" defaultValue={initialData?.allergensText || ""} placeholder="Ex: ALÉRGICOS: CONTÉM DERIVADOS DE TRIGO E SOJA." rows={2} />
                                    </Field>
                                </FieldGroup>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field>
                                        <FieldLabel htmlFor="contains-gluten">Contém glúten?</FieldLabel>
                                        <NativeSelect id="contains-gluten" name="containsGluten" defaultValue={initialData?.containsGluten === true ? "true" : initialData?.containsGluten === false ? "false" : ""} className="w-full">
                                            <NativeSelectOption value="">Não informado</NativeSelectOption>
                                            <NativeSelectOption value="true">Sim (contém glúten)</NativeSelectOption>
                                            <NativeSelectOption value="false">Não (não contém glúten)</NativeSelectOption>
                                        </NativeSelect>
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="gluten-text">Texto de glúten</FieldLabel>
                                        <Input id="gluten-text" name="glutenText" defaultValue={initialData?.glutenText || ""} placeholder="Ex: CONTÉM GLÚTEN" />
                                    </Field>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {!initialData && <p className="text-xs text-muted-foreground mt-4">Valores por 100g de alimento.</p>}
                        {initialData && <p className="text-xs text-stone-600 dark:text-stone-400 mt-4">Atenção: As alterações afetam todas as tabelas associadas.</p>}
                    </div>

                    <div className="flex flex-col gap-3 border-t border-border/70 bg-background px-6 py-4">
                        <Button type="submit" className="w-full" disabled={pending}>
                            {pending ? <Spinner data-icon="inline-start" /> : null}
                            {pending ? "Salvando..." : "Salvar ingrediente"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
