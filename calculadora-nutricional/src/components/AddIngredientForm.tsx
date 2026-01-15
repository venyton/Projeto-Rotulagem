'use client'

import { useActionState } from "react";
import { createCustomIngredient, updateCustomIngredient } from "@/app/actions/ingredient";
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
    };
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function AddIngredientForm({ initialData, trigger, open: controlledOpen, onOpenChange }: IngredientFormProps) {
    const updateAction = initialData?.id ? updateCustomIngredient.bind(null, initialData.id) : createCustomIngredient;
    const [state, formAction] = useActionState(updateAction, initialState);
    const [internalOpen, setInternalOpen] = useState(false);

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
            <DialogTrigger asChild>
                {trigger || <Button><Plus className="mr-2 h-4 w-4" /> Novo Ingrediente</Button>}
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Editar Ingrediente" : "Adicionar Ingrediente"}</DialogTitle>
                </DialogHeader>
                <form action={formAction} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input name="name" defaultValue={initialData?.name} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Energia (kcal)</Label><Input name="energy" type="number" step="0.1" defaultValue={initialData?.energy} /></div>
                        <div className="space-y-2"><Label>Carboidratos (g)</Label><Input name="carbs" type="number" step="0.1" defaultValue={initialData?.carbs} /></div>
                        <div className="space-y-2"><Label>Proteínas (g)</Label><Input name="protein" type="number" step="0.1" defaultValue={initialData?.protein} /></div>
                        <div className="space-y-2"><Label>Gord. Totais (g)</Label><Input name="fatTotal" type="number" step="0.1" defaultValue={initialData?.fatTotal} /></div>
                        <div className="space-y-2"><Label>Gord. Sat. (g)</Label><Input name="fatSat" type="number" step="0.1" defaultValue={initialData?.fatSat} /></div>
                        <div className="space-y-2"><Label>Gord. Trans (g)</Label><Input name="fatTrans" type="number" step="0.1" defaultValue={initialData?.fatTrans} /></div>
                        <div className="space-y-2"><Label>Fibra (g)</Label><Input name="fiber" type="number" step="0.1" defaultValue={initialData?.fiber} /></div>
                        <div className="space-y-2"><Label>Sódio (mg)</Label><Input name="sodium" type="number" step="1" defaultValue={initialData?.sodium} /></div>
                        <div className="space-y-2"><Label>Açúcares Tot. (g)</Label><Input name="sugarTotal" type="number" step="0.1" defaultValue={initialData?.sugarTotal} /></div>
                    </div>
                    {!initialData && <p className="text-xs text-muted-foreground">Valores por 100g de alimento.</p>}
                    {initialData && <p className="text-xs text-yellow-600">Atenção: As alterações afetam todas as tabelas que usam este ingrediente.</p>}

                    <div className="bg-yellow-50 p-3 rounded-md text-xs text-yellow-800 border border-yellow-200">
                        <strong>Aviso:</strong> Os dados nutricionais informados são de sua inteira responsabilidade. Verifique sempre as informações nas embalagens ou fontes confiáveis.
                    </div>

                    <Button type="submit" className="w-full">Salvar</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
