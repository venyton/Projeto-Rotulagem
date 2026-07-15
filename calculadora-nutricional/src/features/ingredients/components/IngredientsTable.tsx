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
import { Search } from "lucide-react"
import { Download, Edit2, Trash2 } from "lucide-react"
import { ImportIngredientsDialog } from "./ImportIngredientsDialog"
import ExcelJS from "exceljs";
import { InspectIngredientDialog } from "./InspectIngredientDialog";
import { AddIngredientForm } from "./AddIngredientForm";
import { deleteCustomIngredient } from "@/features/ingredients/actions/custom-ingredient-actions";
import { useState } from "react";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";

export type IngredientTableRow = {
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

export function IngredientsTable({ ingredients }: { ingredients: IngredientTableRow[] }) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<IngredientTableRow | null>(null);
    const [deleting, setDeleting] = useState(false);

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

    const handleDelete = async () => {
        if (deleteTarget) {
            setDeleting(true);
            const res = await deleteCustomIngredient(deleteTarget.id);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Ingrediente excluído.");
                setDeleteTarget(null);
            }
            setDeleting(false);
        }
    };

    return (
        <Card>
            <CardHeader className="border-b">
                <CardTitle>Ingredientes cadastrados</CardTitle>
                <CardDescription>Busque, revise, importe ou exporte sua base de ingredientes.</CardDescription>
                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center">
                    <InputGroup className="w-full sm:max-w-xs">
                        <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
                        <InputGroupInput
                            type="search"
                            placeholder="Buscar ingrediente..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </InputGroup>
                    <ImportIngredientsDialog />
                    <Button onClick={handleExport} variant="outline">
                        <Download data-icon="inline-start" />
                        Exportar
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="overflow-x-auto px-0">
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
                                                <Edit2 aria-hidden="true" />
                                                <span className="sr-only">Editar {ingredient.name}</span>
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                onClick={() => setDeleteTarget(ingredient)}
                                            >
                                                <Trash2 aria-hidden="true" />
                                                <span className="sr-only">Excluir {ingredient.name}</span>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>

            {/* Edit Dialog */}
            {editingId && (
                <AddIngredientForm
                    key={editingId}
                    initialData={ingredients.find(i => i.id === editingId)}
                    open={true}
                    onOpenChange={(open) => !open && setEditingId(null)}
                />
            )}

            <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir ingrediente?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação remove “{deleteTarget?.name}” da sua biblioteca e não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? <Spinner data-icon="inline-start" /> : <Trash2 data-icon="inline-start" />}
                            {deleting ? "Excluindo..." : "Excluir ingrediente"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}
