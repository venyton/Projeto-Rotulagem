'use client'

import React, { useState, useEffect } from "react";
import { IngredientSelector } from "./IngredientSelector";
import { SelectedIngredient, calculateRecipe, CalculatedNutrients } from "@/lib/nutrients";
import { NutritionalLabel } from "./NutritionalLabel";
import { MagnifyingGlassLabel } from "./MagnifyingGlassLabel";
import { POPULATION_GROUPS, PopGroup, POPULATION_LABELS } from "@/lib/constants";
import { checkFOP } from "@/lib/anvisa";
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
import { saveTable } from "@/app/actions/table";
import { toast } from "sonner";
import html2canvas from "html2canvas";

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
    const [saving, setSaving] = useState(false);

    const [result, setResult] = useState<{
        per100g: CalculatedNutrients;
        perPortion: CalculatedNutrients;
    } | null>(null);

    const handleAddIngredient = (ing: Ingredient) => {
        setIngredients(prev => [...prev, { ingredient: ing, quantity: 0, isAddedSugar: false }]);
    };

    const updateIngredient = (index: number, field: keyof SelectedIngredient, val: any) => {
        setIngredients(prev => {
            const draft = [...prev];
            draft[index] = { ...draft[index], [field]: val };
            return draft;
        });
    };

    const removeIngredient = (index: number) => {
        setIngredients(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        if (ingredients.length > 0 && portionSize > 0) {
            const calc = calculateRecipe(ingredients, portionSize);
            setResult(calc);
        } else {
            setResult(null);
        }
    }, [ingredients, portionSize]);

    const handleSave = async () => {
        if (!title) {
            toast.error("Defina um título para a tabela.");
            return;
        }
        if (!result) {
            toast.error("A tabela ainda não foi gerada (adicione ingredientes e porção).");
            return;
        }

        setSaving(true);
        const res = await saveTable({
            id: initialData?.id,
            title,
            portion: portionSize,
            uom: "g",
            householdMeasure,
            popGroup,
            ingredients
        });
        setSaving(false);

        if (res.error) {
            console.error("Erro no saveTable:", res.error);
            toast.error(`Erro ao salvar: ${res.error}`);
        } else {
            toast.success("Tabela salva com sucesso!");
        }
    };

    const handleExportPNG = async () => {
        const element = document.getElementById("nutrition-label-container");
        if (!element) {
            toast.error("Elemento da tabela não encontrado para exportação.");
            return;
        }

        try {
            // Using a lower scale if it was crashing, or ensure fonts are ready
            const canvas = await html2canvas(element, {
                scale: 3,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff"
            } as any);

            const dataUrl = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = `tabela-${title.replace(/\s+/g, '-') || 'anvisa'}.png`;
            link.href = dataUrl;
            document.body.appendChild(link); // Append to body to ensure click works in some browsers
            link.click();
            document.body.removeChild(link);
            toast.success("Imagem exportada com sucesso!");
        } catch (e) {
            console.error("Erro exportação PNG:", e);
            toast.error("Erro ao gerar imagem. Verifique o console.");
        }
    };

    const handleExportLupaVertical = async () => {
        const element = document.getElementById("lupa-vertical");
        if (!element) return;
        await exportLupaElement(element, "vertical");
    };

    const handleExportLupaHorizontal = async () => {
        const element = document.getElementById("lupa-horizontal");
        if (!element) return;
        await exportLupaElement(element, "horizontal");
    };

    const exportLupaElement = async (element: HTMLElement, suffix: string) => {
        try {
            const canvas = await html2canvas(element, {
                scale: 4,
                useCORS: true,
                logging: false,
                backgroundColor: null
            } as any);

            const dataUrl = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = `lupa-${suffix}-${title.replace(/\s+/g, '-') || 'anvisa'}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(`Lupa (${suffix}) exportada!`);
        } catch (e) {
            console.error("Erro exportação Lupa:", e);
            toast.error("Erro ao gerar lupa.");
        }
    };

    const handleExportExcel = async () => {
        if (!result) return;
        try {
            const response = await fetch("/api/export/excel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    per100g: result.per100g,
                    perPortion: result.perPortion,
                    portionSize,
                    householdMeasure,
                    popGroup
                })
            });

            if (!response.ok) throw new Error("Falha na exportação");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `tabela-${title.replace(/\s+/g, '-')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success("Planilha Excel gerada com sucesso!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao gerar Excel.");
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Configurações da Receita</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                            <Label>Grupo Populacional</Label>
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
                    <CardHeader>
                        <CardTitle>Ingredientes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <IngredientSelector onSelect={handleAddIngredient} />

                        <div className="space-y-2">
                            {ingredients.map((item, idx) => (
                                <div key={idx} className="flex items-end gap-3 p-3 border rounded-md bg-white">
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
                                                    Açúcar +
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
                                />
                                <div className="flex flex-col items-center gap-4 w-full">
                                    <div className="text-sm font-semibold text-gray-500 w-full text-center border-t pt-4">Modelos de Lupa (ANVISA)</div>

                                    <div className="flex flex-wrap justify-center gap-8 items-start">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-xs text-muted-foreground">Vertical / Empilhado</span>
                                            <MagnifyingGlassLabel
                                                {...checkFOP(result.per100g)}
                                                layout="vertical"
                                                id="lupa-vertical"
                                            />
                                        </div>

                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-xs text-muted-foreground">Horizontal</span>
                                            <MagnifyingGlassLabel
                                                {...checkFOP(result.per100g)}
                                                layout="horizontal"
                                                id="lupa-horizontal"
                                            />
                                        </div>
                                    </div>
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
                                {Object.values(checkFOP(result.per100g)).some(Boolean) && (
                                    <>
                                        <Button variant="outline" onClick={handleExportLupaVertical} className="w-full">
                                            <Download className="mr-2 h-4 w-4" /> Lupa Vertical
                                        </Button>
                                        <Button variant="outline" onClick={handleExportLupaHorizontal} className="w-full">
                                            <Download className="mr-2 h-4 w-4" /> Lupa Horizontal
                                        </Button>
                                    </>
                                )}
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
