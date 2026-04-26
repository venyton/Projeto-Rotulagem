
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

type Ingredient = {
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
    [key: string]: unknown;
}

const MICRONUTRIENTS = [
    { name: "fatMono", label: "Gord. Mono (g)" },
    { name: "fatPoly", label: "Gord. Poli (g)" },
    { name: "omega6", label: "Ômega 6 (g)" },
    { name: "omega3", label: "Ômega 3 (g)" },
    { name: "cholesterol", label: "Colesterol (mg)" },
    { name: "calcium", label: "Cálcio (mg)" },
    { name: "magnesium", label: "Magnésio (mg)" },
    { name: "manganese", label: "Manganês (mg)" },
    { name: "phosphorus", label: "Fósforo (mg)" },
    { name: "iron", label: "Ferro (mg)" },
    // { name: "sodium", label: "Sódio (mg)" }, // Already shown
    { name: "potassium", label: "Potássio (mg)" },
    { name: "copper", label: "Cobre (mcg)" },
    { name: "zinc", label: "Zinco (mg)" },
    { name: "selenium", label: "Selênio (mcg)" },
    { name: "chromium", label: "Cromo (mcg)" },
    { name: "molybdenum", label: "Molibdênio (mcg)" },
    { name: "iodine", label: "Iodo (mcg)" },
    { name: "fluoride", label: "Flúor (mg)" },
    { name: "vitaminA", label: "Vit. A (mcg)" },
    { name: "vitaminD", label: "Vit. D (mcg)" },
    { name: "vitaminE", label: "Vit. E (mg)" },
    { name: "vitaminK", label: "Vit. K (mcg)" },
    { name: "vitaminC", label: "Vit. C (mg)" },
    { name: "thiamin", label: "Tiamina B1 (mg)" },
    { name: "riboflavin", label: "Riboflavina B2 (mg)" },
    { name: "niacin", label: "Niacina B3 (mg)" },
    { name: "vitaminB6", label: "Vit. B6 (mg)" },
    { name: "biotin", label: "Biotina (mcg)" },
    { name: "folicAcid", label: "Ác. Fólico (mcg)" },
    { name: "pantothenicAcid", label: "Ác. Pantot. B5 (mg)" },
    { name: "vitaminB12", label: "Vit. B12 (mcg)" },
    { name: "choline", label: "Colina (mg)" },
];

export function InspectIngredientDialog({ ingredient }: { ingredient: Ingredient }) {
    // Check if ingredient has any micronutrients (values > 0)
    const hasMicros = MICRONUTRIENTS.some((m) => Number(ingredient[m.name] ?? 0) > 0);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Inspecionar">
                    <Search className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{ingredient.name.replace(/^\[Meu\]\s*/, '')}</DialogTitle>
                    <DialogDescription>Detalhes nutricionais (por 100g)</DialogDescription>
                </DialogHeader>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                    <div className="flex flex-col rounded-lg border border-border/70 bg-muted/[0.22] p-2">
                        <span className="text-muted-foreground text-xs">Energia</span>
                        <span className="font-semibold">{ingredient.energy} kcal</span>
                    </div>
                    <div className="flex flex-col rounded-lg border border-border/70 bg-muted/[0.22] p-2">
                        <span className="text-muted-foreground text-xs">Carboidratos</span>
                        <span className="font-semibold">{ingredient.carbs} g</span>
                    </div>
                    <div className="flex flex-col rounded-lg border border-border/70 bg-muted/[0.22] p-2">
                        <span className="text-muted-foreground text-xs">Açúcares Totais</span>
                        <span className="font-semibold">{ingredient.sugarTotal || 0} g</span>
                    </div>
                    <div className="flex flex-col rounded-lg border border-primary/25 bg-primary/10 p-2">
                        <span className="text-xs font-medium text-primary">Açúcares Adicionados</span>
                        <span className="font-bold text-primary">{ingredient.sugarAdded || 0} g</span>
                    </div>
                    <div className="flex flex-col rounded-lg border border-border/70 bg-muted/[0.22] p-2">
                        <span className="text-muted-foreground text-xs">Proteínas</span>
                        <span className="font-semibold">{ingredient.protein} g</span>
                    </div>
                    <div className="flex flex-col rounded-lg border border-border/70 bg-muted/[0.22] p-2">
                        <span className="text-muted-foreground text-xs">Gorduras Totais</span>
                        <span className="font-semibold">{ingredient.fatTotal} g</span>
                    </div>
                    <div className="flex flex-col rounded-lg border border-border/70 bg-muted/[0.22] p-2">
                        <span className="text-muted-foreground text-xs">Gorduras Saturadas</span>
                        <span className="font-semibold">{ingredient.fatSat} g</span>
                    </div>
                    <div className="flex flex-col rounded-lg border border-border/70 bg-muted/[0.22] p-2">
                        <span className="text-muted-foreground text-xs">Gorduras Trans</span>
                        <span className="font-semibold">{ingredient.fatTrans} g</span>
                    </div>
                    <div className="flex flex-col rounded-lg border border-border/70 bg-muted/[0.22] p-2">
                        <span className="text-muted-foreground text-xs">Fibra Alimentar</span>
                        <span className="font-semibold">{ingredient.fiber} g</span>
                    </div>
                    <div className="flex flex-col rounded-lg border border-border/70 bg-muted/[0.22] p-2">
                        <span className="text-muted-foreground text-xs">Sódio</span>
                        <span className="font-semibold">{ingredient.sodium} mg</span>
                    </div>
                </div>

                {hasMicros && (
                    <div className="mt-6 border-t border-border/70 pt-4">
                        <h4 className="font-medium mb-3 text-sm">Micronutrientes e Outros</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            {MICRONUTRIENTS.map(m => {
                                const val = Number(ingredient[m.name] ?? 0);
                                if (val <= 0) return null;
                                return (
                                    <div key={m.name} className="flex flex-col rounded-lg border border-border/70 bg-muted/[0.22] p-2">
                                        <span className="text-muted-foreground mb-1">{m.label}</span>
                                        <span className="font-medium">{val}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
