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
                sugarTotal: Number(row['Açúcares'] || row['Açúcares Totais'] || row['acucares'] || row['Sugar'] || 0),
                sugarAdded: Number(row['Açúcares Adicionados'] || row['acucares adicionados'] || 0),

                // Micronutrients
                fatMono: Number(row['Gorduras monoinsaturadas'] || 0),
                fatPoly: Number(row['Gorduras poli-insaturadas'] || 0),
                omega6: Number(row['Ômega 6'] || 0),
                omega3: Number(row['Ômega 3'] || 0),
                cholesterol: Number(row['Colesterol'] || 0),

                fiber: Number(row['Fibras alimentares'] || row['Fibra'] || row['fiber'] || 0),
                sodium: Number(row['Sódio'] || row['sodio'] || row['Sodium'] || 0),

                vitaminA: Number(row['Vitamina A'] || 0),
                vitaminD: Number(row['Vitamina D'] || 0),
                vitaminE: Number(row['Vitamina E'] || 0),
                vitaminK: Number(row['Vitamina K'] || 0),
                vitaminC: Number(row['Vitamina C'] || 0),
                thiamin: Number(row['Tiamina'] || 0),
                riboflavin: Number(row['Riboflavina'] || 0),
                niacin: Number(row['Niacina'] || 0),
                vitaminB6: Number(row['Vitamina B6'] || 0),
                biotin: Number(row['Biotina'] || 0),
                folicAcid: Number(row['Ácido fólico'] || 0),
                pantothenicAcid: Number(row['Ácido pantotênico'] || 0),
                vitaminB12: Number(row['Vitamina B12'] || 0),

                calcium: Number(row['Cálcio'] || 0),
                chloride: Number(row['Cloreto'] || 0),
                copper: Number(row['Cobre'] || 0),
                chromium: Number(row['Cromo'] || 0),
                iron: Number(row['Ferro'] || 0),
                fluoride: Number(row['Flúor'] || 0),
                phosphorus: Number(row['Fósforo'] || 0),
                iodine: Number(row['Iodo'] || 0),
                magnesium: Number(row['Magnésio'] || 0),
                manganese: Number(row['Manganês'] || 0),
                molybdenum: Number(row['Molibdênio'] || 0),
                potassium: Number(row['Potássio'] || 0),
                selenium: Number(row['Selênio'] || 0),
                zinc: Number(row['Zinco'] || 0),
                choline: Number(row['Colina'] || 0),
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
