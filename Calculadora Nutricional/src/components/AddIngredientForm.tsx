'use client'

import { useActionState } from "react";
import { createCustomIngredient } from "@/app/actions/ingredient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

// Initial state for useActionState
const initialState: { error?: string; success?: boolean } = {};

export function AddIngredientForm() {
    const [state, formAction] = useActionState(createCustomIngredient, initialState);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (state?.error) {
            toast.error(state.error);
        }
        if (state?.success) {
            toast.success("Ingrediente criado com sucesso!");
            setOpen(false);
        }
    }, [state]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Novo Ingrediente</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Adicionar Ingrediente Personalizado</DialogTitle>
                </DialogHeader>
                <form action={formAction} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label>Nome (ex: Minha Farinha Mix)</Label>
                        <Input name="name" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Energia (kcal)</Label><Input name="energy" type="number" step="0.1" /></div>
                        <div className="space-y-2"><Label>Carboidratos (g)</Label><Input name="carbs" type="number" step="0.1" /></div>
                        <div className="space-y-2"><Label>Proteínas (g)</Label><Input name="protein" type="number" step="0.1" /></div>
                        <div className="space-y-2"><Label>Gord. Totais (g)</Label><Input name="fatTotal" type="number" step="0.1" /></div>
                        <div className="space-y-2"><Label>Gord. Sat. (g)</Label><Input name="fatSat" type="number" step="0.1" /></div>
                        <div className="space-y-2"><Label>Gord. Trans (g)</Label><Input name="fatTrans" type="number" step="0.1" /></div>
                        <div className="space-y-2"><Label>Fibra (g)</Label><Input name="fiber" type="number" step="0.1" /></div>
                        <div className="space-y-2"><Label>Sódio (mg)</Label><Input name="sodium" type="number" step="1" /></div>
                        <div className="space-y-2"><Label>Açúcares Tot. (g)</Label><Input name="sugarTotal" type="number" step="0.1" /></div>
                    </div>
                    <p className="text-xs text-muted-foreground">Valores por 100g de alimento.</p>
                    <Button type="submit" className="w-full">Salvar</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
