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
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Download, Edit2, Trash2 } from "lucide-react"
import { ImportIngredientsDialog } from "./ImportIngredientsDialog"
import ExcelJS from "exceljs";
import { InspectIngredientDialog } from "./InspectIngredientDialog";
import { AddIngredientForm } from "./AddIngredientForm";
import { deleteCustomIngredient } from "@/features/ingredients/actions/custom-ingredient-actions";
import { useState } from "react";
import { toast } from "sonner";

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
    sugarAdded: number;
    createdAt: string;
    userId: string;
}

export function IngredientsTable({ ingredients }: { ingredients: Ingredient[] }) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const handleExport = async () => {
        const data = ingredients.map(ing => ({
            'Nome': ing.name.replace(/^\[Meu\]\s*/, ''),
            'Energia': ing.energy,
            'Proteína': ing.protein,
            'Carboidratos': ing.carbs,
            'Gorduras Totais': ing.fatTotal,
            'Gorduras Saturadas': ing.fatSat,
            'Gorduras Trans': ing.fatTrans,
            'Fibra': ing.fiber,
            'Sódio': ing.sodium,
            'Açúcares Totais': ing.sugarTotal,
            'Açúcares Adicionados': ing.sugarAdded,
        }));

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Meus Ingredientes");
            const headers = Object.keys(data[0] ?? {
                'Nome': '',
                'Energia': '',
                'Proteína': '',
                'Carboidratos': '',
                'Gorduras Totais': '',
                'Gorduras Saturadas': '',
                'Gorduras Trans': '',
                'Fibra': '',
                'Sódio': '',
                'Açúcares Totais': '',
                'Açúcares Adicionados': '',
            });

            worksheet.columns = headers.map((header) => ({
                header,
                key: header,
                width: Math.max(14, header.length + 2),
            }));
            worksheet.addRows(data);

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "meus-ingredientes.xlsx";
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error("Erro ao exportar ingredientes.");
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Tem certeza que deseja excluir "${name}"?`)) {
            const res = await deleteCustomIngredient(id);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Ingrediente excluído.");
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
                <h2 className="text-lg font-semibold tracking-tight">Tabela de Ingredientes</h2>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar ingrediente..."
                            className="w-full sm:w-[250px] pl-8 bg-background shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <ImportIngredientsDialog />
                    <Button onClick={handleExport} variant="outline" className="shadow-sm">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                    </Button>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[300px] h-12 font-semibold">Nome</TableHead>
                            <TableHead className="h-12 font-semibold">Energia (kcal)</TableHead>
                            <TableHead className="h-12 font-semibold">Carboidratos (g)</TableHead>
                            <TableHead className="h-12 font-semibold">Proteínas (g)</TableHead>
                            <TableHead className="h-12 font-semibold">Gord. Totais (g)</TableHead>
                            <TableHead className="h-12 font-semibold">Sódio (mg)</TableHead>
                            <TableHead className="w-[100px] h-12 font-semibold">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ingredients.filter(ing => ing.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24">
                                    Nenhum ingrediente cadastrado. Importe ou adicione o primeiro!
                                </TableCell>
                            </TableRow>
                        ) : (
                            ingredients.filter(ing => ing.name.toLowerCase().includes(searchQuery.toLowerCase())).map((ingredient) => (
                                <TableRow key={ingredient.id} className="transition-colors hover:bg-muted/30">
                                    <TableCell className="font-medium">{ingredient.name}</TableCell>
                                    <TableCell>{ingredient.energy}</TableCell>
                                    <TableCell>{ingredient.carbs}</TableCell>
                                    <TableCell>{ingredient.protein}</TableCell>
                                    <TableCell>{ingredient.fatTotal}</TableCell>
                                    <TableCell>{ingredient.sodium}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <InspectIngredientDialog ingredient={ingredient} />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setEditingId(ingredient.id)}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
                                                onClick={() => handleDelete(ingredient.id, ingredient.name)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Edit Dialog */}
            {editingId && (
                <AddIngredientForm
                    key={editingId}
                    initialData={ingredients.find(i => i.id === editingId)}
                    open={true}
                    onOpenChange={(open) => !open && setEditingId(null)}
                />
            )}
        </div>
    )
}
