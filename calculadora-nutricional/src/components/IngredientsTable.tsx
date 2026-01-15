'use client'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Download, FileDown } from "lucide-react"
import { ImportIngredientsDialog } from "./ImportIngredientsDialog"
import * as XLSX from 'xlsx';

type Ingredient = {
    id: string;
    name: string;
    energy: number;
    protein: number;
    carbs: number;
    fatTotal: number;
    fatSat: number;
    fatTrans: number;
    fiber: number;
    sodium: number;
    sugarTotal: number;
    createdAt: Date;
}

export function IngredientsTable({ ingredients }: { ingredients: Ingredient[] }) {

    const handleExport = () => {
        const data = ingredients.map(ing => ({
            'Nome': ing.name,
            'Energia': ing.energy,
            'Proteína': ing.protein,
            'Carboidratos': ing.carbs,
            'Gorduras Totais': ing.fatTotal,
            'Gorduras Saturadas': ing.fatSat,
            'Gorduras Trans': ing.fatTrans,
            'Fibra': ing.fiber,
            'Sódio': ing.sodium,
            'Açúcares': ing.sugarTotal,
            // 'Data de Criação': new Date(ing.createdAt).toLocaleDateString()
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Meus Ingredientes");
        XLSX.writeFile(wb, "meus-ingredientes.xlsx");
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Tabela de Ingredientes</h2>
                <div className="flex gap-2">
                    <ImportIngredientsDialog />
                    <Button onClick={handleExport} variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                    </Button>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px]">Nome</TableHead>
                            <TableHead>Energia (kcal)</TableHead>
                            <TableHead>Carboidratos (g)</TableHead>
                            <TableHead>Proteínas (g)</TableHead>
                            <TableHead>Gord. Totais (g)</TableHead>
                            <TableHead>Sódio (mg)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ingredients.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    Nenhum ingrediente cadastrado. Importe ou adicione o primeiro!
                                </TableCell>
                            </TableRow>
                        ) : (
                            ingredients.map((ingredient) => (
                                <TableRow key={ingredient.id}>
                                    <TableCell className="font-medium">{ingredient.name}</TableCell>
                                    <TableCell>{ingredient.energy}</TableCell>
                                    <TableCell>{ingredient.carbs}</TableCell>
                                    <TableCell>{ingredient.protein}</TableCell>
                                    <TableCell>{ingredient.fatTotal}</TableCell>
                                    <TableCell>{ingredient.sodium}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
