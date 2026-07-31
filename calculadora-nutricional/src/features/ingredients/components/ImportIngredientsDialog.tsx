'use client'

import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importIngredients, IngredientData } from '@/features/ingredients/actions/import-ingredient-actions';
import type ExcelJSModule from 'exceljs';
import { toast } from "sonner";
import { Loader2, Upload } from 'lucide-react';

const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMPORT_ROWS = 1000;

function normalizeCellValue(value: ExcelJSModule.CellValue): unknown {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return value.toISOString();
    if (typeof value !== "object") return value;

    if ("result" in value) {
        return normalizeCellValue(value.result as ExcelJSModule.CellValue);
    }

    if ("text" in value && typeof value.text === "string") {
        return value.text;
    }

    if ("richText" in value && Array.isArray(value.richText)) {
        return value.richText.map((item) => item.text).join("");
    }

    return String(value);
}

async function readRowsFromExcel(data: ArrayBuffer) {
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(data);

    const sheet = workbook.worksheets[0];
    if (!sheet) return [];

    const headers: string[] = [];
    sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headers[colNumber] = String(normalizeCellValue(cell.value)).trim();
    });

    const rows: Record<string, unknown>[] = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;
        if (rowNumber > MAX_IMPORT_ROWS + 1) {
            throw new Error(`O arquivo pode conter no máximo ${MAX_IMPORT_ROWS} ingredientes.`);
        }

        const item: Record<string, unknown> = {};
        headers.forEach((header, colNumber) => {
            if (!header) return;
            item[header] = normalizeCellValue(row.getCell(colNumber).value);
        });

        rows.push(item);
    });

    return rows;
}

export function ImportIngredientsDialog({ onImportSuccess }: { onImportSuccess?: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getCellValue = (row: Record<string, unknown>, ...keys: string[]) => {
        for (const key of keys) {
            const value = row[key];
            if (value !== undefined && value !== null && String(value).trim() !== "") {
                return value;
            }
        }
        return "";
    };

    const toNumber = (value: unknown) => Number(value || 0);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith(".xlsx")) {
            toast.error("Use um arquivo Excel .xlsx.");
            e.target.value = '';
            return;
        }
        if (file.size <= 0 || file.size > MAX_IMPORT_FILE_SIZE) {
            toast.error("O arquivo deve ter entre 1 byte e 10 MB.");
            e.target.value = '';
            return;
        }

        setLoading(true);

        try {
            const data = await file.arrayBuffer();
            const jsonData = await readRowsFromExcel(data);

            // Validate and map data
            const ingredients: IngredientData[] = jsonData.map((row) => ({
                name: String(getCellValue(row, 'Nome', 'name')),
                energy: toNumber(getCellValue(row, 'Energia', 'energy')),
                protein: toNumber(getCellValue(row, 'Proteína', 'protein')),
                carbs: toNumber(getCellValue(row, 'Carboidratos', 'carbs')),
                fatTotal: toNumber(getCellValue(row, 'Gorduras Totais', 'fatTotal')),
                fatSat: toNumber(getCellValue(row, 'Gorduras Saturadas', 'fatSat')),
                fatTrans: toNumber(getCellValue(row, 'Gorduras Trans', 'fatTrans')),
                sugarTotal: toNumber(getCellValue(row, 'Açúcares', 'Açúcares Totais', 'acucares', 'Sugar')),
                sugarAdded: toNumber(getCellValue(row, 'Açúcares Adicionados', 'acucares adicionados')),

                // Micronutrients
                fatMono: toNumber(getCellValue(row, 'Gorduras monoinsaturadas')),
                fatPoly: toNumber(getCellValue(row, 'Gorduras poli-insaturadas')),
                omega6: toNumber(getCellValue(row, 'Ômega 6')),
                omega3: toNumber(getCellValue(row, 'Ômega 3')),
                cholesterol: toNumber(getCellValue(row, 'Colesterol')),

                fiber: toNumber(getCellValue(row, 'Fibras alimentares', 'Fibra', 'fiber')),
                sodium: toNumber(getCellValue(row, 'Sódio', 'sodio', 'Sodium')),

                vitaminA: toNumber(getCellValue(row, 'Vitamina A')),
                vitaminD: toNumber(getCellValue(row, 'Vitamina D')),
                vitaminE: toNumber(getCellValue(row, 'Vitamina E')),
                vitaminK: toNumber(getCellValue(row, 'Vitamina K')),
                vitaminC: toNumber(getCellValue(row, 'Vitamina C')),
                thiamin: toNumber(getCellValue(row, 'Tiamina')),
                riboflavin: toNumber(getCellValue(row, 'Riboflavina')),
                niacin: toNumber(getCellValue(row, 'Niacina')),
                vitaminB6: toNumber(getCellValue(row, 'Vitamina B6')),
                biotin: toNumber(getCellValue(row, 'Biotina')),
                folicAcid: toNumber(getCellValue(row, 'Ácido fólico')),
                pantothenicAcid: toNumber(getCellValue(row, 'Ácido pantotênico')),
                vitaminB12: toNumber(getCellValue(row, 'Vitamina B12')),

                calcium: toNumber(getCellValue(row, 'Cálcio')),
                chloride: toNumber(getCellValue(row, 'Cloreto')),
                copper: toNumber(getCellValue(row, 'Cobre')),
                chromium: toNumber(getCellValue(row, 'Cromo')),
                iron: toNumber(getCellValue(row, 'Ferro')),
                fluoride: toNumber(getCellValue(row, 'Flúor')),
                phosphorus: toNumber(getCellValue(row, 'Fósforo')),
                iodine: toNumber(getCellValue(row, 'Iodo')),
                magnesium: toNumber(getCellValue(row, 'Magnésio')),
                manganese: toNumber(getCellValue(row, 'Manganês')),
                molybdenum: toNumber(getCellValue(row, 'Molibdênio')),
                potassium: toNumber(getCellValue(row, 'Potássio')),
                selenium: toNumber(getCellValue(row, 'Selênio')),
                zinc: toNumber(getCellValue(row, 'Zinco')),
                choline: toNumber(getCellValue(row, 'Colina')),
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
            toast.error(error instanceof Error ? error.message : "Erro ao processar o arquivo. Verifique o formato.");
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
                        Envie um arquivo Excel (.xlsx), com até 1.000 linhas, contendo colunas como Nome, Energia, Proteína e Carboidratos.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="ingredients-file">Selecione o arquivo</Label>
                        <Input
                            id="ingredients-file"
                            type="file"
                            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            onChange={handleFileUpload}
                            disabled={loading}
                            ref={fileInputRef}
                        />
                    </div>
                    {loading && (
                        <div className="flex items-center justify-center py-2" role="status" aria-live="polite">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="ml-2 text-sm text-muted-foreground">Processando...</span>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
