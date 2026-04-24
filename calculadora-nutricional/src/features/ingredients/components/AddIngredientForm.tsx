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
        [key: string]: any; // Allow dynamic access for micronutrients
    };
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const MICRONUTRIENTS = [
    { name: "fatMono", label: "Gord. Mono (g)" },
    { name: "fatPoly", label: "Gord. Poli (g)" },
    { name: "omega6", label: "Ômega 6 (g)" },
    { name: "omega3", label: "Ômega 3 (g)" },
    { name: "cholesterol", label: "Colesterol (mg)" },
    { name: "calcium", label: "Cálcio (mg)" },
    { name: "magnesium", label: "Magnésio (mg)" },
    { name: "manganese", label: "Manganês (mg)" },
    { name: "phosphorus", label: "Fósforo (mg)" },
    { name: "iron", label: "Ferro (mg)" },
    { name: "sodium", label: "Sódio (mg)" }, // Already in main list? Remove if duplicate. Main form has sodium.
    { name: "potassium", label: "Potássio (mg)" },
    { name: "copper", label: "Cobre (mcg)" },
    { name: "zinc", label: "Zinco (mg)" },
    { name: "selenium", label: "Selênio (mcg)" },
    { name: "chromium", label: "Cromo (mcg)" },
    { name: "molybdenum", label: "Molibdênio (mcg)" },
    { name: "iodine", label: "Iodo (mcg)" },
    { name: "fluoride", label: "Flúor (mg)" },
    { name: "vitaminA", label: "Vit. A (mcg)" },
    { name: "vitaminD", label: "Vit. D (mcg)" },
    { name: "vitaminE", label: "Vit. E (mg)" },
    { name: "vitaminK", label: "Vit. K (mcg)" },
    { name: "vitaminC", label: "Vit. C (mg)" },
    { name: "thiamin", label: "Tiamina B1 (mg)" },
    { name: "riboflavin", label: "Riboflavina B2 (mg)" },
    { name: "niacin", label: "Niacina B3 (mg)" },
    { name: "vitaminB6", label: "Vit. B6 (mg)" },
    { name: "biotin", label: "Biotina (mcg)" },
    { name: "folicAcid", label: "Ác. Fólico (mcg)" },
    { name: "pantothenicAcid", label: "Ác. Pantot. B5 (mg)" },
    { name: "vitaminB12", label: "Vit. B12 (mcg)" },
    { name: "choline", label: "Colina (mg)" },
].filter(m => m.name !== 'sodium'); // Sodium is in main section

export function AddIngredientForm({ initialData, trigger, open: controlledOpen, onOpenChange }: IngredientFormProps) {
    const updateAction = initialData?.id ? updateCustomIngredient.bind(null, initialData.id) : createCustomIngredient;
    const [state, formAction] = useActionState(updateAction, initialState);
    const [internalOpen, setInternalOpen] = useState(false);
    const [showMicros, setShowMicros] = useState(false);

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? onOpenChange! : setInternalOpen;

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (state?.error) {
            toast.error(state.error);
        }
        if (state?.success) {
            toast.success(initialData ? "Ingrediente atualizado!" : "Ingrediente criado com sucesso!");
            setOpen(false);
        }
    }, [state]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {(trigger || !isControlled) && (
                <DialogTrigger asChild>
                    {trigger || <Button><Plus className="mr-2 h-4 w-4" /> Novo Ingrediente</Button>}
                </DialogTrigger>
            )}
            <DialogContent className="max-h-[90vh] overflow-y-auto max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Editar Ingrediente" : "Adicionar Ingrediente"}</DialogTitle>
                </DialogHeader>
                <form action={formAction} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input name="name" defaultValue={initialData?.name} required />
                    </div>

                    <h3 className="font-semibold border-b pb-2 mt-4 text-sm text-gray-700">Macronutrientes (por 100g)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="space-y-2"><Label>Energia (kcal)</Label><Input name="energy" type="number" step="0.1" defaultValue={initialData?.energy} /></div>
                        <div className="space-y-2"><Label>Carboidratos (g)</Label><Input name="carbs" type="number" step="0.1" defaultValue={initialData?.carbs} /></div>
                        <div className="space-y-2"><Label>Açúcares Tot. (g)</Label><Input name="sugarTotal" type="number" step="0.1" defaultValue={initialData?.sugarTotal} /></div>
                        <div className="space-y-2"><Label>Açúcares Add. (g)</Label><Input name="sugarAdded" type="number" step="0.1" defaultValue={initialData?.sugarAdded} /></div>
                        <div className="space-y-2"><Label>Proteínas (g)</Label><Input name="protein" type="number" step="0.1" defaultValue={initialData?.protein} /></div>
                        <div className="space-y-2"><Label>Fibra (g)</Label><Input name="fiber" type="number" step="0.1" defaultValue={initialData?.fiber} /></div>
                        <div className="space-y-2"><Label>Sódio (mg)</Label><Input name="sodium" type="number" step="1" defaultValue={initialData?.sodium} /></div>
                    </div>

                    <h3 className="font-semibold border-b pb-2 mt-4 text-sm text-gray-700">Gorduras (por 100g)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>Gord. Totais (g)</Label><Input name="fatTotal" type="number" step="0.1" defaultValue={initialData?.fatTotal} /></div>
                        <div className="space-y-2"><Label>Gord. Sat. (g)</Label><Input name="fatSat" type="number" step="0.1" defaultValue={initialData?.fatSat} /></div>
                        <div className="space-y-2"><Label>Gord. Trans (g)</Label><Input name="fatTrans" type="number" step="0.1" defaultValue={initialData?.fatTrans} /></div>
                    </div>

                    <div className="pt-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowMicros(!showMicros)} className="w-full">
                            {showMicros ? "Ocultar Micronutrientes" : "Mostrar Micronutrientes e Outros"}
                        </Button>
                    </div>

                    {showMicros && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border">
                            {MICRONUTRIENTS.map((m) => (
                                <div key={m.name} className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">{m.label}</Label>
                                    <Input
                                        name={m.name}
                                        type="number"
                                        step="0.001"
                                        defaultValue={initialData?.[m.name] || ''}
                                        className="h-8 text-sm"
                                        placeholder="0"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {!initialData && <p className="text-xs text-muted-foreground">Valores por 100g de alimento.</p>}
                    {initialData && <p className="text-xs text-yellow-600">Atenção: As alterações afetam todas as tabelas.</p>}

                    <div className="bg-yellow-50 p-3 rounded-md text-xs text-yellow-800 border border-yellow-200">
                        <strong>Aviso:</strong> Verifique sempre as informações nas embalagens ou fontes confiáveis.
                    </div>

                    <Button type="submit" className="w-full">Salvar</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
