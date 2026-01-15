'use client'

import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importIngredients, IngredientData } from '@/app/actions/ingredients';
import * as XLSX from 'xlsx';
import { toast } from "sonner";
import { Loader2, Upload } from 'lucide-react';

export function ImportIngredientsDialog({ onImportSuccess }: { onImportSuccess?: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

            // Validate and map data
            const ingredients: IngredientData[] = jsonData.map((row) => ({
                name: row['Nome'] || row['name'] || '',
                energy: Number(row['Energia'] || row['energy'] || 0),
                protein: Number(row['Proteína'] || row['protein'] || 0),
                carbs: Number(row['Carboidratos'] || row['carbs'] || 0),
                fatTotal: Number(row['Gorduras Totais'] || row['fatTotal'] || 0),
                fatSat: Number(row['Gorduras Saturadas'] || row['fatSat'] || 0),
                fatTrans: Number(row['Gorduras Trans'] || row['fatTrans'] || 0),
                fiber: Number(row['Fibra'] || row['fiber'] || 0),
                sodium: Number(row['Sódio'] || row['sodium'] || 0),
                sugarTotal: Number(row['Açúcares'] || row['sugarTotal'] || 0),
            })).filter(i => i.name.length > 0);

            if (ingredients.length === 0) {
                toast.error("Nenhum ingrediente válido encontrado no arquivo.");
                setLoading(false);
                return;
            }

            const result = await importIngredients(ingredients);

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(`${result.count} ingredientes importados com sucesso!`);
                setOpen(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
                onImportSuccess?.();
            }

        } catch (error) {
            console.error(error);
            toast.error("Erro ao processar o arquivo. Verifique o formato.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Excel
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Importar Ingredientes</DialogTitle>
                    <DialogDescription>
                        Envie um arquivo Excel (.xlsx) com as colunas: Nome, Energia, Proteína, Carboidratos, etc.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="file">Selecione o arquivo</Label>
                        <Input
                            id="file"
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileUpload}
                            disabled={loading}
                            ref={fileInputRef}
                        />
                    </div>
                    {loading && (
                        <div className="flex items-center justify-center py-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="ml-2 text-sm text-gray-500">Processando...</span>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
