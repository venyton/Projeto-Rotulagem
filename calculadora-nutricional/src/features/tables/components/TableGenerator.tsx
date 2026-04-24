'use client'

import React, { useState, useEffect } from "react";
import { IngredientSelector } from "@/features/ingredients/components/IngredientSelector";
import { SelectedIngredient, calculateRecipe, CalculatedNutrients } from "@/features/tables/domain/nutrients";
import { NutritionalLabel } from "@/features/tables/components/NutritionalLabel";
import { MagnifyingGlassLabel } from "@/features/tables/components/MagnifyingGlassLabel";
import { POPULATION_GROUPS, PopGroup, POPULATION_LABELS } from "@/features/tables/domain/constants";
import { checkFOP } from "@/features/tables/domain/anvisa";
import { Ingredient } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Download, Save } from "lucide-react";
import { saveTable } from "@/features/tables/actions/table-actions";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { MICRONUTRIENTS } from "@/features/tables/domain/micronutrients";
import { FOOD_GROUPS } from "@/features/tables/domain/food-groups";

interface TableGeneratorProps {
    initialData?: {
        id: string;
        title: string;
        portionSize: number;
        householdMeasure: string;
        popGroup: string;
        ingredients: SelectedIngredient[];
    };
}

export function TableGenerator({ initialData }: TableGeneratorProps) {
    const [title, setTitle] = useState(initialData?.title || "");
    const [ingredients, setIngredients] = useState<SelectedIngredient[]>(initialData?.ingredients || []);
    const [portionSize, setPortionSize] = useState<number>(initialData?.portionSize || 0);
    const [householdMeasure, setHouseholdMeasure] = useState(initialData?.householdMeasure || "");
    const [popGroup, setPopGroup] = useState<PopGroup>((initialData?.popGroup as PopGroup) || POPULATION_GROUPS.ADULTS);
    const [isSupplement, setIsSupplement] = useState(false);
    const [selectedNutrients, setSelectedNutrients] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    // New state for selectors
    const [selectedGroup, setSelectedGroup] = useState<string>("");
    const [selectedProduct, setSelectedProduct] = useState<string>("");

    const [result, setResult] = useState<{
        per100g: CalculatedNutrients;
        perPortion: CalculatedNutrients;
    } | null>(null);

    const fopStatus = result ? checkFOP(result.per100g) : null;

    const handleGroupChange = (group: string) => {
        setSelectedGroup(group);
        setSelectedProduct(""); // Reset product when group changes
    };

    const handleProductChange = (prodName: string) => {
        setSelectedProduct(prodName);
        const group = FOOD_GROUPS.find(g => g.group === selectedGroup);
        const product = group?.products.find(p => p.name === prodName);

        if (product) {
            setTitle(product.name);
            setPortionSize(product.portion);
            setHouseholdMeasure(product.measure);
        }
    };

    const toggleNutrient = (name: string) => {
        setSelectedNutrients(prev =>
            prev.includes(name)
                ? prev.filter(n => n !== name)
                : [...prev, name]
        );
    };

    const handleAddIngredient = (ing: Ingredient) => {
        setIngredients(prev => [...prev, { ingredient: ing, quantity: 0, isAddedSugar: false }]);
    };

    const updateIngredient = <K extends keyof SelectedIngredient>(
        index: number,
        field: K,
        value: SelectedIngredient[K]
    ) => {
        setIngredients(prev => {
            const newIngredients = [...prev];
            newIngredients[index] = { ...newIngredients[index], [field]: value };
            return newIngredients;
        });
    };

    const removeIngredient = (index: number) => {
        setIngredients(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        const res = calculateRecipe(ingredients, portionSize);
        setResult(res);
    }, [ingredients, portionSize]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveTable({
                id: initialData?.id,
                title,
                portion: portionSize,
                uom: "g",
                householdMeasure,
                popGroup,
                ingredients
            });
            toast.success("Tabela salva com sucesso!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar tabela.");
        } finally {
            setSaving(false);
        }
    };

    const handleExportPNG = async () => {
        const element = document.getElementById('nutrition-label-container');
        if (!element) return;
        const canvas = await html2canvas(element);
        const data = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = data;
        link.download = 'tabela-nutricional.png';
        link.click();
    };

    const handleExportExcel = () => {
        const data = ingredients.map(item => ({
            Ingredient: item.ingredient.name,
            Quantity: item.quantity,
            IsAddedSugar: item.isAddedSugar ? "Yes" : "No"
        }));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Recipe");
        XLSX.writeFile(wb, "recipe.xlsx");
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Configurações da Receita</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">

                        {/* Group and Product Selectors */}
                        {/* Group and Product Selectors */}
                        <div className="grid grid-cols-1 gap-4 border-b pb-4 mb-4">
                            <div className="space-y-2">
                                <Label>Grupo de Alimentos (Opcional)</Label>
                                <Select value={selectedGroup} onValueChange={handleGroupChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um grupo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FOOD_GROUPS.map((g, i) => (
                                            <SelectItem key={i} value={g.group}>{g.group}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Produto (Sugestão)</Label>
                                <Select value={selectedProduct} onValueChange={handleProductChange} disabled={!selectedGroup}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um produto" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FOOD_GROUPS.find(g => g.group === selectedGroup)?.products.map((p, i) => (
                                            <SelectItem key={i} value={p.name}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-full text-xs text-muted-foreground">
                                *Selecione para preencher automaticamente nome, porção e medida.
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Nome do Produto / Título</Label>
                            <Input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="ex: Bolo de Cenoura"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Porção (g)</Label>
                                <Input
                                    type="number"
                                    value={portionSize || ''}
                                    onChange={e => setPortionSize(parseFloat(e.target.value) || 0)}
                                    placeholder="ex: 20"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Medida Caseira</Label>
                                <Input
                                    value={householdMeasure}
                                    onChange={e => setHouseholdMeasure(e.target.value)}
                                    placeholder="ex: 2 colheres"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Grupo Populacional</Label>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="is-supplement"
                                        checked={isSupplement}
                                        onCheckedChange={(c) => setIsSupplement(!!c)}
                                    />
                                    <label
                                        htmlFor="is-supplement"
                                        className="text-sm font-medium leading-none cursor-pointer"
                                    >
                                        Suplemento Alimentar
                                    </label>
                                </div>
                            </div>
                            <Select value={popGroup} onValueChange={(v) => setPopGroup(v as PopGroup)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(POPULATION_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    {/* ... Ingredients Card Content ... */}
                    <CardHeader>
                        <CardTitle>Ingredientes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <IngredientSelector onSelect={handleAddIngredient} />

                        <div className="space-y-2">
                            {ingredients.map((item, idx) => (
                                <div key={idx} className="flex items-end gap-3 p-3 border rounded-md bg-card">
                                    <div className="flex-1 space-y-1">
                                        <div className="font-medium text-sm">{item.ingredient.name}</div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24">
                                                <Input
                                                    type="number"
                                                    placeholder="Qtd (g)"
                                                    value={item.quantity || ''}
                                                    onChange={e => updateIngredient(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                    className="h-8"
                                                />
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`added-sugar-${idx}`}
                                                    checked={item.isAddedSugar}
                                                    onCheckedChange={(c) => updateIngredient(idx, 'isAddedSugar', !!c)}
                                                />
                                                <label
                                                    htmlFor={`added-sugar-${idx}`}
                                                    className="text-xs font-medium leading-none cursor-pointer"
                                                >
                                                    É açúcar adicionado
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => removeIngredient(idx)} className="text-red-500 hover:text-red-700">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {ingredients.length === 0 && (
                                <div className="text-center text-sm text-muted-foreground py-4 border-2 border-dashed rounded-md">
                                    Adicione ingredientes para começar.
                                </div>
                            )}
                        </div>
                        {ingredients.length > 0 && (
                            <div className="mt-4 pt-4 border-t flex justify-between items-center bg-muted/50 p-4 rounded-md">
                                <span className="font-semibold text-sm">Peso Total dos Ingredientes:</span>
                                <span className="font-bold text-lg text-primary">{ingredients.reduce((acc, item) => acc + (item.quantity || 0), 0).toFixed(1)} g</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Micronutrientes Opcionais</CardTitle>
                    </CardHeader>
                    <CardContent className="h-60 overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {MICRONUTRIENTS.map(m => (
                                <div key={m.name} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`micro-${m.name}`}
                                        checked={selectedNutrients.includes(m.name)}
                                        onCheckedChange={() => toggleNutrient(m.name)}
                                    />
                                    <label
                                        htmlFor={`micro-${m.name}`}
                                        className="text-sm font-medium leading-none cursor-pointer text-muted-foreground"
                                    >
                                        {m.label} <span className="text-xs text-black opacity-50">({m.unit})</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card className="sticky top-6">
                    <CardHeader>
                        <CardTitle>Pré-visualização</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center bg-gray-50 py-8 min-h-[400px] gap-8">
                        {result ? (
                            <>
                                <NutritionalLabel
                                    per100g={result.per100g}
                                    perPortion={result.perPortion}
                                    portionSize={portionSize}
                                    householdMeasure={householdMeasure || "..."}
                                    popGroup={popGroup}
                                    selectedNutrients={selectedNutrients}
                                    fop={fopStatus || undefined}
                                />
                                <div className="flex flex-col items-center gap-3 w-full">
                                    <div className="text-sm font-semibold text-gray-500 w-full text-center border-t pt-4">
                                        Selos Frontais (prévia)
                                    </div>
                                    {(fopStatus?.highSugar || fopStatus?.highFat || fopStatus?.highSodium) ? (
                                        <div
                                            id="wrapper-lupa-horizontal"
                                            className="border-[4px] rounded-[10px] p-[2px] inline-block leading-none"
                                            style={{ borderColor: '#000000', backgroundColor: '#ffffff' }}
                                        >
                                            <MagnifyingGlassLabel
                                                highSugar={!!fopStatus?.highSugar}
                                                highFat={!!fopStatus?.highFat}
                                                highSodium={!!fopStatus?.highSodium}
                                                layout="horizontal"
                                                id="lupa-horizontal"
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-xs text-muted-foreground">
                                            Sem selos ativos para os valores atuais.
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-muted-foreground text-center max-w-xs">
                                Preencha os dados e adicione ingredientes para visualizar a tabela ANVISA.
                            </div>
                        )}
                    </CardContent>

                    {result && (
                        <div className="p-6 border-t space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Button variant="outline" onClick={handleExportPNG} className="w-full">
                                    <Download className="mr-2 h-4 w-4" /> Exportar Tabela
                                </Button>
                                <Button variant="outline" onClick={handleExportExcel} className="w-full">
                                    <Download className="mr-2 h-4 w-4" /> Exportar Excel
                                </Button>
                                <Button onClick={handleSave} disabled={saving} className="w-full">
                                    {saving ? "Salvando..." : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" /> Salvar Projeto
                                        </>
                                    )}
                                </Button>
                            </div>

                            <div className="border p-4 rounded bg-yellow-50 text-yellow-900 text-sm">
                                <div className="font-semibold mb-2">Alertas Frontais (FOP) - Modelo Lupa</div>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li className={result.per100g.sugarAdded >= 15 ? "text-red-600 font-bold" : "text-green-700"}>
                                        Açúcar Adicionado: {result.per100g.sugarAdded.toFixed(1)}g (Alto se ≥ 15g)
                                    </li>
                                    <li className={result.per100g.fatSat >= 6 ? "text-red-600 font-bold" : "text-green-700"}>
                                        Gordura Saturada: {result.per100g.fatSat.toFixed(1)}g (Alto se ≥ 6g)
                                    </li>
                                    <li className={result.per100g.sodium >= 600 ? "text-red-600 font-bold" : "text-green-700"}>
                                        Sódio: {result.per100g.sodium.toFixed(0)}mg (Alto se ≥ 600mg)
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
